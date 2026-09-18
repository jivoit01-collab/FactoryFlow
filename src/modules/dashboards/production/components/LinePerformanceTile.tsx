import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { clockTime, count, localDateOf, money } from '../../dispatch/utils/format';
import { ratioTone } from '../constants/production-wall.constants';
import { type BoardUnit, nounOf, perNounOf, quantityOf, rateOf } from '../utils/boardUnit';
import type { LineTile } from '../utils/lineTiles';

/** "4h 20m" — a shift is read in hours, not in 260 minutes. */
function duration(minutes: number): string {
  if (minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function percent(value: number | null): string {
  return value == null ? '—' : `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

/**
 * How many days later the line finished than it started.
 *
 * A shift that runs past midnight makes bare clock times lie: 6 Head on
 * 2026-09-17 started at 08:33 and its last spell closed at 11:04 the NEXT
 * morning, which read as a two-and-a-half-hour window sitting over a figure
 * claiming eleven hours of running. The window has to say which day it ended.
 */
function daysLater(from: string | null, to: string | null): number {
  const start = localDateOf(from);
  const end = localDateOf(to);
  if (!start || !end || start === end) return 0;
  const diff = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime();
  return Math.max(0, Math.round(diff / 86_400_000));
}

/** The vocabulary a line's state is named in. */
const STATE_LABEL: Record<string, string> = {
  BREAKDOWN: 'Breakdown',
  RUNNING: 'Running',
  STOPPED: 'Stopped',
  COMPLETED: 'Finished',
  DRAFT: 'Not started',
};

/**
 * States that read as lost production and take the tile's alarm colour.
 *
 * A stopped line costs the same output as a broken one — the difference is why,
 * not whether it matters — so both are red rather than red-and-amber, and stay
 * told apart by their label and the warning icon a breakdown carries.
 */
const ALARM_STATES = ['BREAKDOWN', 'STOPPED'];

function Figure({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className={cn('truncate text-xl font-bold tabular-nums', tone ?? 'text-foreground')}>
        {value}
      </p>
      {sub && <p className="truncate text-[11px] font-medium text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** One fact about the line, on the tile's bottom shelf. */
function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="truncate">
      <span className="font-medium text-muted-foreground">{label} </span>
      <span className="font-semibold text-foreground/80">{children}</span>
    </span>
  );
}

/**
 * One production line, in full.
 *
 * There is a tile for each line that ran and no others, so the board's shape is
 * the day's: five lines on 17 September, five tiles. That keeps every tile big
 * enough to carry the line's whole picture — what it made, how fast, against
 * what, for how long, at what cost, with whom — instead of a headline the
 * reader has to leave the board to understand.
 *
 * It is built around the comparison rather than the count, because a case count
 * on its own cannot be judged: 900 cases is excellent from four hours and poor
 * from ten. So the bar across the middle is output against what the line's
 * rated speed says it should have made in the time it actually ran, and the
 * figures under it are the two things that move that bar — how fast it went,
 * and how much of its time it spent stopped.
 *
 * Where a run carries no rated speed of its own, the figure comes from the
 * line's configuration and the tile says "line preset" underneath. That is the
 * difference between a board that shows five tiles and one that shows five
 * dashes, and the reader is told which rating they are reading either way.
 */
export function LinePerformanceTile({
  tile,
  unitNoun,
  unit,
  benchmark,
  onOpen,
}: {
  tile: LineTile;
  unitNoun: string;
  /** Cases or litres — the whole board counts in one of them. */
  unit: BoardUnit;
  /** The variant's own OEE target — what "good" means at this plant. */
  benchmark: number;
  /** Open the lead run's card. */
  onOpen: () => void;
}) {
  const alarming = ALARM_STATES.includes(tile.state);
  const broken = tile.state === 'BREAKDOWN';
  const overnight = daysLater(tile.startedAt, tile.endedAt);
  const inLitres = unit === 'litres';

  const output = quantityOf(unit, tile.cases, tile.litres, unitNoun);
  const expected = inLitres ? tile.expectedLitres : tile.expectedCases;
  const target = inLitres ? tile.targetLitres : tile.targetCases;
  const speed = inLitres ? tile.actualLitresPerHour : tile.actualSpeed;
  const rated = inLitres ? tile.ratedLitresPerHour : tile.ratedSpeed;
  // The bar is drawn on the unit on show, so its fill and its caption agree.
  const drawn = (inLitres ? tile.litres : tile.cases) ?? 0;
  const scale = Math.max(drawn, expected ?? 0, 1);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${tile.lineName} — ${output.text} ${output.noun ?? ''}, open the run`}
      className={cn(
        'flex min-w-0 flex-col rounded-2xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
        alarming
          ? 'border-rose-500/40 bg-rose-500/[0.07] hover:bg-rose-500/[0.12] dark:border-rose-400/30 dark:bg-rose-400/[0.07]'
          : 'border-black/[0.09] bg-black/[0.02] hover:bg-black/[0.045] dark:border-white/10 dark:bg-white/[0.035] dark:hover:bg-white/[0.06]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 truncate text-lg font-bold text-foreground">
            {broken && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />}
            {tile.lineName}
          </h3>
          <p className="truncate text-xs font-semibold text-muted-foreground" title={tile.product}>
            {tile.product}
          </p>
          <p className="truncate text-[11px] font-medium text-muted-foreground">
            {tile.itemCode && `${tile.itemCode} · `}
            {tile.runs.length > 1
              ? `${count(tile.runs.length)} runs`
              : `run #${tile.lead.runNumber}`}
            {tile.startedAt &&
              ` · ${clockTime(tile.startedAt)}–${tile.endedAt ? clockTime(tile.endedAt) : 'now'}${
                overnight > 0 ? ` +${overnight}d` : ''
              }`}
          </p>
        </div>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
            alarming
              ? 'border-rose-600/30 bg-rose-500/10 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300'
              : tile.state === 'RUNNING'
                ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300'
                : tile.state === 'COMPLETED'
                  ? 'border-sky-600/30 bg-sky-500/10 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300'
                  : 'border-black/[0.09] bg-black/[0.035] text-foreground/60 dark:border-white/10 dark:bg-white/5',
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              alarming
                ? 'bg-rose-500'
                : tile.state === 'RUNNING'
                  ? 'bg-emerald-500'
                  : tile.state === 'COMPLETED'
                    ? 'bg-sky-500'
                    : 'bg-muted-foreground/40',
            )}
          />
          {STATE_LABEL[tile.state] ?? tile.state}
        </span>
      </div>

      {/* output against the rating — the whole point of the tile */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-3xl font-bold tabular-nums text-foreground">
            {output.text}
            <span className="ml-1.5 text-xs font-semibold text-muted-foreground">
              {output.noun ?? 'no volume in SAP'}
              {tile.isLive && ' · live'}
            </span>
          </span>
          <span
            className={cn(
              'text-3xl font-bold tabular-nums',
              ratioTone(tile.efficiencyPct, benchmark),
            )}
          >
            {percent(tile.efficiencyPct)}
          </span>
        </div>

        <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-[width] duration-500',
              tile.efficiencyPct == null
                ? 'bg-violet-500'
                : tile.efficiencyPct >= benchmark
                  ? 'bg-emerald-500'
                  : tile.efficiencyPct >= benchmark * 0.8
                    ? 'bg-amber-500'
                    : 'bg-rose-500',
            )}
            style={{ width: `${(drawn / scale) * 100}%` }}
          />
          {expected != null && (
            <span
              aria-hidden
              className="absolute inset-y-0 w-px bg-foreground/50"
              style={{ left: `${(expected / scale) * 100}%` }}
            />
          )}
        </div>
        {/* Red the moment the line is behind its rating: the shortfall is the
            whole point of the line and must not read as a caption. The figure
            it is short BY is spelled out, because "443 expected" against an
            880 above it still leaves the reader doing the subtraction. */}
        <p
          className={cn(
            // The reader's second question after the headline — what it made
            // against what it should have — so it is sized as an answer, not
            // as a caption under the bar.
            'mt-1.5 truncate text-base font-bold',
            expected != null && drawn < expected
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground',
          )}
        >
          {expected != null ? (
            <>
              {count(expected)} {nounOf(unit, unitNoun)} expected in{' '}
              {duration(tile.runningMinutes)}
              {drawn < expected && ` · ${count(expected - drawn)} short`}
            </>
          ) : tile.detailLoading ? (
            'reading the line’s segments…'
          ) : (
            'no rating to measure this against'
          )}
        </p>
      </div>

      {/* Speed, then the line's day split three ways. Idle and breakdown are
          kept apart because they are different problems: a breakdown has a
          cause and an owner, idle time is only a gap — a changeover, a wait for
          material, a shift that started late. */}
      <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-black/[0.06] pt-2.5 dark:border-white/5">
        <Figure
          label={inLitres ? 'Litres/hr' : 'Speed'}
          value={speed != null ? count(speed) : '—'}
          sub={
            rated != null
              ? `of ${count(rated)}${tile.ratedFrom === 'config' ? ' · preset' : ''}`
              : 'unrated'
          }
        />
        <Figure
          label="Running"
          value={duration(tile.runningMinutes)}
          sub={`${percent(tile.utilisationPct)} of ${duration(tile.spanMinutes)}`}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <Figure
          label="Idle"
          value={duration(tile.idleMinutes)}
          sub={tile.idleMinutes > 0 ? 'between spells' : 'no gap'}
          tone={tile.idleMinutes > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
        />
        <Figure
          label="Breakdown"
          value={duration(tile.breakdownMinutes)}
          sub={
            tile.stoppageCount > 0
              ? `${count(tile.stoppageCount)} logged`
              : // Never "clean shift": a line that ran eleven hours with nothing
                // logged is as likely to be an unfilled register as a clean one,
                // and the tile must not award it a clean bill.
                'none logged'
          }
          tone={tile.breakdownMinutes > 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
        />
      </div>

      {/* The same three, to scale — how the line's day was actually spent. */}
      {tile.spanMinutes > 0 && (
        <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
          <div
            className="bg-emerald-500"
            style={{ width: `${(tile.runningMinutes / tile.spanMinutes) * 100}%` }}
          />
          <div
            className="bg-amber-500"
            style={{ width: `${(tile.idleMinutes / tile.spanMinutes) * 100}%` }}
          />
          <div
            className="bg-rose-500"
            style={{ width: `${(tile.breakdownMinutes / tile.spanMinutes) * 100}%` }}
          />
        </div>
      )}

      {/* what stopped it, by cause — the line's own worst problem, named */}
      {tile.stoppages.length > 0 && (
        <ul className="mt-2 space-y-1">
          {tile.stoppages.slice(0, 3).map((stoppage) => (
            <li key={stoppage.label} className="flex items-center gap-2 text-[11px]">
              <span
                aria-hidden
                className="h-1.5 shrink-0 rounded-full bg-rose-500/70"
                style={{
                  width: `${Math.max(
                    6,
                    (stoppage.minutes / Math.max(tile.breakdownMinutes, 1)) * 40,
                  )}%`,
                }}
              />
              <span className="min-w-0 flex-1 truncate font-medium text-muted-foreground">
                <span className="font-bold text-foreground">{stoppage.label}</span>
                {stoppage.count > 1 && ` ×${count(stoppage.count)}`}
                {stoppage.unrecovered && ' · never made up'}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                {duration(stoppage.minutes)}
              </span>
            </li>
          ))}
          {tile.stoppages.length > 3 && (
            <li className="text-[11px] text-muted-foreground/70">
              +{count(tile.stoppages.length - 3)} more causes
            </li>
          )}
        </ul>
      )}

      {tile.openBreakdown && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {tile.openBreakdown.breakdown_category_name || 'Stopped'} since{' '}
            {clockTime(tile.openBreakdown.start_time)}
            {tile.openBreakdown.reason && ` · ${tile.openBreakdown.reason}`}
            {tile.openBreakdown.maintenance_work_order_no &&
              ` · WO ${tile.openBreakdown.maintenance_work_order_no}`}
          </span>
        </p>
      )}

      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-black/[0.06] pt-2.5 text-[11px] dark:border-white/5">
        <Note label="Target">
          {target != null ? `${count(target)} · ${percent(tile.targetPct)}` : 'none set'}
        </Note>
        <Note label="Cost">
          {tile.netCost != null && tile.costedCases > 0
            ? `${money(tile.netCost)} · ${
                rateOf(unit, tile.netCost, tile.costedCases, tile.litres) ?? '—'
              }/${perNounOf(unit, unitNoun)}`
            : 'not costed yet'}
        </Note>
        <Note label="Rejected">
          {count(tile.rejectedCases)}
          {tile.reworkedCases > 0 && ` · ${count(tile.reworkedCases)} reworked`}
        </Note>
        <Note label="Crew">
          {[
            tile.supervisor,
            tile.labourCount > 0 ? `${count(tile.labourCount)} labour` : null,
            tile.otherManpowerCount > 0 ? `+${count(tile.otherManpowerCount)}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'not recorded'}
        </Note>
        {tile.ratedRuns > 0 && tile.ratedRuns < tile.runs.length && (
          <span className="col-span-2 truncate text-muted-foreground/70">
            {`${count(tile.ratedRuns)} of ${count(tile.runs.length)} runs carry a rating`}
          </span>
        )}
      </div>
    </button>
  );
}
