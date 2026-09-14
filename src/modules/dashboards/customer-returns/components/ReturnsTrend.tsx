import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ReturnsPalette } from '../constants';
import type { ReturnsTrendPoint, ReturnsWindow } from '../types';
import { compactQty, exactQty, sellableSplit, trendLabel } from '../utils/format';
import { ReturnsPanel } from './ReturnsPanel';

interface ReturnsTrendProps {
  trend: ReturnsTrendPoint[];
  window: ReturnsWindow;
  palette: ReturnsPalette;
}

interface TrendDatum extends ReturnsTrendPoint {
  label: string;
  /** The part that can be sold again — `quantity` less `damaged_quantity`. */
  good_quantity: number;
}

interface TooltipPayloadEntry {
  payload: TrendDatum;
}

function TrendTooltip({
  active,
  payload,
  palette,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  palette: ReturnsPalette;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  const rows = [
    { label: 'Came back', value: point.quantity, hue: palette.total },
    { label: 'Unsellable', value: point.damaged_quantity, hue: palette.unsellable },
    { label: 'Still good', value: point.good_quantity, hue: undefined },
  ];

  return (
    <div className="rounded-lg border border-border/70 bg-popover/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-xs font-semibold">{point.label}</p>
      <p className="mb-1.5 text-[11px] text-muted-foreground">
        {point.returns} return{point.returns === 1 ? '' : 's'}
      </p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: row.hue ?? 'transparent', outline: row.hue ? undefined : '1px solid currentColor' }}
            aria-hidden
          />
          <span className="text-muted-foreground">{row.label}</span>
          <span className="ml-auto font-semibold tabular-nums">{exactQty(row.value)}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * How much came back over the window, and how much of it was unsellable.
 *
 * Two series on ONE axis — both are the same quantity in the same unit, one a
 * subset of the other, so the unsellable band is drawn inside the total rather
 * than on a second scale. The alternative people reach for here is a second
 * y-axis for a damage percentage, which lets the two lines cross wherever the
 * scales happen to put them and means nothing.
 *
 * Filled rather than a bare line because the gap between the two IS the reading:
 * the distance from the red band to the blue edge is the stock that can be sold
 * again.
 */
export function ReturnsTrend({ trend, window, palette }: ReturnsTrendProps) {
  const data: TrendDatum[] = sellableSplit(trend).map((point) => ({
    ...point,
    label: trendLabel(point.bucket, window.granularity),
  }));

  return (
    <ReturnsPanel
      title="Returns over time"
      subtitle={
        window.granularity === 'day'
          ? 'By the day the truck arrived — or the day it was booked, if it has not'
          : 'By month, on the day the truck arrived — or was booked, if it has not'
      }
      icon={TrendingUp}
      accent="blue"
      aside={
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: palette.total }}
              aria-hidden
            />
            Came back
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: palette.unsellable }}
              aria-hidden
            />
            Unsellable
          </span>
        </div>
      }
    >
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Nothing came back in this window.
        </p>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="cr-total" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.total} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={palette.total} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="cr-unsellable" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.unsellable} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={palette.unsellable} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: palette.axis }}
                tickLine={false}
                axisLine={{ stroke: palette.grid }}
                minTickGap={16}
              />
              <YAxis
                tick={{ fontSize: 11, fill: palette.axis }}
                tickLine={false}
                axisLine={false}
                tickFormatter={compactQty}
                width={56}
              />
              <Tooltip
                content={<TrendTooltip palette={palette} />}
                cursor={{ stroke: palette.axis, strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="quantity"
                stroke={palette.total}
                strokeWidth={2}
                fill="url(#cr-total)"
                // The dot only appears under the crosshair; one per bucket on a
                // 90-day window is noise that hides the line it decorates.
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="damaged_quantity"
                stroke={palette.unsellable}
                strokeWidth={2}
                fill="url(#cr-unsellable)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ReturnsPanel>
  );
}
