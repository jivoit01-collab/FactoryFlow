import { Boxes } from 'lucide-react';

import { CONDITION_ORDER, CONDITION_SHORT, type ReturnsPalette } from '../constants';
import type { ReturnsSkuRow } from '../types';
import { compactMoney, exactQty, percent } from '../utils/format';
import { ConditionBar } from './ConditionBar';
import { ReturnsPanel } from './ReturnsPanel';

interface TopSkuTableProps {
  rows: ReturnsSkuRow[];
  palette: ReturnsPalette;
}

/** The worst reason on a SKU, when one bucket clearly dominates it. */
function leadingReason(row: ReturnsSkuRow): string | null {
  const entries = Object.entries(row.reasons).filter(([key]) => key !== 'UNSPECIFIED');
  if (entries.length === 0) return null;
  const [key, value] = entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best));
  // Below a third of the SKU's quantity there is no leading reason, only a tie —
  // and naming one would invent a cause the data does not support.
  if (!value || value * 3 < row.quantity) return null;
  return key;
}

const REASON_CHIP: Record<string, string> = {
  LEAKAGE: 'Leakage',
  BREAKAGE: 'Breakage',
  DAMAGE: 'Packing',
  EXPIRY: 'Expiry',
  QUALITY: 'Quality',
  WRONG_SHORT: 'Wrong/short',
  UNSOLD: 'Unsold',
  OTHER: 'Other',
};

/**
 * Which products come back most — the board's headline question.
 *
 * Ranked by quantity rather than by number of returns: one customer sending back
 * a pallet of 1L is the problem, not five customers sending back a bottle each.
 * The condition bar on every row is what turns the ranking into an action — a SKU
 * at the top that is all GOOD is a sales problem, and the same SKU all DAMAGED is
 * a packaging one.
 */
export function TopSkuTable({ rows, palette }: TopSkuTableProps) {
  return (
    <ReturnsPanel
      title="Which SKUs come back most"
      subtitle="Ranked by quantity returned, split by the state it came back in"
      icon={Boxes}
      accent="violet"
      aside={
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {CONDITION_ORDER.map((key) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: palette.condition[key] }}
                aria-hidden
              />
              {CONDITION_SHORT[key]}
            </span>
          ))}
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No returning lines in this window.
        </p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 pb-2 font-medium">Item</th>
                <th className="px-2 pb-2 text-right font-medium">Qty back</th>
                <th className="px-2 pb-2 text-right font-medium">Share</th>
                <th className="px-2 pb-2 font-medium">Condition</th>
                <th className="px-2 pb-2 text-right font-medium">Returns</th>
                <th className="px-2 pb-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const reason = leadingReason(row);
                return (
                  <tr
                    key={row.item_code}
                    className="border-t border-border/50 transition-colors duration-150 hover:bg-background/70"
                  >
                    <td className="max-w-[260px] px-2 py-2.5">
                      <p className="truncate text-sm font-medium" title={row.item_name}>
                        {row.item_name || row.item_code}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{row.item_code}</span>
                        {reason && (
                          <span
                            className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium uppercase tracking-wide"
                            title={`Most of this SKU's returned quantity carries a ${REASON_CHIP[reason]?.toLowerCase()} reason`}
                          >
                            {REASON_CHIP[reason] ?? reason}
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm font-semibold tabular-nums">
                      {exactQty(row.quantity)}
                      {row.uom && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {row.uom}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                      {percent(row.share)}
                    </td>
                    <td className="w-[160px] px-2 py-2.5">
                      <ConditionBar conditions={row.conditions} palette={palette} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm tabular-nums">
                      {row.returns}
                      <span
                        className="ml-1 text-xs text-muted-foreground"
                        title={`from ${row.customers} customer${row.customers === 1 ? '' : 's'}`}
                      >
                        / {row.customers}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm tabular-nums text-muted-foreground">
                      {compactMoney(row.value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ReturnsPanel>
  );
}
