/**
 * Non-moving stock, read out of one pinned company's SAP schema.
 *
 * The board is company-independent, and for this panel that means pinned rather
 * than merged: the warehouse it reports on (`WAREHOUSE_CONTROL_NON_MOVING_WAREHOUSES`)
 * exists in a single company's chart of warehouses, so read through the active
 * company the panel would go blank for anyone sitting in a sibling company.
 *
 * It therefore holds its own cache entry rather than sharing the Non-Moving
 * dashboard's: that page follows the company selector, and item-group codes are
 * per-schema — a code resolved there would name a different group here.
 *
 * The rows are then derived through that page's exact pipeline — age filter,
 * fold to one row per SKU, resolve warehouses against the visible rows — rather
 * than from the response's own `summary`. The backend summarises every row it
 * returns for the age parameter, while the page counts only rows strictly past
 * that age and folds a SKU split across warehouses into one item, so reading the
 * raw summary would show a different total to the page this panel links to.
 *
 * Finally the whole thing is narrowed to the board's configured warehouses, and
 * the summary is rebuilt over that narrower set so the header and the list can
 * never describe different scopes.
 */
import { useMemo } from 'react';

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
import { useControlNonMovingItemGroups, useControlNonMovingReport } from '../api';
import {
  WAREHOUSE_CONTROL_NON_MOVING_AGE_DAYS,
  WAREHOUSE_CONTROL_NON_MOVING_COMPANY,
  WAREHOUSE_CONTROL_NON_MOVING_WAREHOUSES,
} from '../constants';

export interface UseNonMovingSnapshotResult {
  summary?: ReportSummary;
  /** The board's configured warehouses, re-totalled against the visible rows. */
  warehouses: WarehouseGroup[];
  ageDays: number;
  /** Warehouse codes the panel is narrowed to; empty means every factory one. */
  scope: readonly string[];
  /** The company whose schema was read — the panel names it, since it is fixed. */
  companyCode: string;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

export function useNonMovingSnapshot(enabled = true): UseNonMovingSnapshotResult {
  const companyCode = WAREHOUSE_CONTROL_NON_MOVING_COMPANY;
  const itemGroupsQuery = useControlNonMovingItemGroups(companyCode, enabled);

  // The report needs a material group, and which one is the default is only
  // known once the dropdown feed answers (or fails).
  const groupsResolved = Boolean(itemGroupsQuery.data) || itemGroupsQuery.isError;

  const filters = useMemo<NonMovingFilters>(
    () => ({
      age: WAREHOUSE_CONTROL_NON_MOVING_AGE_DAYS,
      item_group:
        findDefaultMaterialGroup(itemGroupsQuery.data?.data ?? [], (group) => group.item_group_name)
          ?.item_group_code ?? 0,
    }),
    [itemGroupsQuery.data],
  );

  const reportQuery = useControlNonMovingReport(filters, companyCode, enabled && groupsResolved);

  const filteredItems = useMemo(() => {
    const items = reportQuery.data?.data ?? [];
    if (filters.age <= 0) return items;
    return items.filter((item) => item.days_since_last_movement > filters.age);
  }, [reportQuery.data, filters.age]);

  const warehouses = useMemo(() => {
    const groups = buildNonMovingWarehouseGroups(
      reportQuery.data?.warehouse_summary ?? [],
      filteredItems,
    );
    if (WAREHOUSE_CONTROL_NON_MOVING_WAREHOUSES.length === 0) return groups;
    return groups.filter((group) =>
      WAREHOUSE_CONTROL_NON_MOVING_WAREHOUSES.includes(group.warehouse),
    );
  }, [reportQuery.data, filteredItems]);

  const summary = useMemo<ReportSummary | undefined>(() => {
    if (!reportQuery.data) return undefined;

    // Rebuilt over the scoped warehouses, so the header counts exactly what the
    // list below it shows.
    const scopedItems = warehouses.flatMap((group) => group.items);

    // A SKU can sit in more than one scoped warehouse. Its quantity and value are
    // pro-rated per warehouse so those sum correctly, but it is still one item —
    // count distinct codes rather than rows.
    const distinctItems = new Set(scopedItems.map((item) => item.item_code)).size;

    const branches = new Map<string, BranchSummary>();
    for (const item of groupNonMovingItemsBySku(scopedItems)) {
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
      total_items: distinctItems,
      total_value: warehouses.reduce((sum, group) => sum + group.total_value, 0),
      total_quantity: warehouses.reduce((sum, group) => sum + group.total_quantity, 0),
      by_branch: [...branches.values()],
    };
  }, [reportQuery.data, warehouses]);

  return {
    summary,
    warehouses,
    ageDays: filters.age,
    scope: WAREHOUSE_CONTROL_NON_MOVING_WAREHOUSES,
    companyCode,
    isLoading: enabled && (!groupsResolved || reportQuery.isLoading),
    isFetching: reportQuery.isFetching,
    // Only the report's own error: a failed dropdown is survivable (the report
    // is then read for every group), and the permission answer a user without
    // access to the pinned company gets comes back on both queries anyway.
    error: reportQuery.error,
    refetch: () => void reportQuery.refetch(),
  };
}
