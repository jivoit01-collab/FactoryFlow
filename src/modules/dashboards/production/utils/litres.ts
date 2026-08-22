/**
 * Litre formatting for the production dashboards.
 *
 * The NUMBERS come from the backend, which reads them off the SAP item master:
 * `OITM.SalPackUn` is the litres in one piece and `OITM.SalFactor2` the pieces
 * in a case, so litres = cases × SalFactor2 × SalPackUn. The cost report sends
 * `litres` per run; the reconciliation sends `litres_per_case` per SKU.
 *
 * This file used to derive litres from the SKU name, and the name lies: a
 * "MUSTARD 1 LTR + 1 LTR COMBO 10 SET" piece holds two litres, not one; a CSD
 * "1 LTR 16 PCS" carton bills as one sixteen-litre unit; and weight-packed oil
 * ("700 GMS POUCH", "13 KGS") carries no volume in its name at all and read as
 * a blank. Never parse a name for volume — ask SAP.
 *
 * A missing volume stays `null`, never 0, so a SKU SAP holds no volume for
 * reads as "—" instead of dragging a litre total down.
 */

/** Litres for a case quantity, given the SKU's litres per case from the API. */
export function litresOf(
  cases: number | null | undefined,
  litresPerCase: number | null | undefined,
): number | null {
  if (litresPerCase == null) return null;
  return litresPerCase * (cases || 0);
}

/** "2,400 L" — em dash for an unknown volume, so it can't be read as zero output. */
export function formatLitres(value: number | null | undefined): string {
  if (value == null) return '—';
  const n = value || 0;
  const abs = Math.abs(n);
  const decimals = abs > 0 && abs < 100 && !Number.isInteger(n) ? 1 : 0;
  return `${n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} L`;
}

/** Same, with an explicit "+" so a positive difference reads as a surplus. */
export function formatLitresSigned(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${formatLitres(value)}`;
}

/** Footnote explaining where the litres came from, and what got left out. */
export function litresNote(unknown: number): string {
  const caveat =
    unknown > 0
      ? ` ${unknown} SKU${unknown === 1 ? '' : 's'} ${unknown === 1 ? 'has' : 'have'} no volume ` +
        'in the SAP item master and is excluded from the litre totals.'
      : '';
  return (
    'Litres come from the SAP item master — litres per piece (SalPackUn) × ' +
    'pieces per case (SalFactor2), never from the SKU name.' +
    caveat
  );
}
