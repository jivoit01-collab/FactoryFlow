/**
 * The browser's half of "one SAP write per request" (spec D16, §3.4).
 *
 * `post/` freezes the bunch and sends ONE document; `send-next/` sends the
 * next one. The page keeps calling `send-next/` until there is nothing left
 * it should send, and the worker (`run_sap_postings`) picks up whatever the
 * browser leaves behind. The rules:
 *
 *   - `rejected`: SAP refused that document. Its posting id joins the skip
 *     list, so the next call moves on to the next document instead of
 *     re-sending the refused one, and the loop continues.
 *   - `posted`: continue.
 *   - `waiting` (SAP or HANA not answering) or `in_progress` (somebody else
 *     is sending it): stop -- the worker retries with back-off.
 *   - `sent == null`: nothing left that may be sent now. Done.
 *   - At most 250 calls, so a bug can never spin forever.
 *   - The Stop button (`shouldStop`) ends the loop between calls; the call
 *     already on its way finishes.
 *   - An HTTP error (BUNCH_CHANGED, a timeout, ...) stops it and is returned.
 *
 * Pure apart from the `sendNext` it is handed, so it is unit tested without
 * a server.
 */
import type { SendNextPayload, SendResult, SentUnit } from '../types';

export const SEND_LOOP_CAP = 250;

export type SendLoopStopReason = 'done' | 'waiting' | 'in_progress' | 'cap' | 'stopped' | 'error';

export interface SendLoopProgress {
  /** The call about to be made, from 1. */
  current: number;
  /** Best estimate of the whole run: calls made + what the server says remains. */
  total: number;
  /** `Posting 3 of 12`. */
  text: string;
  /** What the last call did, if anything. */
  last?: SentUnit | null;
}

export interface SendLoopResult {
  reason: SendLoopStopReason;
  /** Calls that sent something (any outcome). */
  calls: number;
  posted: SentUnit[];
  rejected: SentUnit[];
  /** The posting ids skipped because SAP refused them in this run. */
  skipped: number[];
  /** The last answer, whose `plan` is the freshest the page has. */
  last: SendResult | null;
  /** The unit that stopped the loop (`waiting` / `in_progress`). */
  stoppedAt?: SentUnit;
  error?: unknown;
}

export interface SendLoopOptions {
  /** One `send-next/` call. */
  sendNext: (payload: Required<SendNextPayload>) => Promise<SendResult>;
  /** Retry also re-sends FAILED units and re-checks IN_APPROVAL ones. */
  includeFailed?: boolean;
  /** The answer of the `post/` that started the run: counted as call 1. */
  first?: SendResult | null;
  shouldStop?: () => boolean;
  onProgress?: (progress: SendLoopProgress) => void;
  /** Called with every answer, so the page can show the newest plan as it goes. */
  onResult?: (result: SendResult) => void;
  cap?: number;
}

export function progressText(current: number, total: number): string {
  return `Posting ${current} of ${Math.max(current, total)}`;
}

/**
 * Run the loop. Never throws: an HTTP error ends it with `reason: 'error'`.
 */
export async function runSendLoop(options: SendLoopOptions): Promise<SendLoopResult> {
  const {
    sendNext,
    includeFailed = false,
    first = null,
    shouldStop,
    onProgress,
    onResult,
    cap = SEND_LOOP_CAP,
  } = options;

  const skip: number[] = [];
  const result: SendLoopResult = {
    reason: 'done',
    calls: 0,
    posted: [],
    rejected: [],
    skipped: skip,
    last: null,
  };

  /** Read one answer. Returns true when the loop should go on. */
  const take = (answer: SendResult): boolean => {
    result.last = answer;
    onResult?.(answer);
    const sent = answer.sent;
    if (sent == null) {
      result.reason = 'done';
      return false;
    }
    result.calls += 1;
    const outcome = String(sent.outcome ?? '').toLowerCase();
    if (outcome === 'rejected') {
      result.rejected.push(sent);
      if (sent.sap_posting_id != null && !skip.includes(sent.sap_posting_id)) {
        skip.push(sent.sap_posting_id);
      }
      return true;
    }
    if (outcome === 'waiting' || outcome === 'in_progress') {
      result.reason = outcome;
      result.stoppedAt = sent;
      return false;
    }
    result.posted.push(sent);
    return true;
  };

  const report = (last: SentUnit | null | undefined) => {
    const current = result.calls + 1;
    const remaining = result.last?.remaining ?? 0;
    const total = result.calls + Math.max(remaining, 1);
    onProgress?.({ current, total, text: progressText(current, total), last });
  };

  let iterations = 0;
  if (first) {
    iterations += 1;
    if (!take(first)) return result;
  }

  for (;;) {
    if (iterations >= cap) {
      result.reason = 'cap';
      return result;
    }
    if (shouldStop?.()) {
      result.reason = 'stopped';
      return result;
    }
    report(result.last?.sent);
    iterations += 1;
    const answer: SendResult | null = await sendNext({
      include_failed: includeFailed,
      skip_posting_ids: [...skip],
    }).catch((error: unknown) => {
      result.reason = 'error';
      result.error = error;
      return null;
    });
    if (answer === null) return result;
    if (!take(answer)) return result;
  }
}

/** One line for the toast once the loop ends. */
export function describeSendLoop(result: SendLoopResult): string {
  const posted = result.posted.length;
  const refused = result.rejected.length;
  const head =
    posted === 0 && refused === 0
      ? 'Nothing was sent.'
      : `${posted} sent${refused ? `, ${refused} refused by SAP` : ''}.`;
  switch (result.reason) {
    case 'waiting':
      return `${head} SAP is not answering; the rest waits in the queue and goes by itself.`;
    case 'in_progress':
      return `${head} A document is being sent elsewhere right now; the rest goes by itself.`;
    case 'cap':
      return `${head} Stopped after ${SEND_LOOP_CAP} documents; press Post again to carry on.`;
    case 'stopped':
      return `${head} Stopped on request; anything queued still goes with the worker unless you press "Stop sending".`;
    case 'error':
      return `${head} Stopped by an error.`;
    default:
      return head;
  }
}
