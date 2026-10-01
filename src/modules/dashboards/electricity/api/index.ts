import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/core/api';
import { ELECTRICITY_TREE_ENDPOINTS } from '@/modules/maintenance/api';

/** A figure as Electricity++ serves it: a 2-decimal string. */
type Amount = string;

export interface ElectricityBoardMeter {
  name: string;
  units: Amount;
  cost: Amount;
  rate: Amount | null;
  /** The company's part of the meter's own units; null when it is all of it */
  share_pct: Amount | null;
  /** Days in the span the meter carried units */
  days: number;
}

export interface ElectricityBoardDay {
  date: string;
  units: Amount;
  cost: Amount;
  by_meter: Record<string, Amount>;
}

export interface ElectricityBoard {
  date_from: string;
  date_to: string;
  /** '' = the whole metered campus */
  company: string;
  units: Amount;
  cost: Amount;
  days_with_units: number;
  meters: ElectricityBoardMeter[];
  days: ElectricityBoardDay[];
  /** What the main meters measured, for reference */
  supply: { units: Amount; cost: Amount };
  /** What Electricity++ says is wrong with the readings behind the figures */
  warnings: string[];
}

export interface ElectricityBoardParams {
  date_from: string;
  date_to: string;
  company?: string;
}

export async function getElectricityBoard(params: ElectricityBoardParams) {
  const response = await apiClient.get<ElectricityBoard>(ELECTRICITY_TREE_ENDPOINTS.BOARD, {
    params: { ...params, company: params.company || undefined },
  });
  return response.data;
}

/** Electricity++ for the dashboard; the page stays on screen while a new span loads. */
export function useElectricityBoard(params: ElectricityBoardParams) {
  return useQuery({
    queryKey: ['dashboards', 'electricity-board', params],
    queryFn: () => getElectricityBoard(params),
    placeholderData: keepPreviousData,
  });
}
