/**
 * The day's blowing runs, folded into one tile per machine that RAN.
 *
 * The same board as the filling lines, asked of the machines that make the
 * bottles those lines fill — and deliberately NOT the same metrics, because
 * blowing is judged on different things and the data supports different things:
 *
 *  - **There is no rated speed anywhere in the blowing model.** A filling line
 *    carries `rated_speed` in bottles/hr and a line preset behind it; a blowing
 *    machine carries neither, and `BlowingMachine.heads` — the one field that
 *    could imply a rate — is null on both machines on record. So a blowing tile
 *    states the speed it achieved and says plainly that there is nothing
 *    configured to judge it against, rather than inventing a denominator.
 *  - **What IS configured are the three standards on the preform spec**:
 *    target rejection %, target blowing cost per bottle, and target electricity
 *    units per bottle. Those are the variances this board grades, each shown
 *    only where somebody has filled it in.
 *  - **Yield is the always-computable efficiency.** Good bottles over the
 *    counter's own total needs no configuration at all, so it is the headline
 *    figure every tile can carry.
 */

import type {
  BlowingRun,
  BlowingRunCost,
  BlowingRunDetail,
  PreformSpec,
} from '@/modules/production/blowing/types';
import type { LiveStatus } from '@/modules/production/execution/types';

import { addStoppage, rankStoppages, type Stoppage, stoppageMinutes } from './stoppages';

/** The three targets a preform spec can carry, as the board reads them. */
export interface BlowingStandards {
  /** Target rejection %, where configured. */
  rejectPct: number | null;
  /** Target blowing (conversion) cost per bottle — excludes the preform. */
  costPerBottle: number | null;
  /** Target electricity units per bottle. */
  unitsPerBottle: number | null;
}

export interface BlowingTile {
  machineId: number;
  machineName: string;
  /** The worst state across the machine's runs on the day. */
  state: LiveStatus;
  runs: BlowingRunRow[];
  lead: BlowingRunRow;
  /** "Frystal 40g" — what was being blown. */
  preform: string;
  startedAt: string | null;
  endedAt: string | null;
  /** Bottles off the counter, across every run on the machine. */
  bottles: number;
  rejects: number;
  /** Rejects as a share of the counter. */
  rejectPct: number | null;
  /** Good bottles as a share of the counter — the efficiency every tile has. */
  yieldPct: number | null;
  isLive: boolean;
  spanMinutes: number;
  runningMinutes: number;
  idleMinutes: number;
  breakdownMinutes: number;
  utilisationPct: number | null;
  /** Bottles an hour achieved. Null without a clock to divide by. */
  speed: number | null;
  /** Electricity units per bottle. */
  unitsPerBottle: number | null;
  /** The two metered buckets behind it, and their total. */
  machineUnits: number;
  utilityUnits: number;
  totalUnits: number;
  /** Preform drawn: boxes off the store, and what they weigh. */
  preformBoxes: number;
  preformGrams: number;
  /** Good bottles — the counter less its rejects. */
  goodBottles: number;
  /** Conversion cost per bottle — what the standard grades. */
  costPerBottle: number | null;
  /** The bought-in preform, per bottle and in total. */
  preformCost: number | null;
  preformCostPerBottle: number | null;
  /** Conversion cost in total, and the two sides added up. */
  blowingCost: number | null;
  totalCostPerBottle: number | null;
  /**
   * The industry benchmark the costing service stamps on the run.
   *
   * A second yardstick to the preform spec's own target and a weaker one — it
   * is the same figure for every SKU — so it is only ever shown where the spec
   * carries no target of its own, and named differently when it is.
   */
  benchmarkPerBottle: number | null;
  /** Everything the run was costed at, preform included. */
  netCost: number | null;
  /** The targets from the preform spec, where they are set. */
  standards: BlowingStandards;
  /** How many of the three standards the spec actually carries. */
  standardsSet: number;
  operators: number;
  contractLabour: number;
  ownLabour: number;
  labour: number;
  stoppages: Stoppage[];
  stoppageCount: number;
  detailLoading: boolean;
}

/** One blowing run, as the tile reads it. */
export interface BlowingRunRow {
  id: number;
  runNumber: number;
  machineId: number;
  machineName: string;
  preform: string;
  preformSpecId: number;
  state: LiveStatus;
  bottles: number;
  rejects: number;
  runningMinutes: number;
  breakdownMinutes: number;
  isLive: boolean;
  units: number;
  machineUnits: number;
  utilityUnits: number;
  preformBoxes: number;
  preformGrams: number;
  costPerBottle: number | null;
  preformCost: number | null;
  preformCostPerBottle: number | null;
  blowingCost: number | null;
  totalCostPerBottle: number | null;
  benchmarkPerBottle: number | null;
  netCost: number | null;
  detail: BlowingRunDetail | undefined;
  detailLoading: boolean;
}

export interface BlowingBoard {
  tiles: BlowingTile[];
  /** Machines that ran at all — the number of tiles. */
  machines: number;
  running: number;
  down: number;
  finished: number;
  bottles: number;
  rejects: number;
  rejectPct: number | null;
  yieldPct: number | null;
  runningMinutes: number;
  idleMinutes: number;
  breakdownMinutes: number;
  stoppageCount: number;
  stoppages: Stoppage[];
  unrecoveredMinutes: number;
}

/** Severity order — index 0 is what a supervisor must see first. */
const SEVERITY: LiveStatus[] = ['BREAKDOWN', 'RUNNING', 'STOPPED', 'COMPLETED', 'DRAFT'];

function severityOf(state: LiveStatus): number {
  const index = SEVERITY.indexOf(state);
  return index === -1 ? SEVERITY.length : index;
}

const num = (value: number | string | null | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const numOrNull = (value: number | string | null | undefined): number | null => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const pct = (part: number, whole: number): number | null =>
  whole > 0 ? Number(((part / whole) * 100).toFixed(2)) : null;

function minutesBetween(from: string, to: string | number): number {
  const start = new Date(from).getTime();
  const end = typeof to === 'number' ? to : new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 60_000));
}

/** The targets on a preform spec, or all nulls where it carries none. */
export function standardsOf(spec: PreformSpec | undefined): BlowingStandards {
  return {
    rejectPct: numOrNull(spec?.std_reject_pct),
    costPerBottle: numOrNull(spec?.std_make_cost_per_bottle),
    unitsPerBottle: numOrNull(spec?.std_units_per_bottle),
  };
}

export function toBlowingRow({
  run,
  detail,
  cost,
  now,
  detailLoading,
}: {
  run: BlowingRun;
  detail: BlowingRunDetail | undefined;
  cost: BlowingRunCost | undefined;
  now: number;
  detailLoading: boolean;
}): BlowingRunRow {
  const segments = detail?.segments ?? [];
  const breakdowns = detail?.breakdowns ?? [];

  let runningMinutes = 0;
  let isLive = false;
  for (const segment of segments) {
    if (segment.end_time) runningMinutes += minutesBetween(segment.start_time, segment.end_time);
    else if (segment.is_active) {
      runningMinutes += minutesBetween(segment.start_time, now);
      isLive = true;
    }
  }
  // Until the detail arrives, the run's own stored total is all there is.
  if (segments.length === 0) runningMinutes = num(detail?.total_running_minutes);

  let breakdownMinutes = 0;
  for (const breakdown of breakdowns) breakdownMinutes += stoppageMinutes(breakdown, now);

  return {
    id: run.id,
    runNumber: run.run_number,
    machineId: run.machine,
    machineName: run.machine_name || `Machine ${run.machine}`,
    preform: `${run.preform_make} ${num(run.preform_gram)}g`,
    preformSpecId: run.preform_spec,
    state: run.live_status,
    // The counter is the machine's own tally and the only output figure a
    // blowing run carries — there is no closing-figure/segment split here.
    bottles: num(run.total_counter_production),
    rejects: num(run.rejection_pcs),
    runningMinutes,
    breakdownMinutes,
    isLive,
    units: num(detail?.total_units ?? run.total_units),
    machineUnits: num(detail?.machine_units),
    utilityUnits: num(detail?.utility_units),
    preformBoxes: num(detail?.preform_boxes_used ?? run.preform_boxes_used),
    preformGrams: num(detail?.preform_used_g ?? run.preform_used_g),
    // The conversion cost is what the preform spec's standard grades; the
    // preform itself is bought in and says nothing about how the machine ran.
    costPerBottle: numOrNull(cost?.blowing_cost_per_bottle),
    preformCost: numOrNull(cost?.preform_cost),
    preformCostPerBottle: numOrNull(cost?.preform_cost_per_bottle),
    blowingCost: numOrNull(cost?.blowing_cost),
    totalCostPerBottle: numOrNull(cost?.total_per_bottle_cost ?? run.per_bottle_cost),
    benchmarkPerBottle: numOrNull(cost?.benchmark_blowing_per_bottle),
    netCost: numOrNull(cost?.net_cost ?? run.net_cost),
    detail,
    detailLoading,
  };
}

export function buildBlowingTiles({
  rows,
  specs,
  now = Date.now(),
}: {
  rows: readonly BlowingRunRow[];
  /** The preform specs, by id — where the standards live. */
  specs: Map<number, PreformSpec>;
  now?: number;
}): BlowingBoard {
  const byMachine = new Map<number, BlowingRunRow[]>();
  for (const row of rows) {
    const existing = byMachine.get(row.machineId);
    if (existing) existing.push(row);
    else byMachine.set(row.machineId, [row]);
  }

  const tiles: BlowingTile[] = [...byMachine.entries()].map(([machineId, machineRuns]) => {
    const ordered = [...machineRuns].sort(
      (a, b) => severityOf(a.state) - severityOf(b.state) || b.runNumber - a.runNumber,
    );
    const lead = ordered[0];

    let bottles = 0;
    let rejects = 0;
    let runningMinutes = 0;
    let breakdownMinutes = 0;
    let units = 0;
    let machineUnits = 0;
    let utilityUnits = 0;
    let preformBoxes = 0;
    let preformGrams = 0;
    let preformCost = 0;
    let blowingCost = 0;
    let totalWeighted = 0;
    let preformWeighted = 0;
    let benchmark: number | null = null;
    let netCost = 0;
    let costedBottles = 0;
    let costWeighted = 0;
    let isLive = false;
    let detailLoading = false;
    let startedAt: string | null = null;
    let endedAt: string | null = null;
    let stillOpen = false;
    let stoppageCount = 0;
    const byCause = new Map<string, Stoppage>();

    for (const row of ordered) {
      bottles += row.bottles;
      rejects += row.rejects;
      runningMinutes += row.runningMinutes;
      breakdownMinutes += row.breakdownMinutes;
      units += row.units;
      machineUnits += row.machineUnits;
      utilityUnits += row.utilityUnits;
      preformBoxes += row.preformBoxes;
      preformGrams += row.preformGrams;
      if (row.preformCost != null) preformCost += row.preformCost;
      if (row.blowingCost != null) blowingCost += row.blowingCost;
      if (row.benchmarkPerBottle != null) benchmark = row.benchmarkPerBottle;
      if (row.isLive) isLive = true;
      if (row.detailLoading) detailLoading = true;
      if (row.netCost != null) netCost += row.netCost;
      // Per-bottle cost is averaged over bottles, not over runs: a 200-bottle
      // run and a 25,000-bottle one do not weigh the same.
      if (row.costPerBottle != null && row.bottles > 0) {
        costWeighted += row.costPerBottle * row.bottles;
        costedBottles += row.bottles;
      }
      if (row.totalCostPerBottle != null) totalWeighted += row.totalCostPerBottle * row.bottles;
      if (row.preformCostPerBottle != null) {
        preformWeighted += row.preformCostPerBottle * row.bottles;
      }

      for (const segment of row.detail?.segments ?? []) {
        if (startedAt == null || segment.start_time < startedAt) startedAt = segment.start_time;
        if (!segment.end_time) stillOpen = true;
        else if (endedAt == null || segment.end_time > endedAt) endedAt = segment.end_time;
      }
      for (const breakdown of row.detail?.breakdowns ?? []) {
        stoppageCount += 1;
        addStoppage(byCause, breakdown, lead.machineName, now);
      }
    }

    const spanMinutes = Math.max(
      startedAt ? minutesBetween(startedAt, stillOpen || !endedAt ? now : endedAt) : 0,
      runningMinutes + breakdownMinutes,
    );

    return {
      machineId,
      machineName: lead.machineName,
      state: lead.state,
      runs: ordered,
      lead,
      preform: lead.preform,
      startedAt,
      endedAt: stillOpen ? null : endedAt,
      bottles,
      rejects,
      rejectPct: pct(rejects, bottles),
      yieldPct: pct(bottles - rejects, bottles),
      isLive,
      spanMinutes,
      runningMinutes,
      idleMinutes: Math.max(0, spanMinutes - runningMinutes - breakdownMinutes),
      breakdownMinutes,
      utilisationPct: pct(runningMinutes, spanMinutes),
      speed: runningMinutes > 0 ? Math.round((bottles / runningMinutes) * 60) : null,
      unitsPerBottle: bottles > 0 && units > 0 ? Number((units / bottles).toFixed(4)) : null,
      machineUnits,
      utilityUnits,
      totalUnits: units,
      preformBoxes,
      preformGrams,
      goodBottles: bottles - rejects,
      costPerBottle: costedBottles > 0 ? Number((costWeighted / costedBottles).toFixed(4)) : null,
      preformCost: preformCost > 0 ? preformCost : null,
      preformCostPerBottle:
        costedBottles > 0 && preformWeighted > 0
          ? Number((preformWeighted / costedBottles).toFixed(4))
          : null,
      blowingCost: blowingCost > 0 ? blowingCost : null,
      totalCostPerBottle:
        costedBottles > 0 && totalWeighted > 0
          ? Number((totalWeighted / costedBottles).toFixed(4))
          : null,
      benchmarkPerBottle: benchmark,
      netCost: netCost > 0 ? netCost : null,
      standards: standardsOf(specs.get(lead.preformSpecId)),
      standardsSet: countStandards(standardsOf(specs.get(lead.preformSpecId))),
      operators: num(lead.detail?.operator_count),
      contractLabour: num(lead.detail?.contract_labour_count),
      ownLabour: num(lead.detail?.own_labour_count),
      labour: num(lead.detail?.contract_labour_count) + num(lead.detail?.own_labour_count),
      stoppages: rankStoppages(byCause),
      stoppageCount,
      detailLoading,
    };
  });

  tiles.sort(
    (a, b) =>
      severityOf(a.state) - severityOf(b.state) || a.machineName.localeCompare(b.machineName),
  );

  const plantCauses = new Map<string, Stoppage>();
  let unrecoveredMinutes = 0;
  for (const row of rows) {
    for (const breakdown of row.detail?.breakdowns ?? []) {
      addStoppage(plantCauses, breakdown, row.machineName, now);
      if (breakdown.is_unrecovered) unrecoveredMinutes += stoppageMinutes(breakdown, now);
    }
  }

  const count = (state: LiveStatus) => tiles.filter((tile) => tile.state === state).length;
  const bottles = tiles.reduce((sum, tile) => sum + tile.bottles, 0);
  const rejects = tiles.reduce((sum, tile) => sum + tile.rejects, 0);

  return {
    tiles,
    machines: tiles.length,
    running: count('RUNNING'),
    down: count('BREAKDOWN') + count('STOPPED'),
    finished: count('COMPLETED'),
    bottles,
    rejects,
    rejectPct: pct(rejects, bottles),
    yieldPct: pct(bottles - rejects, bottles),
    runningMinutes: tiles.reduce((sum, tile) => sum + tile.runningMinutes, 0),
    idleMinutes: tiles.reduce((sum, tile) => sum + tile.idleMinutes, 0),
    breakdownMinutes: tiles.reduce((sum, tile) => sum + tile.breakdownMinutes, 0),
    stoppageCount: tiles.reduce((sum, tile) => sum + tile.stoppageCount, 0),
    stoppages: rankStoppages(plantCauses),
    unrecoveredMinutes,
  };
}

function countStandards(standards: BlowingStandards): number {
  return [standards.rejectPct, standards.costPerBottle, standards.unitsPerBottle].filter(
    (value) => value != null,
  ).length;
}
