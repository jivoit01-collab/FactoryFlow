/**
 * Non-moving stock, taken from the Non-Moving dashboard's own feed.
 *
 * It calls that dashboard's hooks with the same default filters, so the two
 * screens share one cache entry: opening either warms the other.
 *
 * The numbers are then derived through that page's exact pipeline — age filter,
 * fold to one row per SKU, resolve warehouses against the visible rows — rather
 * than from the response's own `summary`. The backend summarises every row it
 * returns for the age parameter, while the page counts only rows strictly past
 * that age and folds a SKU split across warehouses into one item, so reading the
 * raw summary would show a different total to the page this panel links to.
 */
import { useMemo } from 'react';

import { useItemGroups, useNonMovingReport } from '@/modules/dashboards/non-moving/api';
import type {
  BranchSummary,
  NonMovingFilters,
  ReportSummary,
  WarehouseGroup,
} from '@/modules/dashboards/non-moving/types';
import {
  buildNonMovingWarehouseGroups,
  groupNonMovingItemsBySku,
} from '@/modules/dashboards/non-moving/utils/nonMovingGrouping';

import { findDefaultMaterialGroup } from '../../utils/itemGroupDefaults';
import { WAREHOUSE_CONTROL_NON_MOVING_AGE_DAYS } from '../constants';

export interface UseNonMovingSnapshotResult {
  summary?: ReportSummary;
  /** Factory warehouses only, re-totalled against the visible rows. */
  warehouses: WarehouseGroup[];
  ageDays: number;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

export function useNonMovingSnapshot(enabled = true): UseNonMovingSnapshotResult {
  const itemGroupsQuery = useItemGroups();

  // The report needs a material group, and which one is the default is only
  // known once the dropdown feed answers (or fails).
  const groupsResolved = Boolean(itemGroupsQuery.data) || itemGroupsQuery.isError;

  const filters = useMemo<NonMovingFilters>(
    () => ({
      age: WAREHOUSE_CONTROL_NON_MOVING_AGE_DAYS,
      item_group:
        findDefaultMaterialGroup(
          itemGroupsQuery.data?.data ?? [],
          (group) => group.item_group_name,
        )?.item_group_code ?? 0,
    }),
    [itemGroupsQuery.data],
  );

  const reportQuery = useNonMovingReport(filters, enabled && groupsResolved);

  const filteredItems = useMemo(() => {
    const items = reportQuery.data?.data ?? [];
    if (filters.age <= 0) return items;
    return items.filter((item) => item.days_since_last_movement > filters.age);
  }, [reportQuery.data, filters.age]);

  const summary = useMemo<ReportSummary | undefined>(() => {
    if (!reportQuery.data) return undefined;

    // One row per SKU per branch, the way the dashboard counts items.
    const grouped = groupNonMovingItemsBySku(filteredItems);

    const branches = new Map<string, BranchSummary>();
    for (const item of grouped) {
      const existing = branches.get(item.branch);
      if (existing) {
        existing.item_count += 1;
        existing.total_value += item.value;
        existing.total_quantity += item.quantity;
      } else {
        branches.set(item.branch, {
          branch: item.branch,
          item_count: 1,
          total_value: item.value,
          total_quantity: item.quantity,
        });
      }
    }

    return {
      total_items: grouped.length,
      total_value: grouped.reduce((sum, item) => sum + item.value, 0),
      total_quantity: grouped.reduce((sum, item) => sum + item.quantity, 0),
      by_branch: [...branches.values()],
    };
  }, [reportQuery.data, filteredItems]);

  const warehouses = useMemo(
    () => buildNonMovingWarehouseGroups(reportQuery.data?.warehouse_summary ?? [], filteredItems),
    [reportQuery.data, filteredItems],
  );

  return {
    summary,
    warehouses,
    ageDays: filters.age,
    isLoading: enabled && (!groupsResolved || reportQuery.isLoading),
    isFetching: reportQuery.isFetching,
    error: reportQuery.error,
    refetch: () => void reportQuery.refetch(),
  };
}
