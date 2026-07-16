import { ArrowUpRight, ClipboardList, IndianRupee, Truck } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatCurrency, getDefaultDateRange, getErrorMessage } from '@/shared/utils';

import { useDispatchFulfilment } from '../../dispatch-fulfilment/api';
import { ACCENTS } from '../constants';
import { KpiStat } from './KpiStat';

function abbreviate(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(n / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

const money = (v: number) => `₹${abbreviate(v)}`;
const shortDate = (iso: string) => (iso.length >= 10 ? iso.slice(5) : iso);

/**
 * Live dispatch KPIs on the overview — dispatched value, trucks out, open
 * backlog + a soft area trend. Reuses the dispatch-fulfilment summary hook.
 */
export function LiveDispatchCard() {
  const navigate = useNavigate();
  const range = useMemo(() => getDefaultDateRange(), []);
  const query = useDispatchFulfilment(range);
  const data = query.data;

  const trend = useMemo(
    () => (data?.trend ?? []).map((r) => ({ date: shortDate(r.date), value: r.dispatched_amount })),
    [data],
  );

  const goToDispatch = () => navigate('/dashboards/dispatch-fulfilment');

  return (
    <section className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both rounded-3xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-sm duration-500">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1.5 rounded-full bg-teal-500" />
          <h3 className="text-base font-semibold">Dispatch · last 30 days</h3>
        </div>
        <button
          type="button"
          onClick={goToDispatch}
          className="group inline-flex items-center gap-1 text-xs font-medium text-teal-600 transition-colors hover:text-teal-700 dark:text-teal-400"
        >
          View dashboard
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </header>

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          {getErrorMessage(query.error, 'Failed to load dispatch data.')}
        </p>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiStat
              icon={IndianRupee}
              label="Dispatched value"
              value={money(data.totals.dispatched.amount)}
              sub={`${data.totals.dispatched.bills} invoices shipped`}
              accent={ACCENTS.emerald}
              onClick={goToDispatch}
              delayMs={0}
            />
            <KpiStat
              icon={Truck}
              label="Trucks out"
              value={data.totals.dispatched.count}
              sub="Gate-outs in window"
              accent={ACCENTS.teal}
              onClick={goToDispatch}
              delayMs={60}
            />
            <KpiStat
              icon={ClipboardList}
              label="Open backlog"
              value={money(data.totals.backlog.amount)}
              sub={`${data.totals.backlog.count} bills pending`}
              accent={ACCENTS.amber}
              onClick={goToDispatch}
              delayMs={120}
            />
          </div>

          {trend.length > 0 && (
            <div className="mt-4 h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dispatchArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENTS.emerald.hex} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={ACCENTS.emerald.hex} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis
                    fontSize={10}
                    width={52}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => money(v)}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Dispatched']}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={ACCENTS.emerald.hex}
                    strokeWidth={2.5}
                    fill="url(#dispatchArea)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </section>
  );
}
