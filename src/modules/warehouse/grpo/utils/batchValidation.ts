import type { GRPOBatchInput } from '../types';

// Batch quantities are captured to three decimals, same as the line quantity,
// so the splits are allowed to miss the total by one rounding crumb.
const QTY_TOLERANCE = 0.001;

const totalOf = (batches: GRPOBatchInput[]): number =>
  batches.reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0);

/** Do these batches account for exactly the quantity being received? */
export const batchesCoverQty = (batches: GRPOBatchInput[], acceptedQty: number): boolean =>
  Math.abs(totalOf(batches) - acceptedQty) <= QTY_TOLERANCE;

/**
 * The first thing wrong with these batches, or null when they are postable.
 *
 * Mirrors the server's own check (grpo/services.py `_build_line_batch_numbers`)
 * so a batch-managed line is caught on the screen rather than by SAP's -4014,
 * which rejects the whole receipt and names neither the item nor the reason.
 */
export const validateBatches = (
  batches: GRPOBatchInput[],
  acceptedQty: number,
): string | null => {
  if (batches.length === 0) return 'Enter the batch (lot) number received.';
  if (batches.some((batch) => !batch.batch_number.trim())) {
    return 'Every batch row needs a batch number.';
  }
  if (batches.some((batch) => !(Number(batch.quantity) > 0))) {
    return 'Every batch needs a quantity greater than zero.';
  }
  const numbers = batches.map((batch) => batch.batch_number.trim().toLowerCase());
  if (new Set(numbers).size !== numbers.length) {
    return 'The same batch is entered twice — put the whole quantity on one row.';
  }
  if (!batchesCoverQty(batches, acceptedQty)) {
    return `Batches add up to ${totalOf(batches)}, but the accepted quantity is ${acceptedQty}.`;
  }
  return null;
};
