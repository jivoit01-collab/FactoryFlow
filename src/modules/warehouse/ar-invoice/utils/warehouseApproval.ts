import type { ARInvoicePosting } from '../types';

/**
 * The warehouses on a bill that its raiser does not manage — the ones whose
 * manager has to approve it before it is created in SAP.
 *
 * `manages` is `useWarehouseScope().manages`, which answers yes while the scope
 * is unknown, so this never warns about an approval the backend won't ask for.
 */
export function warehousesNeedingApproval(
  warehouseCodes: (string | null | undefined)[],
  manages: (code?: string | null) => boolean,
): string[] {
  const codes = new Set<string>();
  for (const code of warehouseCodes) {
    const clean = (code ?? '').trim().toUpperCase();
    if (clean && !manages(clean)) codes.add(clean);
  }
  return [...codes].sort();
}

/**
 * What to tell the raiser when their bill is held: who has to approve it, and
 * that nothing is in SAP until they do.
 */
export function heldForApprovalMessage(posting: ARInvoicePosting): string {
  const waiting = posting.warehouse_approvals.filter((a) => a.status === 'PENDING');
  const who = waiting
    .map((a) =>
      a.approvers.length > 0
        ? `${a.warehouse_code} (${a.approvers.join(', ')})`
        : `${a.warehouse_code} (no manager who can approve is set — ask an administrator)`,
    )
    .join(' and ');
  return (
    `Sent for approval to the manager of ${who || 'the warehouse'}. ` +
    'The bill is created in SAP as soon as they approve it on the Invoice Approval page.'
  );
}
