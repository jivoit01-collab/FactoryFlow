/**
 * Which warehouse a bill ships from.
 *
 * SAP hands the codes over one per LINE — the bills feed builds the field with
 * `STRING_AGG(INV1.WhsCode, ', ')` — so a bill of nine lines picked out of one
 * store arrives as that store's code nine times. Left as it comes, a
 * warehouse-wise view would have as many distinct "warehouses" as there are
 * line counts.
 *
 * So the codes are de-duplicated and sorted, which settles two things at once:
 * "BH-FG, BH-FG" and "BH-FG" are one warehouse, and "BH-BT, BH-FG" and
 * "BH-FG, BH-BT" are one pair rather than two.
 *
 * A BILL THAT SPANS TWO WAREHOUSES GETS ITS OWN COMPOUND NAME, and that is the
 * point rather than a compromise. Counting it under each store separately would
 * add its tonnes twice and make a breakdown that no longer adds up to the
 * figure it sits under — the one thing a drill-down must never do. Splitting it
 * properly is not possible either: the feed carries a weight for the bill, not
 * per line. Naming the pair keeps the arithmetic exact and the exception
 * visible. It is rare in any case: 1,306 of the 1,308 bills raised in the sixty
 * days to 14 September 2026 drew on a single warehouse, and two drew on a pair.
 *
 * A bill with no code at all is named, never dropped. It is still freight
 * waiting to go, and an entry that silently disappears is tonnage the strip
 * stops accounting for.
 */
export function billWarehouse(raw: string | null | undefined): string {
  const codes = [
    ...new Set(
      (raw ?? '')
        .split(',')
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  ].sort();

  if (codes.length === 0) return 'No warehouse';
  return codes.join(' + ');
}
