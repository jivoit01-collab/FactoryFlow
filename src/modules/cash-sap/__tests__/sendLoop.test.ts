import { describe, expect, it, vi } from 'vitest';

import type { BunchSapPlan, SendResult, SentUnit } from '../types';
import { describeSendLoop, progressText, runSendLoop, SEND_LOOP_CAP } from '../utils/sendLoop';

const PLAN = { groups: [] } as unknown as BunchSapPlan;

function sent(outcome: string, postingId: number, label = 'Voucher GRPO'): SentUnit {
  return {
    kind: 'cash_sap.grpo',
    source_id: postingId,
    label,
    outcome,
    message: outcome === 'rejected' ? 'SAP said no' : '',
    sap_posting_id: postingId,
  };
}

function answer(unit: SentUnit | null, remaining: number): SendResult {
  return { sent: unit, remaining, plan: PLAN };
}

describe('runSendLoop', () => {
  it('keeps sending until nothing is left', async () => {
    const sendNext = vi
      .fn()
      .mockResolvedValueOnce(answer(sent('posted', 2), 1))
      .mockResolvedValueOnce(answer(sent('posted', 3), 0))
      .mockResolvedValueOnce(answer(null, 0));

    const result = await runSendLoop({ first: answer(sent('posted', 1), 2), sendNext });

    expect(result.reason).toBe('done');
    expect(result.posted.map((u) => u.sap_posting_id)).toEqual([1, 2, 3]);
    expect(sendNext).toHaveBeenCalledTimes(3);
  });

  it('skips a refused document and goes on, sending its posting id in the skip list', async () => {
    const sendNext = vi
      .fn()
      .mockResolvedValueOnce(answer(sent('rejected', 7), 2))
      .mockResolvedValueOnce(answer(sent('posted', 8), 1))
      .mockResolvedValueOnce(answer(null, 1));

    const result = await runSendLoop({ sendNext });

    expect(result.reason).toBe('done');
    expect(result.rejected.map((u) => u.sap_posting_id)).toEqual([7]);
    expect(sendNext.mock.calls[0][0]).toEqual({ include_failed: false, skip_posting_ids: [] });
    expect(sendNext.mock.calls[1][0]).toEqual({ include_failed: false, skip_posting_ids: [7] });
    expect(sendNext.mock.calls[2][0]).toEqual({ include_failed: false, skip_posting_ids: [7] });
  });

  it('stops when SAP is not answering', async () => {
    const sendNext = vi
      .fn()
      .mockResolvedValueOnce(answer(sent('waiting', 4), 5))
      .mockResolvedValue(answer(sent('posted', 5), 4));

    const result = await runSendLoop({ sendNext });

    expect(result.reason).toBe('waiting');
    expect(result.stoppedAt?.sap_posting_id).toBe(4);
    expect(sendNext).toHaveBeenCalledTimes(1);
  });

  it('stops when the document is being sent elsewhere', async () => {
    const sendNext = vi.fn().mockResolvedValueOnce(answer(sent('in_progress', 4), 5));
    const result = await runSendLoop({ sendNext });
    expect(result.reason).toBe('in_progress');
  });

  it('stops at once when the post itself sent nothing or had to wait', async () => {
    const sendNext = vi.fn();
    expect((await runSendLoop({ first: answer(null, 0), sendNext })).reason).toBe('done');
    expect((await runSendLoop({ first: answer(sent('waiting', 1), 3), sendNext })).reason).toBe(
      'waiting',
    );
    expect(sendNext).not.toHaveBeenCalled();
  });

  it('never makes more than 250 calls', async () => {
    let id = 0;
    const sendNext = vi.fn().mockImplementation(async () => answer(sent('posted', ++id), 1000));

    const result = await runSendLoop({ sendNext });

    expect(result.reason).toBe('cap');
    expect(sendNext).toHaveBeenCalledTimes(SEND_LOOP_CAP);
  });

  it('counts the post as the first of the 250', async () => {
    const sendNext = vi.fn().mockResolvedValue(answer(sent('rejected', 1), 1000));
    const result = await runSendLoop({ first: answer(sent('posted', 0), 1000), sendNext, cap: 5 });
    expect(result.reason).toBe('cap');
    expect(sendNext).toHaveBeenCalledTimes(4);
  });

  it('passes include_failed through for Retry', async () => {
    const sendNext = vi.fn().mockResolvedValueOnce(answer(null, 0));
    await runSendLoop({ sendNext, includeFailed: true });
    expect(sendNext.mock.calls[0][0]).toEqual({ include_failed: true, skip_posting_ids: [] });
  });

  it('honours Stop between calls', async () => {
    let stop = false;
    const sendNext = vi.fn().mockImplementation(async () => {
      stop = true;
      return answer(sent('posted', 1), 3);
    });
    const result = await runSendLoop({ sendNext, shouldStop: () => stop });
    expect(result.reason).toBe('stopped');
    expect(sendNext).toHaveBeenCalledTimes(1);
  });

  it('returns an HTTP error instead of throwing', async () => {
    const failure = { response: { data: { code: 'BUNCH_CHANGED', detail: 'Bunch 7 changed' } } };
    const sendNext = vi.fn().mockRejectedValueOnce(failure);
    const result = await runSendLoop({ sendNext });
    expect(result.reason).toBe('error');
    expect(result.error).toBe(failure);
  });

  it('reports progress as "Posting n of N"', async () => {
    const seen: string[] = [];
    const sendNext = vi
      .fn()
      .mockResolvedValueOnce(answer(sent('posted', 2), 1))
      .mockResolvedValueOnce(answer(sent('posted', 3), 0))
      .mockResolvedValueOnce(answer(null, 0));
    await runSendLoop({
      first: answer(sent('posted', 1), 2),
      sendNext,
      onProgress: (p) => seen.push(p.text),
    });
    expect(seen).toEqual(['Posting 2 of 3', 'Posting 3 of 3', 'Posting 4 of 4']);
  });

  it('hands every answer to the page so the newest plan shows', async () => {
    const onResult = vi.fn();
    const sendNext = vi.fn().mockResolvedValueOnce(answer(null, 0));
    await runSendLoop({ first: answer(sent('posted', 1), 1), sendNext, onResult });
    expect(onResult).toHaveBeenCalledTimes(2);
  });
});

describe('progress and summary text', () => {
  it('never shows a total below the current call', () => {
    expect(progressText(3, 2)).toBe('Posting 3 of 3');
    expect(progressText(1, 12)).toBe('Posting 1 of 12');
  });

  it('says what happened and why it stopped', () => {
    expect(
      describeSendLoop({
        reason: 'waiting',
        calls: 2,
        posted: [sent('posted', 1)],
        rejected: [sent('rejected', 2)],
        skipped: [2],
        last: null,
      }),
    ).toMatch(/^1 sent, 1 refused by SAP\. SAP is not answering/);
  });
});
