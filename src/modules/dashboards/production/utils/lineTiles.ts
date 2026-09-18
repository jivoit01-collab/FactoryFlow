/**
 * The day's runs, folded into one tile per line that RAN.
 *
 * The board's shape is the day's own: five lines carrying runs on 17 September
 * give five tiles, and a line the plant did not touch that day has no tile at
 * all. That is deliberate — every tile on this board is a line somebody has to
 * answer for, and padding it out with lines nothing was planned on would push
 * the ones that matter off the screen.
 *
 * Pure, so the arithmetic that decides which line looks bad can be tested
 * without a server behind it — the same split Production Control keeps between
 * its `buildLineBoard` and the hook that feeds it.
 *
 * A line usually carries several runs in a day, and the fold is where the two
 * dangerous roll-ups live:
 *
 *  - **State is worst-wins.** A line with one run broken down and another
 *    running is a broken line. BREAKDOWN > RUNNING > STOPPED > COMPLETED >
 *    DRAFT is severity order, not lifecycle order.
 *  - **Efficiency is only summed over the runs that HAVE a rating.** Dividing
 *    every run's output by the expectation of some of them would price a rated
 *    run's shortfall against an unrated run's output and quietly flatter, or
 *    damn, the line.
 */

import type { LiveStatus, MachineBreakdown } from '@/modules/production/execution/types';

import type { ProductionRunRow } from '../hooks/runRow';
import type { LineConfigIndex } from './lineStandards';
import { addStoppage, rankStoppages, type Stoppage } from './stoppages';

/** A line's stoppages are folded exactly like a blowing machine's. */
export type LineStoppage = Stoppage;

export interface LineTile {
  lineId: number;
  lineName: string;
  /** The worst state across the line's runs on the day. */
  state: LiveStatus;
  /** The line's runs, worst state first. */
  runs: ProductionRunRow[];
  /** The run the tile's headline reads from — the worst-state one. */
  lead: ProductionRunRow;
  product: string;
  itemCode: string;
  /** When the line first started producing, from its earliest segment. */
  startedAt: string | null;
  /**
   * When it last stopped producing, from its latest closed segment.
   *
   * Null while a segment is still open — a line that is running has no finish
   * time yet, and stamping one from the last closed spell would put a finished
   * time on a line the reader can see is still going.
   */
  endedAt: string | null;
  /** Cases across every run on the line that day. */
  cases: number;
  /**
   * The same output in litres, or null where the line ran a SKU SAP holds no
   * volume for.
   *
   * Null rather than a partial sum: a line that ran one volumed SKU and one
   * weight-packed pouch has no honest litre total, and showing the half that
   * converts under the line's name would understate it silently.
   */
  litres: number | null;
  expectedLitres: number | null;
  targetLitres: number | null;
  /** Litres an hour achieved, and what the rating works out to in litres. */
  actualLitresPerHour: number | null;
  ratedLitresPerHour: number | null;
  /** A segment is open somewhere on the line — the figures are still climbing. */
  isLive: boolean;
  runningMinutes: number;
  breakdownMinutes: number;
  /**
   * First spell to last — the whole stretch of clock the line was on, whether
   * or not it was producing for any of it. To `now` while it is still running.
   */
  spanMinutes: number;
  /**
   * Of that stretch, the time the line was neither producing nor in a logged
   * breakdown: the gaps between spells.
   *
   * Worth its own figure because it is the half of lost output nobody is
   * accountable for. A breakdown has a cause and a category; idle time has
   * only a gap in the register — the changeover, the wait for material, the
   * shift that started late — and on 2026-09-17 it was the larger of the two
   * on every line.
   */
  idleMinutes: number;
  /**
   * Running as a share of the whole stretch the line was on — NOT of running
   * plus breakdown. Measured that way a line that sat idle for fifteen hours
   * and never logged a stoppage read as 100% utilised, which is the opposite
   * of what the figure is for.
   */
  utilisationPct: number | null;
  /**
   * What the rated speed says the line should have made in the time it ran,
   * summed over the runs that carry a rating.
   */
  expectedCases: number | null;
  /** Produced ÷ expected over those same runs. */
  efficiencyPct: number | null;
  /** How many of the line's runs carried a rating at all. */
  ratedRuns: number;
  /** Bottles/hr across the line's runs; null when any of them lacks a pack size. */
  actualSpeed: number | null;
  /** The lead run's rating — its own snapshot, or the line's configuration. */
  ratedSpeed: number | null;
  /** Which of the two that rating came from. */
  ratedFrom: 'run' | 'config' | null;
  targetCases: number | null;
  targetPct: number | null;
  rejectedCases: number;
  reworkedCases: number;
  netCost: number | null;
  costedCases: number;
  /** Crew on the lead run. */
  supervisor: string;
  operators: string;
  labourCount: number;
  otherManpowerCount: number;
  /** The stoppage still open on the line, where there is one. */
  openBreakdown: MachineBreakdown | null;
  /**
   * What stopped the line that day, grouped by cause and worst first.
   *
   * Grouped rather than listed: a line stopped four times for capping has one
   * problem, not four, and the tile has room to name the problem but not the
   * four occurrences. The run card underneath lists them one by one.
   */
  stoppages: LineStoppage[];
  /** How many stoppages were logged on the line, across every cause. */
  stoppageCount: number;
  /** How many presets the line is configured with. */
  configCount: number;
  /** Any of the line's runs is still waiting on its detail. */
  detailLoading: boolean;
}

export interface LineTileBoard {
  tiles: LineTile[];
  /** Lines that ran at all on the day — the number of tiles. */
  lines: number;
  running: number;
  /** Lines stopped or broken down — output the plant is not making. */
  down: number;
  finished: number;
  cases: number;
  runningMinutes: number;
  breakdownMinutes: number;
  /** Time the lines were on but not producing, across the plant. */
  idleMinutes: number;
  /** The day's output in litres; null where any line ran a SKU with no volume. */
  litres: number | null;
  /** Stoppages logged across every line on the day. */
  stoppageCount: number;
  /**
   * The day's stoppages across every line, by cause and worst first.
   *
   * Folded from the runs a second time rather than by merging the tiles' own
   * lists, so a cause that stopped three lines is one row carrying all three
   * rather than three rows the reader has to add up.
   */
  stoppages: LineStoppage[];
  /** Of the stopped minutes, the ones logged as never made up. */
  unrecoveredMinutes: number;
  /** Across every line, over the runs that carry a rating. */
  efficiencyPct: number | null;
}

/** Severity order — index 0 is what a supervisor must see first. */
const SEVERITY: LiveStatus[] = ['BREAKDOWN', 'RUNNING', 'STOPPED', 'COMPLETED', 'DRAFT'];

function severityOf(state: LiveStatus): number {
  const index = SEVERITY.indexOf(state);
  // An unrecognised state sorts last rather than first, so a future status
  // never silently outranks a live breakdown.
  return index === -1 ? SEVERITY.length : index;
}

const num = (value: string | number | null | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const pct = (part: number, whole: number): number | null =>
  whole > 0 ? Number(((part / whole) * 100).toFixed(1)) : null;

/** Whole minutes since a stamp, never negative. */
function minutesSince(iso: string, now: number): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now - then) / 60_000));
}

/** Whole minutes between two stamps (or a stamp and a clock), never negative. */
function minutesBetween(from: string, to: string | number): number {
  const start = new Date(from).getTime();
  const end = typeof to === 'number' ? to : new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 60_000));
}

export function buildLineTiles({
  rows,
  configs,
  now = Date.now(),
}: {
  rows: readonly ProductionRunRow[];
  configs: LineConfigIndex;
  /** The clock an unfinished stoppage is measured against. */
  now?: number;
}): LineTileBoard {
  const byLine = new Map<number, ProductionRunRow[]>();
  for (const row of rows) {
    const existing = byLine.get(row.lineId);
    if (existing) existing.push(row);
    else byLine.set(row.lineId, [row]);
  }

  const tiles: LineTile[] = [...byLine.entries()].map(([lineId, lineRuns]) => {
    const ordered = [...lineRuns].sort(
      (a, b) => severityOf(a.liveStatus) - severityOf(b.liveStatus) || b.runNumber - a.runNumber,
    );
    const lead = ordered[0];

    let cases = 0;
    let runningMinutes = 0;
    let breakdownMinutes = 0;
    let expectedCases = 0;
    let ratedCases = 0;
    let ratedRuns = 0;
    let bottles = 0;
    let bottlesKnown = true;
    let target = 0;
    let rejected = 0;
    let reworked = 0;
    let netCost = 0;
    let costedCases = 0;
    let costedRuns = 0;
    let isLive = false;
    let detailLoading = false;
    let startedAt: string | null = null;
    let endedAt: string | null = null;
    let stillOpen = false;
    let litres = 0;
    let expectedLitres = 0;
    let targetLitres = 0;
    let volumeKnown = true;
    let openBreakdown: MachineBreakdown | null = null;
    let stoppageCount = 0;
    const byCause = new Map<string, LineStoppage>();

    for (const row of ordered) {
      const m = row.metrics;
      cases += m.producedCases;
      runningMinutes += m.runningMinutes;
      breakdownMinutes += m.breakdownMinutes;
      rejected += m.rejectedCases;
      reworked += m.reworkedCases;
      if (m.isLive) isLive = true;
      if (row.detailLoading) detailLoading = true;

      if (m.expectedCases != null) {
        expectedCases += m.expectedCases;
        ratedCases += m.producedCases;
        ratedRuns += 1;
      }

      // One unresolved pack size poisons the whole line's bottle count, so the
      // speed is withheld rather than reported over a partial total.
      if (m.piecesPerCase == null) bottlesKnown = false;
      else bottles += m.producedCases * m.piecesPerCase;

      if (m.targetCases != null) target += m.targetCases;

      if (row.cost) {
        netCost += num(row.cost.net_cost);
        costedCases += num(row.cost.produced_qty);
        costedRuns += 1;
      }

      // A line's day runs from its first spell to its last. An open spell means
      // it has not finished, whatever its closed spells say.
      for (const segment of row.segments) {
        if (startedAt == null || segment.start_time < startedAt) startedAt = segment.start_time;
        if (!segment.end_time) stillOpen = true;
        else if (endedAt == null || segment.end_time > endedAt) endedAt = segment.end_time;
      }

      // One SKU with no volume in the item master leaves the whole line's litres
      // unstatable — see the field's note.
      if (m.litresPerCase == null) volumeKnown = false;
      else {
        litres += m.producedLitres ?? 0;
        expectedLitres += m.expectedLitres ?? 0;
        targetLitres += m.targetLitres ?? 0;
      }
      if (!openBreakdown) {
        openBreakdown = row.breakdowns.find((b) => b.is_active && !b.end_time) ?? null;
      }
      for (const breakdown of row.breakdowns) {
        stoppageCount += 1;
        addStoppage(byCause, breakdown, lead.line, now);
      }
    }

    // The line's own window: its first spell to its last, or to now while it
    // is still going. Never shorter than what it actually ran, so a clock skew
    // on the floor cannot produce negative idle time.
    const spanMinutes = Math.max(
      startedAt ? minutesBetween(startedAt, stillOpen || !endedAt ? now : endedAt) : 0,
      runningMinutes + breakdownMinutes,
    );
    const idleMinutes = Math.max(0, spanMinutes - runningMinutes - breakdownMinutes);

    return {
      lineId,
      lineName: lead.line,
      state: lead.liveStatus,
      runs: ordered,
      lead,
      product: lead.product,
      itemCode: lead.itemCode,
      startedAt,
      endedAt: stillOpen ? null : endedAt,
      cases,
      litres: volumeKnown ? litres : null,
      expectedLitres: volumeKnown && ratedRuns > 0 ? expectedLitres : null,
      targetLitres: volumeKnown && target > 0 ? targetLitres : null,
      actualLitresPerHour:
        volumeKnown && runningMinutes > 0 ? Math.round((litres / runningMinutes) * 60) : null,
      // The lead run's rating, in the litres that rating would pour.
      ratedLitresPerHour:
        lead.metrics.ratedSpeed != null && lead.metrics.litresPerPiece != null
          ? Math.round(lead.metrics.ratedSpeed * lead.metrics.litresPerPiece)
          : null,
      isLive,
      runningMinutes,
      breakdownMinutes,
      spanMinutes,
      idleMinutes,
      utilisationPct: pct(runningMinutes, spanMinutes),
      expectedCases: ratedRuns > 0 ? expectedCases : null,
      efficiencyPct: expectedCases > 0 ? pct(ratedCases, expectedCases) : null,
      ratedRuns,
      actualSpeed:
        bottlesKnown && runningMinutes > 0 ? Math.round((bottles / runningMinutes) * 60) : null,
      ratedSpeed: lead.metrics.ratedSpeed,
      ratedFrom: lead.metrics.ratedFrom,
      targetCases: target > 0 ? target : null,
      targetPct: target > 0 ? pct(cases, target) : null,
      rejectedCases: rejected,
      reworkedCases: reworked,
      netCost: costedRuns > 0 ? netCost : null,
      costedCases,
      supervisor: lead.supervisor,
      operators: lead.operators,
      labourCount: lead.labourCount,
      otherManpowerCount: lead.otherManpowerCount,
      openBreakdown,
      stoppages: rankStoppages(byCause),
      stoppageCount,
      configCount: (configs.get(lineId) ?? []).length,
      detailLoading,
    };
  });

  tiles.sort(
    (a, b) => severityOf(a.state) - severityOf(b.state) || a.lineName.localeCompare(b.lineName),
  );

  // The plant's own efficiency, weighted by expectation rather than averaged
  // across tiles: a line that ran ten minutes must not count as much as one
  // that ran all shift.
  let plantExpected = 0;
  let plantProduced = 0;
  for (const tile of tiles) {
    if (tile.expectedCases == null || tile.efficiencyPct == null) continue;
    plantExpected += tile.expectedCases;
    plantProduced += (tile.efficiencyPct / 100) * tile.expectedCases;
  }

  const count = (state: LiveStatus) => tiles.filter((tile) => tile.state === state).length;

  const plantCauses = new Map<string, LineStoppage>();
  let unrecoveredMinutes = 0;
  for (const row of rows) {
    const lineName = row.line;
    for (const breakdown of row.breakdowns) {
      addStoppage(plantCauses, breakdown, lineName, now);
      if (breakdown.is_unrecovered) {
        unrecoveredMinutes += breakdown.end_time
          ? num(breakdown.breakdown_minutes)
          : minutesSince(breakdown.start_time, now);
      }
    }
  }

  return {
    tiles,
    lines: tiles.length,
    running: count('RUNNING'),
    down: count('BREAKDOWN') + count('STOPPED'),
    finished: count('COMPLETED'),
    cases: tiles.reduce((sum, tile) => sum + tile.cases, 0),
    litres: tiles.some((tile) => tile.litres == null)
      ? null
      : tiles.reduce((sum, tile) => sum + (tile.litres ?? 0), 0),
    runningMinutes: tiles.reduce((sum, tile) => sum + tile.runningMinutes, 0),
    breakdownMinutes: tiles.reduce((sum, tile) => sum + tile.breakdownMinutes, 0),
    idleMinutes: tiles.reduce((sum, tile) => sum + tile.idleMinutes, 0),
    stoppageCount: tiles.reduce((sum, tile) => sum + tile.stoppageCount, 0),
    stoppages: rankStoppages(plantCauses),
    unrecoveredMinutes,
    efficiencyPct: plantExpected > 0 ? pct(plantProduced, plantExpected) : null,
  };
}
