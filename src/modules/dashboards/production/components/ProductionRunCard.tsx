import { AlertTriangle, ExternalLink, Factory, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/shared/utils';

import { WallOverlay } from '../../dispatch/components';
import { clockTime, count, money } from '../../dispatch/utils/format';
import { ratioTone } from '../constants/production-wall.constants';
import type { ProductionRunRow } from '../hooks';
import { type BoardUnit, nounOf, perNounOf, quantityOf, rateOf } from '../utils/boardUnit';

/** "4h 20m" — a shift is read in hours, not in 260 minutes. */
function duration(minutes: number): string {
  if (minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/** A percentage, or a dash where it could not be worked out. */
function percent(value: number | null): string {
  return value == null ? '—' : `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function Stat({
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
    <div className="min-w-0 rounded-xl border border-black/[0.07] bg-black/[0.02] px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.035]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </p>
      <p className={cn('mt-1 truncate text-xl font-bold tabular-nums', tone ?? 'text-foreground')}>
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-black/[0.06] px-5 py-4 dark:border-white/5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          {title}
        </h3>
        {aside && <span className="text-[11px] text-muted-foreground">{aside}</span>}
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/** Produced against a yardstick, drawn to the larger of the two. */
function ProgressBar({
  actual,
  reference,
  tone,
}: {
  actual: number;
  reference: number;
  tone: string;
}) {
  const scale = Math.max(actual, reference, 1);
  return (
    <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
      <div
        className={cn('absolute inset-y-0 left-0 rounded-full', tone)}
        style={{ width: `${(actual / scale) * 100}%` }}
      />
      {/* where the yardstick falls, so a shortfall is visible rather than inferred */}
      <span
        aria-hidden
        className="absolute inset-y-0 w-px bg-foreground/50"
        style={{ left: `${(reference / scale) * 100}%` }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">{children}</dd>
    </div>
  );
}

/**
 * One line, in full — opened from the run list on the wall.
 *
 * The list answers "what is on the lines"; an admin's next question is always
 * "and how well is that one going", which a case count alone cannot answer:
 * 900 cases is excellent from four hours and poor from ten. So the card is
 * built around the three comparisons that make a figure mean something — what
 * the line made against what its rated speed says it should have, what it made
 * against what the run was opened for, and how much of its time it spent
 * running rather than stopped — and then shows the segments and stoppages those
 * comparisons came out of, so a bad number can be traced to the hour it
 * happened in without leaving the board.
 *
 * Every figure here is already on the board's own data. Opening a line fires no
 * request: the card cannot spin, fail, or disagree with the row behind it.
 *
 * It is resolved from the LIVE row list rather than from a snapshot taken on
 * click, so a run that finishes while somebody is reading it keeps ticking over
 * to its closing figures instead of freezing at whatever was on screen.
 */
export function ProductionRunCard({
  run,
  unitNoun,
  unit = 'cases',
  /** The variant's own OEE target — what "good" means at this plant. */
  benchmark,
  onClose,
}: {
  /** Null once the run has dropped off the shown day while the card was open. */
  run: ProductionRunRow | null;
  unitNoun: string;
  /** Cases or litres — follows whatever the board that opened this is on. */
  unit?: BoardUnit;
  benchmark: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const titleId = 'production-run-card-title';

  if (!run) {
    return (
      <WallOverlay onClose={onClose} labelledBy={titleId}>
        <div className="rounded-2xl border border-black/[0.09] bg-background p-6 text-center shadow-2xl dark:border-white/10">
          <Factory className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 id={titleId} className="mt-3 text-base font-bold text-foreground">
            This run has left the board
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            It is no longer among the runs for the day being shown.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg border border-black/[0.12] bg-black/[0.04] px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-black/[0.08] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </WallOverlay>
    );
  }

  const m = run.metrics;
  const onTheLine = m.runningMinutes + m.breakdownMinutes;
  const inLitres = unit === 'litres';
  const noun = nounOf(unit, unitNoun);
  const output = quantityOf(unit, m.producedCases, m.producedLitres, unitNoun);
  const made = (inLitres ? m.producedLitres : m.producedCases) ?? 0;
  const expected = inLitres ? m.expectedLitres : m.expectedCases;
  const target = inLitres ? m.targetLitres : m.targetCases;
  /** A case figure in whatever the card is counting in; null with no volume. */
  const inUnit = (cases: number) =>
    inLitres ? (m.litresPerCase == null ? null : Math.round(cases * m.litresPerCase)) : cases;
  const netCost = run.cost ? Number(run.cost.net_cost) : null;
  const costedCases = run.cost ? Number(run.cost.produced_qty) : 0;

  return (
    <WallOverlay onClose={onClose} labelledBy={titleId} width="max-w-3xl">
      <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-black/[0.09] bg-background shadow-2xl dark:border-white/10">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-black/[0.06] px-5 py-4 dark:border-white/5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              Run #{run.runNumber}
            </p>
            <h2 id={titleId} className="mt-1 truncate text-xl font-bold text-foreground">
              {run.line}
            </h2>
            <p className="mt-1 truncate text-xs text-muted-foreground" title={run.product}>
              {run.product}
              {run.itemCode && <span className="text-muted-foreground/60"> · {run.itemCode}</span>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                run.tone.cls,
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', run.tone.dot)} />
              {run.tone.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-black/[0.06] hover:text-foreground dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="wall-scroll min-h-0 flex-1 overflow-y-auto">
          {run.detailLoading && (
            <p className="bg-amber-500/10 px-5 py-2 text-[11px] text-amber-700 dark:text-amber-300">
              Reading the run's segments — the figures below are its stored totals until they
              arrive.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5 px-5 py-4 sm:grid-cols-4">
            <Stat
              label="Produced"
              value={output.text}
              sub={
                m.isLive
                  ? `${output.noun ?? 'no volume in SAP'} · still climbing`
                  : m.basis === 'closing'
                    ? `${output.noun ?? 'no volume in SAP'} · as the run was closed`
                    : (output.noun ?? 'no volume in SAP')
              }
            />
            <Stat
              label="Efficiency"
              value={percent(m.efficiencyPct)}
              sub={
                m.efficiencyPct != null
                  ? `of ${count(expected ?? 0)} ${noun} expected`
                  : m.piecesPerCase == null
                    ? 'bottles per case unknown'
                    : m.ratedSpeed == null
                      ? 'no rated speed on the run'
                      : 'nothing has run yet'
              }
              tone={ratioTone(m.efficiencyPct, benchmark)}
            />
            <Stat
              label="Speed"
              value={m.actualSpeed != null ? count(m.actualSpeed) : '—'}
              sub={
                m.ratedSpeed != null
                  ? `bottles/hr · rated ${count(m.ratedSpeed)}`
                  : 'bottles/hr · unrated line'
              }
              tone={ratioTone(m.efficiencyPct, benchmark)}
            />
            <Stat
              label="Ran for"
              value={duration(m.runningMinutes)}
              sub={
                m.breakdownMinutes > 0
                  ? `${duration(m.breakdownMinutes)} stopped`
                  : 'no stoppage logged'
              }
            />
          </div>

          <Section
            title="Against the rated speed"
            aside={
              m.ratedSpeed != null && m.piecesPerCase != null
                ? `${count(m.ratedSpeed)} bottles/hr · ${m.piecesPerCase} per ${unitNoun}`
                : undefined
            }
          >
            {expected != null ? (
              <>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground">
                    {output.text} {output.noun} made
                  </span>
                  <span className="text-muted-foreground">
                    {count(expected)} expected in {duration(m.runningMinutes)}
                  </span>
                </div>
                <ProgressBar
                  actual={made}
                  reference={expected}
                  tone={
                    (m.efficiencyPct ?? 0) >= benchmark
                      ? 'bg-emerald-500'
                      : (m.efficiencyPct ?? 0) >= benchmark * 0.8
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {made >= expected
                    ? `${count(made - expected)} ${noun} ahead of the rating.`
                    : `${count(expected - made)} ${noun} short of the rating.`}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {m.piecesPerCase == null
                  ? 'SAP holds no bottles-per-case for this SKU, so cases and a bottles/hr rating cannot be compared. Efficiency is left blank rather than computed against a guess.'
                  : m.ratedSpeed == null
                    ? 'The run carries no rated speed, so there is nothing to measure the output against.'
                    : 'The line has not run yet, so there is no time to expect output over.'}
              </p>
            )}
          </Section>

          {target != null && (
            <Section title="Against the run's target" aside={percent(m.targetPct)}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-foreground">
                  {output.text} {output.noun} made
                </span>
                <span className="text-muted-foreground">
                  {count(target)} {noun} asked for
                </span>
              </div>
              <ProgressBar
                actual={made}
                reference={target}
                tone={(m.targetPct ?? 0) >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}
              />
            </Section>
          )}

          <Section
            title="Time on the line"
            aside={onTheLine > 0 ? `${percent(m.utilisationPct)} producing` : undefined}
          >
            {onTheLine > 0 ? (
              <>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${(m.runningMinutes / onTheLine) * 100}%` }}
                  />
                  <div
                    className="bg-rose-500"
                    style={{ width: `${(m.breakdownMinutes / onTheLine) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    running {duration(m.runningMinutes)}
                  </span>
                  <span>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
                    stopped {duration(m.breakdownMinutes)}
                  </span>
                  {(m.rejectedCases > 0 || m.reworkedCases > 0) && (
                    <span>
                      {count(m.rejectedCases)} rejected · {count(m.reworkedCases)} reworked
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                No segment has been opened on this run yet.
              </p>
            )}
          </Section>

          <Section
            title="What it cost"
            aside={run.cost ? `${count(costedCases)} ${unitNoun}s costed` : undefined}
          >
            {run.cost && netCost != null ? (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Net cost">{money(netCost)}</Field>
                <Field label={`Per ${perNounOf(unit, unitNoun)}`}>
                  {rateOf(unit, netCost, costedCases, inUnit(costedCases)) ?? '—'}
                </Field>
                <Field label="Material">{money(Number(run.cost.raw_material_cost))}</Field>
              </dl>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                This run has not been costed yet — there is no rate to state.
              </p>
            )}
          </Section>

          <Section title="Who was on it">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Supervisor">{run.supervisor || '—'}</Field>
              <Field label="Operators">{run.operators || '—'}</Field>
              <Field label="Labour">{count(run.labourCount)}</Field>
              <Field label="Other manpower">{count(run.otherManpowerCount)}</Field>
            </dl>
          </Section>

          {/* The two output figures a run carries, where they disagree. Said
              plainly rather than quietly reconciled: the gap is nearly always
              spells nobody booked output against, and that is worth knowing. */}
          {m.basis === 'closing' && m.segmentCases !== m.closingCases && (
            <Section title="What the segments book">
              <p className="text-[11px] text-muted-foreground">
                The spells below book{' '}
                <span className="font-semibold text-foreground">
                  {count(inUnit(m.segmentCases) ?? m.segmentCases)} {noun}
                </span>{' '}
                between them, against the{' '}
                <span className="font-semibold text-foreground">
                  {count(inUnit(m.closingCases) ?? m.closingCases)}
                </span>{' '}
                this run was closed at
                {run.segments.some((segment) => !Number(segment.produced_cases)) &&
                  ` — ${count(
                    run.segments.filter((segment) => !Number(segment.produced_cases)).length,
                  )} of them booked none`}
                . The closing figure is the one shown above and the one the run
                register, the yield report and SAP are reconciled against.
              </p>
            </Section>
          )}

          <Section title="Spells of running" aside={`${count(run.segments.length)} segments`}>
            {run.segments.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Nothing has been logged against this run yet.
              </p>
            ) : (
              <ul className="divide-y divide-black/[0.06] dark:divide-white/5">
                {run.segments.map((segment) => (
                  <li
                    key={segment.id}
                    className="flex items-center justify-between gap-3 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate tabular-nums text-foreground">
                      {clockTime(segment.start_time)} →{' '}
                      {segment.end_time ? (
                        clockTime(segment.end_time)
                      ) : (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          running
                        </span>
                      )}
                      {segment.remarks && (
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {segment.remarks}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold text-foreground">
                      {(() => {
                        const qty = inUnit(Number(segment.produced_cases) || 0);
                        return qty == null ? '—' : count(qty);
                      })()}{' '}
                      <span className="text-[11px] font-normal text-muted-foreground">{noun}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="What stopped it"
            aside={
              run.breakdowns.length > 0 ? `${count(run.breakdowns.length)} stoppages` : undefined
            }
          >
            {run.breakdowns.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No breakdown was logged on this run.
              </p>
            ) : (
              <ul className="divide-y divide-black/[0.06] dark:divide-white/5">
                {run.breakdowns.map((breakdown) => (
                  <li key={breakdown.id} className="flex items-start justify-between gap-3 py-1.5">
                    <span className="min-w-0">
                      {/* The reason leads, because it is the half that says
                          anything: every stoppage on record carries one, while
                          the category only ever takes five coarse values. */}
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        {breakdown.is_active && (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                        )}
                        <span className="truncate">
                          {breakdown.reason || breakdown.breakdown_category_name || 'Stoppage'}
                        </span>
                        {breakdown.is_unrecovered && (
                          <span className="shrink-0 rounded-full border border-rose-600/30 px-1.5 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:border-rose-400/30 dark:text-rose-300">
                            never made up
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {clockTime(breakdown.start_time)}
                        {breakdown.end_time ? ` – ${clockTime(breakdown.end_time)}` : ''}
                        {breakdown.breakdown_category_name
                          ? ` · ${breakdown.breakdown_category_name}`
                          : ''}
                        {breakdown.machine_name ? ` · ${breakdown.machine_name}` : ''}
                        {breakdown.remarks ? ` · ${breakdown.remarks}` : ''}
                        {breakdown.maintenance_work_order_no
                          ? ` · WO ${breakdown.maintenance_work_order_no}`
                          : ''}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-sm font-semibold text-rose-600 dark:text-rose-400">
                      {breakdown.end_time ? duration(breakdown.breakdown_minutes) : 'open'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.06] px-5 py-3 dark:border-white/5">
          <p className="text-[11px] text-muted-foreground">
            Everything on this card is on the board already — nothing was fetched to open it.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/production/execution/runs/${run.id}`)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-black/[0.12] bg-black/[0.04] px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-black/[0.08] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Open the run
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </footer>
      </div>
    </WallOverlay>
  );
}
