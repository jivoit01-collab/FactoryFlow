import { Building2 } from 'lucide-react';
import { useMemo } from 'react';

import { cn } from '@/shared/utils';

import type { CompanySlice, DispatchDayVehicles } from '../hooks';
import { useNow } from '../hooks';
import { compact, count, money, weight } from '../utils/format';
import { BoardPanel, PanelBadge, PanelEmpty } from './BoardPanel';

/** One colour per company, in the order they rank. Fixed hues so the same
 *  company keeps the same colour between the bars and the share strip. */
const COMPANY_HEX = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#22d3ee'];

/** The working day the hour strip covers; out-of-hours gate-outs fold into the
 *  end bars rather than being dropped. */
const FIRST_HOUR = 6;
const LAST_HOUR = 22;

/**
 * The day split three ways -- one block per company, ranked by what each has
 * actually shipped.
 *
 * Every company the user can reach gets a block whether or not it has dispatched
 * anything: a company that has shipped nothing all day is the single most
 * important thing this panel can say, and dropping its empty row would hide it.
 */
export function DispatchCompanyPanel({
  vehicles,
  /** Company codes the user's account covers, so a silent company still shows. */
  knownCompanyCodes,
}: {
  vehicles: DispatchDayVehicles;
  knownCompanyCodes: string[];
}) {
  const now = useNow(30_000);

  const rows = useMemo(() => {
    const seen = new Set(vehicles.byCompany.map((row) => row.code));
    const missing: CompanySlice[] = knownCompanyCodes
      .filter((code) => !seen.has(code))
      .map((code) => ({
        code,
        name: code,
        trucksOut: 0,
        trucksIn: 0,
        bills: 0,
        amount: 0,
        boxes: 0,
        weightKg: 0,
      }));
    return [...vehicles.byCompany, ...missing];
  }, [vehicles.byCompany, knownCompanyCodes]);

  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  const maxAmount = Math.max(...rows.map((row) => row.amount), 1);
  const totalOut = rows.reduce((sum, row) => sum + row.trucksOut, 0);

  return (
    <BoardPanel
      title="By company"
      icon={Building2}
      hex="#60a5fa"
      aside={<PanelBadge tone="good">{money(totalAmount)}</PanelBadge>}
    >
      {rows.length === 0 ? (
        <PanelEmpty>
          {vehicles.isLoading ? 'Reading the docking register...' : 'No company has shipped today.'}
        </PanelEmpty>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* share of the day, as one stacked strip */}
          <div className="shrink-0">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              {rows.map((row, index) =>
                row.amount > 0 ? (
                  <span
                    key={row.code}
                    className="h-full transition-[width] duration-700"
                    style={{
                      width: `${(row.amount / (totalAmount || 1)) * 100}%`,
                      backgroundColor: COMPANY_HEX[index % COMPANY_HEX.length],
                    }}
                  />
                ) : null,
              )}
            </div>
          </div>

          {/* one block per company */}
          {/* Scrolls rather than clips: three companies always fit, but a fourth
              must not silently disappear off the bottom of the panel. */}
          <div className="wall-scroll flex min-h-0 flex-1 flex-col justify-start gap-2 overflow-y-auto">
            {rows.map((row, index) => (
              <CompanyBlock
                key={row.code}
                row={row}
                hex={COMPANY_HEX[index % COMPANY_HEX.length]}
                max={maxAmount}
                share={totalAmount > 0 ? Math.round((row.amount / totalAmount) * 100) : 0}
              />
            ))}
          </div>

          <OutByHour
            outByHour={vehicles.outByHour}
            currentHour={now.getHours()}
            totalOut={totalOut}
          />
        </div>
      )}
    </BoardPanel>
  );
}

function CompanyBlock({
  row,
  hex,
  max,
  share,
}: {
  row: CompanySlice;
  hex: string;
  max: number;
  share: number;
}) {
  const silent = row.trucksOut === 0;

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2 transition-colors',
        silent ? 'border-white/5 bg-white/[0.02]' : 'border-white/10 bg-white/[0.04]',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
          <span
            className={cn(
              'truncate text-sm font-bold uppercase tracking-wide',
              silent ? 'text-slate-500' : 'text-white',
            )}
          >
            {row.name}
          </span>
        </span>
        <span className="flex shrink-0 items-baseline gap-2">
          <span
            className="text-lg font-bold tabular-nums leading-none"
            style={{ color: silent ? '#475569' : hex }}
          >
            {row.trucksOut}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            out
          </span>
          {row.trucksIn > 0 && (
            <span className="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              {row.trucksIn} in
            </span>
          )}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full transition-[width] duration-700"
            style={{
              width: `${Math.max((row.amount / max) * 100, row.amount > 0 ? 4 : 0)}%`,
              backgroundColor: hex,
            }}
          />
        </span>
        <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums text-white">
          {row.amount > 0 ? money(row.amount) : '—'}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] tabular-nums text-slate-500">
        <span>
          {count(row.bills)} {row.bills === 1 ? 'bill' : 'bills'} &middot; {compact(row.boxes)} bx
          &middot; {weight(row.weightKg)}
        </span>
        <span className={silent ? 'text-slate-600' : 'text-slate-400'}>{share}% of day</span>
      </div>
    </div>
  );
}

/** When the trucks actually left -- the day's rhythm in one strip. */
function OutByHour({
  outByHour,
  currentHour,
  totalOut,
}: {
  outByHour: number[];
  currentHour: number;
  totalOut: number;
}) {
  const slots = useMemo(() => {
    const out: { hour: number; value: number }[] = [];
    for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour += 1) {
      out.push({ hour, value: outByHour[hour] ?? 0 });
    }
    const early = outByHour.slice(0, FIRST_HOUR).reduce((sum, value) => sum + value, 0);
    const late = outByHour.slice(LAST_HOUR + 1).reduce((sum, value) => sum + value, 0);
    if (early) out[0].value += early;
    if (late) out[out.length - 1].value += late;
    return out;
  }, [outByHour]);

  const peak = Math.max(...slots.map((slot) => slot.value), 1);

  return (
    <div className="shrink-0 border-t border-white/10 pt-2">
      <p className="mb-1 flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        <span>Gate-outs by hour</span>
        <span className="tabular-nums">{count(totalOut)} today</span>
      </p>
      <div className="flex h-10 items-end gap-[3px]">
        {slots.map((slot) => (
          <span
            key={slot.hour}
            title={`${String(slot.hour).padStart(2, '0')}:00 — ${slot.value}`}
            className={cn(
              'flex-1 rounded-sm transition-[height] duration-500',
              slot.value > 0 ? 'bg-emerald-400' : 'bg-white/10',
              slot.hour === currentHour && 'ring-1 ring-white/50',
            )}
            style={{
              height: slot.value > 0 ? `${Math.max((slot.value / peak) * 100, 14)}%` : '6%',
            }}
          />
        ))}
      </div>
      <div className="mt-0.5 flex gap-[3px]">
        {slots.map((slot) => (
          <span
            key={slot.hour}
            className={cn(
              'flex-1 text-center text-[9px] tabular-nums',
              slot.hour === currentHour ? 'font-bold text-slate-300' : 'text-slate-600',
            )}
          >
            {slot.hour % 4 === 0 ? String(slot.hour).padStart(2, '0') : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
