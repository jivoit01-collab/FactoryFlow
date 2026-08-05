/**
 * Litres derived from a SKU name.
 *
 * Production is recorded in CASES — no litres-per-case factor is stored in the
 * app or the backend, so we derive it from the SKU name, which carries both the
 * unit volume and the pack size:
 *
 *   "MUSTARD KACHI GHANI 1 LTR 20 PCS"  ->  1 L/pc x 20 pc  =  20 L / case
 *   "COLD PRESS SUNFLOWER 5 LTR"        ->  5 L/pc x  1 pc  =   5 L / case
 *   "PET BOTTLE 1000 ML"                ->  1 L/pc x  1 pc  =   1 L / case
 *
 * This mirrors what the backend already does in two places: the pack-size regex
 * in `reconciliation_service._units_per_case` (which converts SAP pieces to
 * cases) and the per-piece volume parse in
 * `dispatch_plans.hana_reader._line_total_litres_expr`.
 *
 * Known limits — why this returns `null`, never 0, when it can't tell:
 *  - weight-based SKUs ("SOYABEAN OIL 12 KGS (B)", "750 GMS 12 PCS POUCH")
 *    carry no volume in the name at all;
 *  - combo SKUs ("COLD PRESS 5 LTR + EXTRA LIGHT OLIVE 1 LTR 4 PCS") only get
 *    their first volume read.
 * SAP's OITM UDFs (U_UNE_TOTL / U_IsLitre) are the authoritative source — move
 * to those via the backend if these approximations start to matter.
 */

/** Per-piece volume: "1 LTR" / "5 LITRES" / "250 ML" / "1000ML". ML tried first so it wins over a bare "L". */
const VOLUME_RE = /(\d+(?:\.\d+)?)\s*(ML|LTRS?|LITRES?|LITERS?|L)\b/i;

/** Pack size: "20 PCS" / "4 PC". Same shape as the backend's `_PCS_RE`. */
const PACK_RE = /(\d+)\s*PCS?\b/i;

/** Litres in one case of this SKU, or `null` when the name carries no volume. */
export function litresPerCase(...names: (string | null | undefined)[]): number | null {
  const name = names.find((n) => n && VOLUME_RE.test(n));
  if (!name) return null;

  const volume = VOLUME_RE.exec(name);
  if (!volume) return null;
  const perPiece = /^ML$/i.test(volume[2]) ? Number(volume[1]) / 1000 : Number(volume[1]);
  if (!perPiece || !Number.isFinite(perPiece)) return null;

  const pack = PACK_RE.exec(name);
  const piecesPerCase = pack ? Number(pack[1]) || 1 : 1;
  return perPiece * piecesPerCase;
}

/** Litres for a case quantity, or `null` when the SKU has no parseable volume. */
export function litresOf(cases: number, ...names: (string | null | undefined)[]): number | null {
  const perCase = litresPerCase(...names);
  return perCase == null ? null : perCase * (cases || 0);
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
      ? ` ${unknown} SKU${unknown === 1 ? '' : 's'} carr${unknown === 1 ? 'ies' : 'y'} no volume in ` +
        'its name (weight-based packs) and is excluded from the litre totals.'
      : '';
  return (
    'Litres are derived from the SKU name — unit volume × pack size ' +
    '(e.g. "1 LTR 20 PCS" → 20 L per case).' +
    caveat
  );
}
