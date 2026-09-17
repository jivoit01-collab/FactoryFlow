import {
  AlertTriangle,
  CalendarX2,
  CheckCircle2,
  CircleHelp,
  Droplets,
  ShieldAlert,
} from 'lucide-react';

import { CONDITION_ORDER, CONDITION_SHORT, type ReturnsPalette } from '../constants';
import type { ReturnCondition, ReturnsConditionRow } from '../types';
import { compactMoney, exactQty, percent } from '../utils/format';
import { ConditionBar } from './ConditionBar';
import { ReturnsPanel } from './ReturnsPanel';

/**
 * A written mark beside every colour.
 *
 * The condition hues are a status palette, and the pair a colour-blind reader
 * separates least well is exactly the pair this panel is read for — Damaged
 * against Good. So each condition carries an icon and a name, and the colour is
 * the third signal rather than the only one.
 */
const CONDITION_ICON: Record<ReturnCondition, typeof CheckCircle2> = {
  GOOD: CheckCircle2,
  DAMAGED: AlertTriangle,
  LEAKED: Droplets,
  EXPIRED: CalendarX2,
  OTHER: CircleHelp,
};

interface ConditionSplitProps {
  rows: ReturnsConditionRow[];
  palette: ReturnsPalette;
}

/**
 * What state the goods came back in — the stored answer.
 *
 * Deliberately not a pie: four slices whose whole point is the comparison between
 * two of them read better as one bar plus a ranked list, and the list can carry
 * the figures a pie would need labels for.
 */
export function ConditionSplit({ rows, palette }: ConditionSplitProps) {
  const byKey = new Map(rows.map((row) => [row.condition, row]));
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  const conditions = CONDITION_ORDER.reduce(
    (acc, key) => ({ ...acc, [key]: byKey.get(key)?.quantity ?? 0 }),
    {} as Record<ReturnCondition, number>,
  );

  return (
    <ReturnsPanel
      title="What state it came back in"
      subtitle="Recorded on the line by the returns clerk"
      icon={ShieldAlert}
      accent="rose"
      aside={
        <span className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {exactQty(total)} total
        </span>
      }
    >
      {total <= 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No returning lines in this window.
        </p>
      ) : (
        <>
          <ConditionBar conditions={conditions} palette={palette} size="lg" />
          <ul className="mt-4 space-y-1">
            {CONDITION_ORDER.map((key) => {
              const row = byKey.get(key);
              const Icon = CONDITION_ICON[key];
              const quantity = row?.quantity ?? 0;
              return (
                <li
                  key={key}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-background/70"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: palette.condition[key] }}
                    aria-hidden
                  />
                  <Icon
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="flex-1 text-sm font-medium">{CONDITION_SHORT[key]}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {exactQty(quantity)}
                  </span>
                  <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
                    {percent(row?.share ?? 0)}
                  </span>
                  <span
                    className="hidden w-20 text-right text-xs tabular-nums text-muted-foreground sm:block"
                    title="Invoice-basis lines only"
                  >
                    {compactMoney(row?.value ?? 0)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </ReturnsPanel>
  );
}
