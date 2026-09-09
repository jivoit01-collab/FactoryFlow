/**
 * The board's single data hook.
 *
 * Three independent feeds, deliberately kept independent: today's runs from the
 * execution API, BH-PF's stock from the occupancy endpoint, and the standing
 * queue from the non-moving report. Each panel shows its own loading and error
 * state, so a SAP outage on one feed does not blank a board whose other half is
 * fine — the runs come from Postgres and the stock from HANA, and they fail for
 * different reasons.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useNonMovingReport } from '@/modules/dashboards/non-moving/api';
import type { NonMovingItem } from '@/modules/dashboards/non-moving/types';
import { EXECUTION_QUERY_KEYS, executionApi } from '@/modules/production/execution/api';

import { useWarehouseOccupancy } from '../api';
import {
  CONTROL_WAREHOUSE,
  FINISHED_GOODS_ITEM_GROUP,
  PALLET_CAPACITY,
  PRODUCTION_CONTROL_REFRESH_MS,
  STANDING_AGE_DAYS,
} from '../constants';
import { buildLineBoard, type LineBoard, type Occupancy, summariseOccupancy } from '../utils';

export interface ProductionControlGates {
  canSeeLines: boolean;
  canSeeFloor: boolean;
  canSeeStanding: boolean;
}

export interface ProductionControlBoard {
  /** Today, as the API wants it. */
  date: string;

  lines: LineBoard;
  linesLoading: boolean;
  linesFetching: boolean;
  linesError: unknown;
  refetchLines: () => void;

  occupancy: Occupancy | null;
  /** Value of everything on the floor, in rupees. */
  stockValue: number;
  /** SKUs SAP holds no pieces-per-box for — the figure's soft edge. */
  unconfiguredItems: number;
  stockLoading: boolean;
  stockFetching: boolean;
  stockError: unknown;
  refetchStock: () => void;

  standing: NonMovingItem[];
  standingValue: number;
  standingLoading: boolean;
  standingFetching: boolean;
  standingError: unknown;
  refetchStanding: () => void;
}

/** Today in the local timezone, as `YYYY-MM-DD`. */
function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Feeds are gated on the reader's rights, so a user who may not read SAP stock
 * never fires the request that would 403 — an error state on a panel they were
 * never shown is noise in the console and a wasted round trip.
 */
export function useProductionControlBoard(gates: ProductionControlGates): ProductionControlBoard {
  const date = useMemo(() => today(), []);

  // Called directly rather than through `useRuns`, which takes no enabled flag
  // — the key matches it exactly, so both share one cache entry.
  const runs = useQuery({
    queryKey: [...EXECUTION_QUERY_KEYS.runs(undefined, date), { date }] as const,
    queryFn: () => executionApi.getRuns({ date }),
    enabled: gates.canSeeLines,
    staleTime: PRODUCTION_CONTROL_REFRESH_MS,
    refetchInterval: PRODUCTION_CONTROL_REFRESH_MS,
  });
  const stock = useWarehouseOccupancy(CONTROL_WAREHOUSE, gates.canSeeFloor);
  const standing = useNonMovingReport(
    {
      age: STANDING_AGE_DAYS,
      item_group: FINISHED_GOODS_ITEM_GROUP,
      warehouse: [CONTROL_WAREHOUSE],
    },
    gates.canSeeStanding,
  );

  const lines = useMemo(() => buildLineBoard(runs.data ?? []), [runs.data]);

  const occupancy = useMemo(() => {
    if (!stock.data) return null;
    return summariseOccupancy(
      stock.data.data.map((row) => ({
        itemCode: row.item_code,
        itemName: row.item_name,
        pieces: row.on_hand,
        piecesPerBox: row.pieces_per_box,
        litresPerPiece: row.litres_per_piece,
      })),
      PALLET_CAPACITY,
    );
  }, [stock.data]);

  // The report answers for every warehouse the filter allows, so narrow to this
  // floor rather than trusting the request filter to have been honoured.
  const standingRows = useMemo(() => {
    const rows = (standing.data?.data ?? []).filter((row) => row.warehouse === CONTROL_WAREHOUSE);
    return [...rows].sort(
      (a, b) => b.days_since_last_movement - a.days_since_last_movement || b.value - a.value,
    );
  }, [standing.data]);

  return {
    date,

    lines,
    linesLoading: runs.isLoading,
    linesFetching: runs.isFetching,
    linesError: runs.error,
    refetchLines: () => void runs.refetch(),

    occupancy,
    stockValue: stock.data?.meta.total_value ?? 0,
    unconfiguredItems: stock.data?.meta.unconfigured_items ?? 0,
    stockLoading: stock.isLoading,
    stockFetching: stock.isFetching,
    stockError: stock.error,
    refetchStock: () => void stock.refetch(),

    standing: standingRows,
    standingValue: standingRows.reduce((sum, row) => sum + row.value, 0),
    standingLoading: standing.isLoading,
    standingFetching: standing.isFetching,
    standingError: standing.error,
    refetchStanding: () => void standing.refetch(),
  };
}
