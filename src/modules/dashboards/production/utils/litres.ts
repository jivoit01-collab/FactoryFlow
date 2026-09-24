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
 * The SUFFIX is "ltr", not "L". The wall's short scale abbreviates lakh as
 * "L" (`compact()`), and this board draws both a few pixels apart: a Material
 * row reading "3.3 L" is three-and-a-third lakh pieces, while the volume beside
 * it is litres. Spelling litres "ltr" leaves "L" meaning lakh everywhere.
 *
 * A missing volume stays `null`, never 0, so a SKU SAP holds no volume for
 * reads as "—" instead of dragging a litre total down.
 */

import { compact } from '../../dispatch/utils/format';

/** Litres for a case quantity, given the SKU's litres per case from the API. */
export function litresOf(
  cases: number | null | undefined,
  litresPerCase: number | null | undefined,
): number | null {
  if (litresPerCase == null) return null;
  return litresPerCase * (cases || 0);
}

/** "2,400 ltr" — em dash for an unknown volume, so it can't be read as zero output. */
export function formatLitres(value: number | null | undefined): string {
  if (value == null) return '—';
  const n = value || 0;
  const abs = Math.abs(n);
  const decimals = abs > 0 && abs < 100 && !Number.isInteger(n) ? 1 : 0;
  return `${n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ltr`;
}

/**
 * "1.3 L ltr" — short-scaled for a headline tile. Every digit of "1,29,780 ltr"
 * does not fit a sixth of the wall and gets cut to "1,29,780 …", so the tile
 * carries this and puts the exact figure on the line beneath it. The "L" is
 * lakh, as it is everywhere else on the board.
 */
export function formatLitresCompact(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${compact(value || 0)} ltr`;
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
