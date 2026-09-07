import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { useAuth, usePermission } from '@/core/auth';
import { useDispatchPipelineBoard } from '@/modules/dashboards/dispatch-pipeline/api';
import type { PipelineCard, PipelineStage } from '@/modules/dashboards/dispatch-pipeline/types';
import { labourGateApi, type LabourGateEntry } from '@/modules/gate/api/labourGate/labourGate.api';
import {
  type DashboardPersonTypeWise,
  personGateInApi,
} from '@/modules/gate/api/personGateIn/personGateIn.api';

import {
  GATE_IN_ROUTES,
  GATE_OUT_ROUTES,
  GATE_REFRESH_MS,
  type GateRange,
} from '../constants/gate-dashboard.constants';
import { useGateActivityCounts } from './useGateActivityCounts';

/** The three steps of the vehicle journey and the pipeline stages behind each. */
export const JOURNEY_STEPS = [
  {
    key: 'in',
    label: 'Gate In',
    hue: 'gateIn',
    pos: 16,
    stages: ['BOOKED', 'EMPTY_IN'] as PipelineStage[],
  },
  {
    key: 'purpose',
    label: 'Purpose',
    hue: 'labour',
    pos: 50,
    stages: [
      'READY_TO_DOCK',
      'DOCKED',
      'PHOTO_ATTACHED',
      'READY_FOR_GATEPASS',
      'GATEPASS_PRINTED',
      'PRINT_COMMITTED',
    ] as PipelineStage[],
  },
  {
    key: 'out',
    label: 'Gate Out',
    hue: 'gateOut',
    pos: 84,
    stages: ['DISPATCHED'] as PipelineStage[],
  },
] as const;

export type JourneyStep = (typeof JOURNEY_STEPS)[number];

/** A unique vehicle at a step + how many dispatch plans it carries there. */
export interface VehiclePlate {
  key: string;
  vehicle_no: string;
  count: number;
  stage_label?: string;
}

/** One department's share of the day's contractor labour. */
export interface LabourDepartmentSlice {
  /** Department id, or null for the synthetic "not yet allocated" row. */
  id: number | null;
  name: string;
  /** Heads allocated to this department. */
  allocated: number;
  /** How many contractors that allocation came from. */
  contractors: number;
}

export interface GateBoard {
  /** Inbound vehicle entries across the range. */
  vehiclesIn: number;
  /** Outbound movements across the range. */
  vehiclesOut: number;
  /** Contractor head-count in at the gate on the labour day. */
  laboursIn: number;
  /** Labour split across departments, biggest first, unallocated last. */
  labourDepartments: LabourDepartmentSlice[];
  /** Heads an HOD has assigned to a department. */
  labourAllocated: number;
  /** Heads through the gate that no department has claimed yet. */
  labourUnallocated: number;
  /**
   * The single day the labour figures belong to. Labour is a day register, so
   * a multi-day board still shows one day here and has to say which.
   */
  labourDate: string;
  labourLoading: boolean;
  /** Visitors who entered across the range. */
  visitorsIn: number;
  /** People on site right now — always "now", never the range. */
  insideNow: number;
  /** Of those inside, how many have been in longer than the configured limit. */
  longStay: number;
  /** Per-person-type breakdown of who is inside. */
  personTypes: DashboardPersonTypeWise[];
  /** Per-activity counts, keyed by route. */
  counts: Record<string, number | undefined>;
  /** Vehicles parked at each journey step, deduped by vehicle number. */
  journey: VehiclePlate[][];
  /** Total vehicles on the road across all three steps. */
  onRoad: number;
  countsLoading: boolean;
  journeyLoading: boolean;
  peopleLoading: boolean;
  isFetching: boolean;
  /** Newest successful read across every query — drives the staleness tell. */
  updatedAt: number;
  refetch: () => void;
}

function retry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 1;
}

/**
 * Collapse a step's cards (one per dispatch plan) to one plate per vehicle.
 * A vehicle assigned to several plans in the same step shows once with ×N.
 * Order follows first appearance; blank numbers stay separate.
 */
function dedupeByVehicle(cards: PipelineCard[]): VehiclePlate[] {
  const order: string[] = [];
  const map = new Map<string, VehiclePlate>();
  for (const card of cards) {
    const vno = (card.vehicle_no || '').trim();
    const key = vno ? `v:${vno.toUpperCase()}` : `p:${card.plan_id}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { key, vehicle_no: vno || '—', count: 1, stage_label: card.stage_label });
      order.push(key);
    }
  }
  return order.map((key) => map.get(key)!);
}

/**
 * Split one day's labour register into the gate head-count and the department
 * allocation behind it.
 *
 * The register holds two different kinds of row under the same shape, and
 * telling them apart is the whole job:
 *   - `department == null` is what the gate recorded — a contractor turned up
 *     with N people. This is the head-count that walked through the barrier.
 *   - `department != null` is an HOD afterwards splitting those same N people
 *     across departments. It is a *view* of the first kind, never extra people.
 *
 * Adding the two together therefore double-counts every allocated labourer,
 * which is exactly what the old head-count did — it summed `count_in` across
 * every row, so a fully-allocated day reported twice the people it had (and a
 * soft-deleted row inflated it further still).
 *
 * Allocation is capped per contractor at what that contractor brought in, so
 * `allocated` can never exceed `gateIn`; the remainder is labour on site that
 * no department has claimed yet.
 */
function splitLabourDay(entries: LabourGateEntry[]): {
  gateIn: number;
  allocated: number;
  departments: LabourDepartmentSlice[];
} {
  const live = entries.filter((entry) => !entry.is_deleted);

  const gateIn = live
    .filter((entry) => entry.department == null)
    .reduce((sum, entry) => sum + (entry.count_in ?? 0), 0);

  // Every shift the day holds, summed: a wall showing "today" means the whole
  // day, and the head-count tile above it is a whole-day figure too. Scoping
  // one and not the other is how a board stops reconciling with itself.
  const byDepartment = new Map<
    number,
    { name: string; allocated: number; contractors: Set<number> }
  >();
  live
    .filter((entry) => entry.department != null)
    .forEach((entry) => {
      const id = entry.department as number;
      const slice = byDepartment.get(id) ?? {
        name: entry.department_name ?? `Department #${id}`,
        allocated: 0,
        contractors: new Set<number>(),
      };
      slice.allocated += entry.count_in ?? 0;
      slice.contractors.add(entry.contractor);
      byDepartment.set(id, slice);
    });

  const departments: LabourDepartmentSlice[] = Array.from(byDepartment.entries())
    .map(([id, slice]) => ({
      id,
      name: slice.name,
      allocated: slice.allocated,
      contractors: slice.contractors.size,
    }))
    .sort((a, b) => b.allocated - a.allocated || a.name.localeCompare(b.name));

  const allocated = departments.reduce((sum, slice) => sum + slice.allocated, 0);
  return { gateIn, allocated, departments };
}

/**
 * Everything the gate wall reads, in one shape.
 *
 * Three independent sources, and which one a number comes from decides how it
 * behaves when the other two are down:
 *   - the activity counts are FactoryFlow's own registers, one query per
 *     activity, each permission-gated and independently guarded — a failing
 *     endpoint leaves that row without a number rather than emptying the board;
 *   - the person-gate dashboard carries visitors and who is on site;
 *   - the labour-gate day register carries the contractor head-count and the
 *     department split an HOD made of it;
 *   - the dispatch pipeline draws the vehicle journey, and needs the pipeline
 *     permission, so a gate operator without it simply sees no road.
 *
 * "Inside now" is deliberately not range-scoped. Every other figure answers
 * "what crossed the gate between these dates"; that one answers "who is in the
 * plant at this second", which is the only question worth asking during an
 * evacuation and must never quietly become a historical count.
 */
export function useGateBoard(range: GateRange, canViewJourney: boolean): GateBoard {
  const { hasAnyPermission } = usePermission();
  const { currentCompany } = useAuth();

  const {
    counts,
    isLoading: countsLoading,
    isFetching: countsFetching,
    updatedAt: countsUpdatedAt,
    refetch: refetchCounts,
  } = useGateActivityCounts(range);

  const canViewPersons = hasAnyPermission([
    GATE_PERMISSIONS.PERSON_GATE_IN.VIEW,
    GATE_PERMISSIONS.DASHBOARD.VIEW,
  ]);

  const personQuery = useQuery({
    queryKey: ['gate-wall-person', currentCompany?.company_id, range.from, range.to],
    queryFn: () => personGateInApi.getDashboard({ from_date: range.from, to_date: range.to }),
    enabled: canViewPersons,
    staleTime: GATE_REFRESH_MS,
    refetchInterval: GATE_REFRESH_MS,
    refetchOnWindowFocus: true,
    retry,
  });

  // Labour is a day register, not a range one: the endpoint takes a single
  // date. A multi-day board shows the last day of the range and labels it.
  const canViewLabour = hasAnyPermission([
    GATE_PERMISSIONS.LABOUR_GATE.VIEW,
    GATE_PERMISSIONS.LABOUR_GATE.RECORD_IN,
  ]);
  const labourQuery = useQuery({
    queryKey: ['gate-wall-labour', currentCompany?.company_id, range.to],
    queryFn: () => labourGateApi.listDay(range.to),
    enabled: canViewLabour,
    staleTime: GATE_REFRESH_MS,
    refetchInterval: GATE_REFRESH_MS,
    refetchOnWindowFocus: true,
    retry,
  });

  const labour = useMemo(() => splitLabourDay(labourQuery.data ?? []), [labourQuery.data]);

  const pipelineParams = useMemo(
    () => ({ date_from: range.from, date_to: range.to, all_companies: true }),
    [range.from, range.to],
  );
  const pipelineQuery = useDispatchPipelineBoard(pipelineParams, { enabled: canViewJourney });

  const journey = useMemo(() => {
    const cards = pipelineQuery.data?.cards ?? [];
    return JOURNEY_STEPS.map((step) => {
      const stages = new Set<PipelineStage>(step.stages);
      return dedupeByVehicle(cards.filter((card) => stages.has(card.stage)));
    });
  }, [pipelineQuery.data]);

  const vehiclesIn = useMemo(
    () => GATE_IN_ROUTES.reduce((sum, route) => sum + (counts[route] ?? 0), 0),
    [counts],
  );
  const vehiclesOut = useMemo(
    () => GATE_OUT_ROUTES.reduce((sum, route) => sum + (counts[route] ?? 0), 0),
    [counts],
  );

  const person = personQuery.data;
  // The API only fills `range` when the dates span more than today; on a
  // single-day board `today` is the same figure under a different name.
  const spanStats = person?.range ?? person?.today;

  return {
    vehiclesIn,
    vehiclesOut,
    laboursIn: labour.gateIn,
    labourDepartments: labour.departments,
    labourAllocated: labour.allocated,
    labourUnallocated: Math.max(0, labour.gateIn - labour.allocated),
    labourDate: range.to,
    labourLoading: canViewLabour && labourQuery.isLoading,
    visitorsIn: spanStats?.visitors ?? 0,
    insideNow: person?.current.total_inside ?? 0,
    longStay: person?.current.long_duration_count ?? 0,
    personTypes: person?.person_type_wise ?? [],
    counts,
    journey,
    onRoad: journey.reduce((sum, plates) => sum + plates.length, 0),
    countsLoading,
    journeyLoading: canViewJourney && pipelineQuery.isLoading,
    peopleLoading: canViewPersons && personQuery.isLoading,
    isFetching:
      countsFetching ||
      personQuery.isFetching ||
      pipelineQuery.isFetching ||
      labourQuery.isFetching,
    updatedAt: Math.max(
      countsUpdatedAt,
      personQuery.dataUpdatedAt ?? 0,
      pipelineQuery.dataUpdatedAt ?? 0,
      labourQuery.dataUpdatedAt ?? 0,
    ),
    refetch: () => {
      refetchCounts();
      void personQuery.refetch();
      void pipelineQuery.refetch();
      void labourQuery.refetch();
    },
  };
}
