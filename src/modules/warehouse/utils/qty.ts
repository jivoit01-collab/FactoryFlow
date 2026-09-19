/**
 * Quantities are stored to three decimals.
 *
 * Floor rather than round, so a figure derived from a godown's stock can never
 * land above the stock it came from. The epsilon is for the scaling itself:
 * `523.454 * 1000` is `523453.99999999994` in binary floating point, and
 * flooring that would quietly shave a thousandth off every third quantity.
 */
export const QTY_DECIMALS = 3;

export function toStorableQty(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const factor = 10 ** QTY_DECIMALS;
  return Math.floor(value * factor + 1e-6) / factor;
}

export function formatQty(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: QTY_DECIMALS,
  });
}
