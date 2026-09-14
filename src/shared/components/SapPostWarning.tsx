import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

import { confirmDialog } from './ConfirmDialog';

/**
 * The one warning every button that writes to SAP carries.
 *
 * A posting to SAP is not like the rest of the app: the document lands in a
 * system this app cannot edit, most of them cannot be deleted at all, and
 * several of the fields involved are write-once (see the dispatch stamp). The
 * operator should know which document is about to exist and that undoing it is
 * a job for SAP, not for a back button.
 *
 * Two shapes, same words:
 *
 * - `confirmSapPost(...)` for a button that posts straight away — it puts the
 *   warning in front of the action and resolves false if the user backs out.
 * - `<SapPostWarning />` for a button that already opens a review dialog — the
 *   warning goes inside that dialog rather than stacking a second one on top.
 *
 * `creates` names the document in SAP's own terms ("a Goods Receipt PO against
 * PO 4500123"), because "post to SAP" on its own does not tell an operator what
 * they are about to be responsible for.
 */

export interface SapPostWarningProps {
  /** The SAP document this will produce, named as SAP names it. */
  creates: ReactNode;
  /** Anything specific to this posting worth reading first. */
  detail?: ReactNode;
}

/**
 * Rendered inside `DialogDescription` (a `<p>`), so every element here is inline
 * or a `span` — a `div` in that position is invalid HTML and React says so.
 */
export function SapPostWarning({ creates, detail }: SapPostWarningProps) {
  return (
    <span className="block space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-left text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
      <span className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        This writes to SAP
      </span>
      <span className="block text-xs">
        It creates {creates}. Once SAP accepts it, it cannot be undone from this app —
        a mistake has to be corrected in SAP itself.
      </span>
      {detail && <span className="block text-xs font-medium">{detail}</span>}
    </span>
  );
}

export interface SapPostConfirmOptions extends SapPostWarningProps {
  /** What the button is about to do, in the operator's words. */
  title: string;
  confirmLabel?: string;
  /** For a posting that removes or reverses something in SAP. */
  destructive?: boolean;
}

/** Ask before writing to SAP. Resolves `true` only on an explicit confirm. */
export function confirmSapPost({
  title,
  creates,
  detail,
  confirmLabel = 'Post to SAP',
  destructive,
}: SapPostConfirmOptions): Promise<boolean> {
  return confirmDialog({
    title,
    description: <SapPostWarning creates={creates} detail={detail} />,
    confirmLabel,
    cancelLabel: 'Not yet',
    destructive,
  });
}
