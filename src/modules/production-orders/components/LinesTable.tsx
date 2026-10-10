import {
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { cn } from '@/shared/utils';

import type { BatchPick } from '../api';
import { qty } from '../utils/format';

/** The fields both a preview line and a saved line carry. */
export interface OrderLineView {
  position: number;
  item_code: string;
  item_name: string;
  item_type: 'item' | 'resource';
  base_quantity: string;
  planned_quantity: string;
  warehouse: string;
  uom: string;
  batch_managed: boolean;
  batches: BatchPick[];
  on_hand?: string | null;
  short?: string | null;
}

/**
 * The order's lines: the BOM, scaled to what was made. SAP refuses a standard
 * order that differs from its BOM, so these are shown, never edited. Stock is
 * shown while the entry is being made (the preview); the batches are the ones
 * the issue will draw on.
 */
export function LinesTable({
  lines,
  showStock = false,
  summary,
  actions,
}: {
  lines: OrderLineView[];
  showStock?: boolean;
  summary?: string;
  actions?: React.ReactNode;
}) {
  return (
    <TableCard summary={summary ?? `${lines.length} lines, from the BOM`} actions={actions}>
      <table className={TABLE_CLASSES}>
        <thead className={THEAD_CLASSES}>
          <tr>
            <Th>Item</Th>
            <Th align="right">Per piece</Th>
            <Th align="right">Quantity</Th>
            <Th>Warehouse</Th>
            {showStock && <Th align="right">In stock</Th>}
            <Th>Batches</Th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr
              key={line.position}
              className={cn(
                'border-b last:border-0',
                line.short && 'bg-amber-50/60 dark:bg-amber-950/20',
              )}
            >
              <Td>
                <span className="font-mono text-xs font-semibold">{line.item_code}</span>
                {line.item_type === 'resource' && (
                  <StatusPill tone="neutral" className="ml-2">
                    Resource
                  </StatusPill>
                )}
                <span className="block text-muted-foreground">{line.item_name || '—'}</span>
              </Td>
              <Td numeric className="text-muted-foreground">
                {qty(line.base_quantity, 6)}
              </Td>
              <Td numeric className="font-medium">
                {qty(line.planned_quantity)}{' '}
                <span className="text-xs text-muted-foreground">{line.uom}</span>
              </Td>
              <Td className="font-mono text-xs">{line.warehouse}</Td>
              {showStock && (
                <Td
                  numeric
                  className={cn(line.short && 'font-semibold text-amber-700 dark:text-amber-400')}
                >
                  {line.item_type === 'resource' ? '—' : qty(line.on_hand)}
                  {line.short && <span className="block text-xs">{qty(line.short)} short</span>}
                </Td>
              )}
              <Td className="text-xs">
                {!line.batch_managed ? (
                  <span className="text-muted-foreground">—</span>
                ) : line.batches.length === 0 ? (
                  <span className="text-amber-700 dark:text-amber-400">
                    Oldest first, when issued
                  </span>
                ) : (
                  <ul className="space-y-0.5">
                    {line.batches.map((batch) => (
                      <li
                        key={batch.batch_number}
                        className="flex flex-wrap justify-between gap-x-3"
                      >
                        <span className="font-mono">{batch.batch_number}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {qty(batch.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableCard>
  );
}
