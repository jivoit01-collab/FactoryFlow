import type { ReactNode } from 'react';

import { confirmDialog } from './ConfirmDialog';

/**
 * The confirmation every button that writes to SAP goes through.
 *
 * It is the GRPO posting dialog's shape, reused: a title that names the action,
 * one line telling the operator to check what follows, then the posting's own
 * facts as label/value rows — the vendor, the warehouse, the date, the counts.
 * Reading the rows is the check. A document about to land in a system this app
 * cannot edit deserves a moment's attention, and showing what is being posted
 * earns that better than a paragraph saying so.
 *
 *   const ok = await confirmSapPost({
 *     title: 'Post this purchase order to SAP?',
 *     details: [
 *       { label: 'Vendor', value: order.vendor_name },
 *       { label: 'Lines', value: order.line_count },
 *       order.currency && { label: 'Value', value: `${order.total_value} ${order.currency}` },
 *     ],
 *   });
 *
 * Falsy entries in `details` drop out, so a row that only sometimes applies can
 * be written inline with the rest.
 */

export interface SapPostDetail {
  label: ReactNode;
  value: ReactNode;
}

export interface SapPostConfirmOptions {
  /** What the button is about to do, in the operator's words. */
  title: string;
  /** The posting's facts. Falsy entries are skipped. */
  details?: ReadonlyArray<SapPostDetail | false | null | undefined>;
  /** Replaces the standard "Review the details below" line. */
  description?: ReactNode;
  confirmLabel?: string;
  /** For a posting that removes or reverses something in SAP. */
  destructive?: boolean;
}

/** Ask before writing to SAP. Resolves `true` only on an explicit confirm. */
export function confirmSapPost({
  title,
  details,
  description = 'Review the details below before posting to SAP.',
  confirmLabel = 'Confirm Post',
  destructive,
}: SapPostConfirmOptions): Promise<boolean> {
  const rows = (details ?? []).filter(Boolean) as SapPostDetail[];

  return confirmDialog({
    title,
    description,
    body: rows.length > 0 && (
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="text-sm">
            <span className="text-muted-foreground">{row.label}:</span>{' '}
            <span className="font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    ),
    confirmLabel,
    destructive,
  });
}
