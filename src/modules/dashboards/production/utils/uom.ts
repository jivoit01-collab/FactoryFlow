/**
 * What a reconciled quantity is counted in.
 *
 * SAP states an inventory UOM per item, and the material warehouse does not
 * deal in one of them. On a month of BH-PC transfers: 326 items in PCS, 17 in
 * LTR (the oil — around a quarter of all the quantity that moves), 3 in MTR
 * (tape and film) and 7 in KGS. So the unit belongs to the ROW, and a panel may
 * only put one at the top of a column when every row it is showing agrees.
 *
 * Labels are lower-cased SAP's own words — "pcs", "ltr", "mtr", "kgs" — so the
 * wall never has to translate. "ltr" also keeps litres clear of the short
 * scale's lakh "L": "3.3 L ltr" is three-and-a-third lakh litres, and "3.3 L
 * pcs" three-and-a-third lakh pieces. An unstated UOM reads "unit" rather than
 * guessing "pcs", because guessing turns three lakh litres of oil into three
 * lakh bottles.
 */

/** What a quantity is called when SAP states no UOM for it. */
export const UNKNOWN_UNIT = 'unit';

/** SAP's UOM as a wall label: "PCS" → "pcs". Falls back when SAP states none. */
export function unitLabel(uom: string | null | undefined, fallback = UNKNOWN_UNIT): string {
  const stated = (uom ?? '').trim();
  return stated ? stated.toLowerCase() : fallback;
}

/**
 * The one unit a list is counted in, or the fallback when it mixes.
 *
 * A column total across mixed units is a scale rather than a measure — adding
 * litres of oil to pieces of label — so it must not be captioned with either
 * one. Naming it "unit" is the honest reading, and the rows underneath then
 * carry their own.
 */
export function sharedUnit(
  rows: readonly { uom?: string | null }[],
  fallback = UNKNOWN_UNIT,
): string {
  let found: string | null = null;
  for (const row of rows) {
    const stated = (row.uom ?? '').trim().toLowerCase();
    // A row SAP holds no UOM for cannot vouch for the rest of the list.
    if (!stated) return fallback;
    if (found == null) found = stated;
    else if (found !== stated) return fallback;
  }
  return found ?? fallback;
}
