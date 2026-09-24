import { OpsDrill } from '../../logistics-control/components';
import type { AdminProduction, AdminTrendDay } from '../types';
import { NO_VALUE, num, pctRough, tons } from '../utils';

/**
 * A day's output against what a producing day usually is.
 *
 * THREE OUTCOMES AND NO TWO OF THEM ARE THE SAME:
 *   - a signed tonnage, where there is an average to compare against;
 *   - `not a producing day`, on a day that made nothing. The average's own
 *     denominator is producing days, so a shut day is not 97.8 T below it — it
 *     is outside the population the average was taken over, and a figure here
 *     would be comparing it against a mean that excluded it. The column beside
 *     this one has already said the plant made nothing, so repeating that here
 *     would also spend the width saying it twice;
 *   - a rule, where no producing day has an average yet and the comparison
 *     cannot be made at all.
 */
function againstAverage(tonsToday: number, average: number | null): string {
  if (tonsToday === 0) return 'not a producing day';
  if (average === null) return NO_VALUE;
  const gap = tonsToday - average;
  // Rounded before the sign is chosen, so a day 0.04 T under does not print as
  // "−0.0 T" — a minus sign in front of a zero reads as a shortfall.
  const shown = Math.abs(gap) < 0.05 ? 0 : gap;
  if (shown === 0) return 'on the average';
  return `${shown > 0 ? '+' : '−'}${tons(Math.abs(shown))} T`;
}

export interface AdminProductionDrillProps {
  production: AdminProduction;
  /** The window the month's figures cover, as the tile prints it. */
  period: string;
  onClose: () => void;
}

/**
 * What the plant made, and what the plan expected of it.
 *
 * The tile has room for one tonnage and one bar. The questions that follow it —
 * how much of this the plan ever listed, what the remaining days have to
 * average, and whether today is a normal day for this week — have nowhere to
 * land on a tile that size. They land here.
 *
 * THE ROWS DO NOT ADD UP TO THE STATS, AND THE SUBTITLE SAYS SO. The stats are
 * the month; the table is the trend window the payload carries, which is the
 * last few days and not the month. Everywhere else on this board a breakdown
 * that did not add up to the figure above it would be a bug, so the one place
 * it is intended has to be stated rather than left for a reader to discover by
 * adding the column up.
 */
export function AdminProductionDrill({ production, period, onClose }: AdminProductionDrillProps) {
  const average = num(production.avg_tons_per_producing_day);
  const days = production.trend.length;

  return (
    <OpsDrill
      title="Total production"
      // The Output band's own hue, so the panel is visibly the tile just
      // clicked. `output` maps to the dispatch blue — see `AdminBand`.
      domain="dispatch"
      subtitle={
        days > 0
          ? `${period} · the month in the figures above, the last ${days} days in the table below — which do not add up to it`
          : `${period} · ${production.basis}`
      }
      onClose={onClose}
      stats={[
        { label: 'This month', value: `${tons(production.mtd_tons)} T` },
        { label: 'Today', value: `${tons(production.today_tons)} T` },
        {
          label: 'An average producing day',
          // The denominator travels with the average. "97.8 T" over four days
          // and over twenty-two are different claims about the same plant.
          value:
            average === null
              ? NO_VALUE
              : `${tons(average)} T over ${production.producing_days} days`,
        },
        {
          label: 'To close the plan',
          // A rule rather than a zero where no plan is filed: "0 T a day" would
          // read as a plan already met.
          value:
            production.required_tons_per_day == null
              ? 'no plan filed'
              : `${tons(production.required_tons_per_day)} T a day · ${production.remaining_days} days left`,
        },
      ]}
      breakdown={{
        title: 'Against the plan',
        // Empty rather than a row of rules where SAP holds no plan: four
        // dashes look like a failed read, and this is a plan nobody filed.
        empty: production.plan_name
          ? 'The plan is filed but carries no tonnage.'
          : 'No plan is filed for this month, so there is nothing to measure against.',
        items:
          production.plan_tons == null
            ? []
            : [
                {
                  key: 'plan',
                  label: production.plan_name ?? 'Plan for the month',
                  value: `${tons(production.plan_tons)} T`,
                  sub:
                    production.plan_to_date_tons != null
                      ? `${tons(production.plan_to_date_tons)} T pro-rated to today`
                      : undefined,
                },
                {
                  key: 'listed',
                  label: 'On the plan’s own lines',
                  value: `${tons(production.planned_items_tons)} T`,
                  // SAP's attainment on those lines, which is NOT the headline
                  // over the target — the headline counts output the plan
                  // never listed and this figure cannot.
                  sub:
                    production.planned_items_pct != null
                      ? `${pctRough(production.planned_items_pct)} attained`
                      : undefined,
                },
                {
                  key: 'unplanned',
                  label: 'The plan never listed',
                  value: `${tons(production.unplanned_tons)} T`,
                  sub: 'counted in the headline, not in the target',
                },
                ...(production.unweighed_lines > 0
                  ? [
                      {
                        key: 'unweighed',
                        label: 'Lines with no litre volume',
                        value: `${production.unweighed_lines}`,
                        // Load-bearing: these made pieces the tonnage cannot
                        // speak for, so the headline is short by whatever they
                        // weigh and the panel must not imply otherwise.
                        sub: 'made in pieces, absent from the tonnage',
                      },
                    ]
                  : []),
              ],
      }}
      rows={production.trend}
      rowKey={(day: AdminTrendDay) => day.date}
      empty="The trend window carries no days."
      columns={[
        { label: 'Day', cell: (day: AdminTrendDay) => day.label },
        { label: 'Date', cell: (day: AdminTrendDay) => day.date, dim: true },
        {
          label: 'Made',
          // A day of nothing says so in words. `0.0 T` and a day nobody
          // reported look identical, and only one of them is a fact.
          cell: (day: AdminTrendDay) => (day.tons > 0 ? `${tons(day.tons)} T` : 'nothing made'),
          numeric: true,
        },
        {
          label: 'Against an average day',
          cell: (day: AdminTrendDay) => againstAverage(day.tons, average),
          numeric: true,
          dim: true,
        },
      ]}
    />
  );
}
