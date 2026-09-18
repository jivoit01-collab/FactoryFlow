import { AlertTriangle, Settings2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { clockTime, count, localDateOf, money } from '../../dispatch/utils/format';
import type { BlowingTile } from '../utils/blowingTiles';

/** "4h 20m" — a shift is read in hours, not in 260 minutes. */
function duration(minutes: number): string {
  if (minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function percent(value: number | null, places = 1): string {
  return value == null ? '—' : `${value.toFixed(places)}%`;
}

/** "₹0.61" — per-bottle money is argued about in paise. */
function perBottle(value: number | null): string {
  return value == null ? '—' : `₹${value.toFixed(2)}`;
}

/** How many days later the machine finished than it started. */
function daysLater(from: string | null, to: string | null): number {
  const start = localDateOf(from);
  const end = localDateOf(to);
  if (!start || !end || start === end) return 0;
  const diff = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime();
  return Math.max(0, Math.round(diff / 86_400_000));
}

const STATE_LABEL: Record<string, string> = {
  BREAKDOWN: 'Breakdown',
  RUNNING: 'Running',
  STOPPED: 'Stopped',
  COMPLETED: 'Finished',
  DRAFT: 'Not started',
};

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
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </p>
      <p className={cn('truncate text-2xl font-bold tabular-nums', tone ?? 'text-foreground')}>
        {value}
      </p>
      {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** A heading over one band of the row. */
function Band({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
        {title}
      </p>
      {children}
    </div>
  );
}

/** One line of the readings column: what it is, and what the operator entered. */
function Reading({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="shrink-0 font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/**
 * One measured figure against the target the preform spec carries.
 *
 * Where no target is configured it says so rather than showing the measurement
 * alone under a heading that implies it was judged. On the live data only one
 * preform variant of five carries a cost target and none carries a rejection or
 * electricity target, so a reader has to be able to tell "within target" from
 * "nothing to compare with".
 */
function Variance({
  label,
  actual,
  standard,
  format,
  /** Where the yardstick came from, when it is not the spec's own target. */
  standardNote,
}: {
  label: string;
  actual: number | null;
  standard: number | null;
  format: (value: number) => string;
  standardNote?: string;
}) {
  const judged = actual != null && standard != null;
  // Every blowing target is one a smaller figure beats: rejects, cost, units.
  const good = judged && actual <= standard;

  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="shrink-0 tabular-nums">
        <span
          className={cn(
            'font-semibold',
            judged
              ? good
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
              : 'text-foreground',
          )}
        >
          {actual == null ? '—' : format(actual)}
        </span>
        <span className="text-muted-foreground/60">
          {standard == null
            ? ' · no target'
            : ` · ${standardNote ?? 'target'} ${format(standard)}`}
        </span>
      </span>
    </div>
  );
}

/**
 * One blowing machine, across the full width of the board.
 *
 * A full row rather than a third of one because there are two blowing machines
 * in this plant and rarely more than one running: three tiles across left a row
 * two-thirds empty while the run's own screen carried a page of figures the
 * board did not. The width buys four bands — how it ran, what it drew, what it
 * cost, and how it measured against its targets — which between them are the
 * whole of what the operator entered.
 *
 * Built to answer the same question as a filling line's tile — how well did
 * this machine run today — but graded on what blowing actually configures.
 * There is no rated speed anywhere in the blowing model, so the speed here is
 * stated and not scored; the three things that ARE configured are the preform
 * spec's targets for rejection, conversion cost and electricity.
 *
 * Yield leads because it needs no configuration at all: good bottles over what
 * the counter says the machine made. That is the one efficiency figure every
 * machine can carry whether or not anybody has filled its standards in.
 */
export function BlowingPerformanceTile({
  tile,
  benchmark,
  onOpen,
}: {
  tile: BlowingTile;
  /** The variant's own yield target — what "good" means at this plant. */
  benchmark: number;
  onOpen?: () => void;
}) {
  const alarming = ALARM_STATES.includes(tile.state);
  const broken = tile.state === 'BREAKDOWN';
  const overnight = daysLater(tile.startedAt, tile.endedAt);
  // The spec's own target beats the costing service's industry benchmark, which
  // is the same figure for every SKU; the label says which one is in play.
  const costTarget = tile.standards.costPerBottle ?? tile.benchmarkPerBottle;
  const costTargetNote = tile.standards.costPerBottle == null ? 'benchmark' : 'target';

  const body = (
    <>
      {/* head: which machine, on what, for how long, and how it went */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 truncate text-xl font-bold text-foreground">
            {broken && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />}
            {tile.machineName}
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
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {tile.preform}
            <span className="text-muted-foreground/70">
              {' · '}
              {tile.runs.length > 1
                ? `${count(tile.runs.length)} runs`
                : `run #${tile.lead.runNumber}`}
              {tile.startedAt &&
                ` · ${clockTime(tile.startedAt)}–${tile.endedAt ? clockTime(tile.endedAt) : 'now'}${
                  overnight > 0 ? ` +${overnight}d` : ''
                }`}
            </span>
          </p>
        </div>

        <div className="flex items-baseline gap-5">
          <span className="text-4xl font-bold tabular-nums text-foreground">
            {count(tile.bottles)}
            <span className="ml-2 text-sm font-semibold text-muted-foreground">
              bottles{tile.isLive && ' · live'}
            </span>
          </span>
          <span
            className={cn(
              'text-4xl font-bold tabular-nums',
              tile.yieldPct == null
                ? 'text-foreground'
                : tile.yieldPct >= benchmark
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400',
            )}
          >
            {percent(tile.yieldPct)}
            <span className="ml-2 text-sm font-semibold text-muted-foreground">good</span>
          </span>
        </div>
      </div>

      {/* good against rejected — the one efficiency that needs no config */}
      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
        <div
          className="bg-emerald-500"
          style={{ width: `${((tile.goodBottles / Math.max(tile.bottles, 1)) * 100).toFixed(2)}%` }}
        />
        <div
          className="bg-rose-500"
          style={{ width: `${((tile.rejects / Math.max(tile.bottles, 1)) * 100).toFixed(2)}%` }}
        />
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">
        {count(tile.goodBottles)} good · {count(tile.rejects)} rejected
        {tile.detailLoading && ' · reading the machine’s spells…'}
      </p>

      {/* four bands across the width */}
      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-black/[0.06] pt-3 dark:border-white/5 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <Band title="How it ran">
          <div className="grid grid-cols-4 gap-2">
            <Figure
              label="Speed"
              value={tile.speed != null ? count(tile.speed) : '—'}
              // There is no rated speed in the blowing model to divide this by.
              sub="bottles/hr · unrated"
            />
            <Figure
              label="Running"
              value={duration(tile.runningMinutes)}
              sub={`${percent(tile.utilisationPct, 0)} of ${duration(tile.spanMinutes)}`}
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
              sub={tile.stoppageCount > 0 ? `${count(tile.stoppageCount)} logged` : 'none logged'}
              tone={tile.breakdownMinutes > 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
            />
          </div>
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
          {tile.stoppages.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {tile.stoppages.slice(0, 2).map((stoppage) => (
                <li key={stoppage.label} className="flex items-baseline gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    <span className="font-semibold text-foreground/80">{stoppage.label}</span>
                    {stoppage.count > 1 && ` ×${count(stoppage.count)}`}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                    {duration(stoppage.minutes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Band>

        <Band title="What it drew">
          <div className="space-y-0.5">
            <Reading label="Machine units" value={count(tile.machineUnits)} />
            <Reading label="Utility units" value={count(tile.utilityUnits)} />
            <Reading label="Total units" value={count(tile.totalUnits)} />
            <Reading
              label="Preform"
              value={
                tile.preformBoxes > 0
                  ? `${count(tile.preformBoxes)} boxes`
                  : tile.preformGrams > 0
                    ? '—'
                    : 'not entered'
              }
            />
            {tile.preformGrams > 0 && (
              <Reading label="Preform weight" value={`${count(tile.preformGrams / 1000)} kg`} />
            )}
          </div>
        </Band>

        <Band title="What it cost">
          <div className="space-y-0.5">
            <Reading
              label="Preform"
              value={
                tile.preformCost != null
                  ? `${money(tile.preformCost)} · ${perBottle(tile.preformCostPerBottle)}`
                  : 'not costed yet'
              }
            />
            <Reading
              label="Blowing"
              value={
                tile.blowingCost != null
                  ? `${money(tile.blowingCost)} · ${perBottle(tile.costPerBottle)}`
                  : '—'
              }
            />
            <Reading
              label="Total / bottle"
              value={perBottle(tile.totalCostPerBottle)}
            />
            <Reading
              label="Net cost"
              value={tile.netCost != null ? money(tile.netCost) : 'not costed yet'}
            />
          </div>
        </Band>

        <Band title="Against its targets">
          <div className="space-y-0.5">
            <Variance
              label="Reject"
              actual={tile.rejectPct}
              standard={tile.standards.rejectPct}
              format={(value) => `${value.toFixed(2)}%`}
            />
            <Variance
              label="Blowing cost"
              actual={tile.costPerBottle}
              standard={costTarget}
              standardNote={costTargetNote}
              format={(value) => `₹${value.toFixed(2)}`}
            />
            <Variance
              label="Units"
              actual={tile.unitsPerBottle}
              standard={tile.standards.unitsPerBottle}
              format={(value) => `${value.toFixed(3)}/bottle`}
            />
            <Reading
              label="Crew"
              value={
                [
                  `${count(tile.operators)} operator${tile.operators === 1 ? '' : 's'}`,
                  tile.contractLabour > 0 ? `${count(tile.contractLabour)} contract` : null,
                  tile.ownLabour > 0 ? `${count(tile.ownLabour)} own` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'not recorded'
              }
            />
          </div>
          {tile.standardsSet < 3 && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <Settings2 className="mt-0.5 h-3 w-3 shrink-0" />
              {3 - tile.standardsSet} of 3 targets not set on this preform — configure them to grade
              the run.
            </p>
          )}
        </Band>
      </div>
    </>
  );

  const shell = cn(
    'flex min-w-0 flex-col rounded-2xl border p-4 text-left transition-colors',
    alarming
      ? 'border-rose-500/40 bg-rose-500/[0.07] dark:border-rose-400/30 dark:bg-rose-400/[0.07]'
      : 'border-black/[0.09] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.035]',
  );

  if (!onOpen) {
    return (
      <article className={shell} aria-label={`${tile.machineName} — ${tile.state}`}>
        {body}
      </article>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${tile.machineName} — ${count(tile.bottles)} bottles, open the run`}
      className={cn(
        shell,
        'hover:bg-black/[0.045] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 dark:hover:bg-white/[0.06]',
      )}
    >
      {body}
    </button>
  );
}
