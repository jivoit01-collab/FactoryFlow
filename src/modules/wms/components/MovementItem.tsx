/**
 * One movement in a location's audit trail — compact, reused by the map detail
 * panel (last few) and the full paginated history page.
 *
 * Relative to `thisLocationId`, each entry reads as In (stock arrived here) or
 * Out (left here); the counterpart location's code is shown when resolvable via
 * `codeById`.
 */
import { Badge } from '@/shared/components/ui';

import type { MovementLogEntry, WmsId } from '../types';

/** ISO datetime → "YYYY-MM-DD HH:MM". */
function formatWhen(iso: string): string {
  if (!iso) return '';
  return iso.length >= 16 ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso.slice(0, 10);
}

interface MovementItemProps {
  entry: MovementLogEntry;
  /** The cell whose trail this is — drives the In/Out direction. */
  thisLocationId?: WmsId;
  /** Location id → code, to name the counterpart location. */
  codeById?: Map<string, string>;
}

export function MovementItem({ entry, thisLocationId, codeById }: MovementItemProps) {
  const isIn = thisLocationId != null && entry.toLocationId === thisLocationId;
  const isOut = thisLocationId != null && entry.fromLocationId === thisLocationId;
  const counterpartId = isIn ? entry.fromLocationId : entry.toLocationId;
  const counterpartCode = counterpartId ? codeById?.get(counterpartId) : null;
  const item = entry.itemName || entry.itemCode || (entry.palletId ? 'Pallet' : '—');

  return (
    <div className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {entry.type}
          </Badge>
          <span className="truncate">{item}</span>
          {entry.discrepancy ? (
            <span className="text-amber-600" title="Discrepancy">
              Δ
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {entry.quantity ? <span>{entry.quantity}</span> : null}
          {entry.boxCount ? (
            <span>
              {entry.boxCount} box{entry.boxCount === 1 ? '' : 'es'}
            </span>
          ) : null}
          {isIn || isOut ? (
            <span>
              {isIn ? 'In' : 'Out'}
              {counterpartCode ? ` ${isIn ? 'from' : 'to'} ${counterpartCode}` : ''}
            </span>
          ) : null}
          {entry.userName ? <span>· {entry.userName}</span> : null}
        </div>
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
        {formatWhen(entry.createdAt)}
      </span>
    </div>
  );
}
