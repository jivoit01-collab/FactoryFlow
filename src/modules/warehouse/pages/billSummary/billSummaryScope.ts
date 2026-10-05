/**
 * Whether a sheet is this user's to approve or send back.
 *
 * A sheet is for the managers of a godown on it — either godown, on the rare
 * bill that spans two — and one with no godown named is for any godown manager.
 * Mirrors `BillSummaryService.manages` on the server, which is what actually
 * refuses; this only decides what a screen shows and counts.
 *
 * Kept out of the pages so fast refresh keeps working, and so the list and the
 * sheet answer the question the same way.
 */

import type { useWarehouseScope } from '../../api';

type WarehouseScope = Pick<ReturnType<typeof useWarehouseScope>, 'manages' | 'managesNothing'>;

export function decidesSheet(
  scope: WarehouseScope,
  warehouseCodes: string | null | undefined,
): boolean {
  const godowns = (warehouseCodes ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);
  if (godowns.length === 0) return !scope.managesNothing;
  return godowns.some((code) => scope.manages(code));
}
