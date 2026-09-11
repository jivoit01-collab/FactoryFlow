import { Download } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button } from '@/shared/components/ui';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import { findDefaultMaterialGroup, isRmOrPmGroup } from '../../utils/itemGroupDefaults';
import { useItemGroups, useNonMovingReport } from '../api';
import { NonMovingFilters, NonMovingMetaCards, NonMovingTable } from '../components';
import {
  DEFAULT_NON_MOVING_AGE,
  DEFAULT_NON_MOVING_STATUS_FILTER,
  NON_MOVING_PAGE_SIZE,
} from '../constants';
import type {
  NonMovingFilters as NonMovingFiltersType,
  NonMovingRow,
  NonMovingSortCol,
} from '../types';
import { type MovementStatus } from '../utils/movementStatus';
import { buildNonMovingWorkbook } from '../utils/nonMovingExport';
import { groupNonMovingRowsBySku } from '../utils/nonMovingGrouping';
import {
  defaultWarehouseSelection,
  filterNonMovingItems,
  filterRowsByStatus,
  pageOf,
  sortNonMovingRows,
  statusTotals,
  subGroupOptions,
  totalPagesOf,
  totalsFor,
  warehouseOptions,
  warehouseRowsForItem,
} from '../utils/nonMovingRows';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function NonMovingDashboardPage() {
  const itemGroupsQuery = useItemGroups();

  const [filters, setFilters] = useState<NonMovingFiltersType>({
    age: DEFAULT_NON_MOVING_AGE,
    item_group: 0,
    status: [...DEFAULT_NON_MOVING_STATUS_FILTER],
  });
  const [filterResetSignal, setFilterResetSignal] = useState(0);
  const [hasSelectedMaterialType, setHasSelectedMaterialType] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ col: NonMovingSortCol; dir: 'asc' | 'desc' }>({
    col: 'days_since_last_movement',
    dir: 'desc',
  });

  const materialTypesResolved = Boolean(itemGroupsQuery.data) || itemGroupsQuery.isError;

  /**
   * The board covers raw and packing material only, so the Material Type
   * dropdown offers those two and nothing else. Finished goods, consumables,
   * fixed assets and trading items are all real SAP groups this page is not
   * about, and offering them invited a reading of the numbers it cannot give.
   */
  const materialTypes = useMemo(
    () => (itemGroupsQuery.data?.data ?? []).filter((g) => isRmOrPmGroup(g.item_group_name)),
    [itemGroupsQuery.data],
  );

  const defaultItemGroupCode = useMemo(
    () => findDefaultMaterialGroup(materialTypes, (group) => group.item_group_name)?.item_group_code ?? 0,
    [materialTypes],
  );

  const effectiveFilters = useMemo<NonMovingFiltersType>(
    () => ({
      ...filters,
      item_group: hasSelectedMaterialType ? filters.item_group : defaultItemGroupCode,
    }),
    [defaultItemGroupCode, filters, hasSelectedMaterialType],
  );

  const reportQuery = useNonMovingReport(effectiveFilters, materialTypesResolved);

  // "All" on this page means all RM and PM — the report answers for every group
  // when no group code is sent, so the rest is dropped here rather than shown.
  const items = useMemo(
    () => (reportQuery.data?.data ?? []).filter((item) => isRmOrPmGroup(item.item_group_name)),
    [reportQuery.data],
  );

  const warehouses = useMemo(() => warehouseOptions(items), [items]);
  const subGroups = useMemo(() => subGroupOptions(items), [items]);

  /**
   * The stores the page opens on. Derived from the report rather than taken
   * from the constant blind, so a company holding none of the four (Mart) opens
   * on everything instead of on an empty table. Its identity only changes when
   * the report's warehouse list does, which is what makes the filter bar able
   * to apply it once and then leave the user's own selection alone.
   */
  const warehousePreset = useMemo(() => defaultWarehouseSelection(warehouses), [warehouses]);

  // Everything but the status filter — the meta cards need the full split.
  const scopedItems = useMemo(
    () =>
      filterNonMovingItems(items, {
        age: effectiveFilters.age,
        warehouse: effectiveFilters.warehouse,
        sub_group: effectiveFilters.sub_group,
        search: effectiveFilters.search,
      }),
    [
      items,
      effectiveFilters.age,
      effectiveFilters.warehouse,
      effectiveFilters.sub_group,
      effectiveFilters.search,
    ],
  );

  // One line per SKU; the warehouses behind it open in the row's detail panel.
  const groupedRows = useMemo(() => groupNonMovingRowsBySku(scopedItems), [scopedItems]);

  const cardTotals = useMemo(() => statusTotals(groupedRows), [groupedRows]);
  const overallTotals = useMemo(() => totalsFor(groupedRows), [groupedRows]);

  const sortedRows = useMemo(
    () =>
      sortNonMovingRows(
        filterRowsByStatus(groupedRows, effectiveFilters.status),
        sort.col,
        sort.dir,
      ),
    [groupedRows, effectiveFilters.status, sort],
  );

  const totalPages = totalPagesOf(sortedRows.length, NON_MOVING_PAGE_SIZE);
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => pageOf(sortedRows, currentPage, NON_MOVING_PAGE_SIZE),
    [sortedRows, currentPage],
  );

  const warehouseRowsFor = useCallback(
    (row: NonMovingRow) => warehouseRowsForItem(scopedItems, row),
    [scopedItems],
  );

  const handleFiltersChange = useCallback((f: NonMovingFiltersType) => {
    setHasSelectedMaterialType(true);
    setFilters(f);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((col: NonMovingSortCol, dir: 'asc' | 'desc') => {
    setSort({ col, dir });
    setPage(1);
  }, []);

  const handleStatusCardSelect = useCallback((statuses: MovementStatus[]) => {
    setFilters((current) => ({ ...current, status: [...statuses] }));
    setFilterResetSignal((current) => current + 1);
    setPage(1);
  }, []);

  const handleItemSearchSelect = useCallback((term: string) => {
    const search = term.trim().toUpperCase();
    if (!search) return;
    setFilters((current) => ({ ...current, search }));
    setFilterResetSignal((current) => current + 1);
    setPage(1);
  }, []);

  const handleExport = useCallback(() => {
    if (sortedRows.length === 0) {
      toast.error('Nothing to export');
      return;
    }

    // The folded table first, then one sheet per warehouse in view.
    const workbook = buildNonMovingWorkbook({
      rows: sortedRows,
      items: scopedItems,
      selectedWarehouses: effectiveFilters.warehouse,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `non_moving_rm_pm_${stamp}.xlsx`);
    toast.success('Export downloaded');
  }, [effectiveFilters.warehouse, scopedItems, sortedRows]);

  const hasSAPError = Boolean(reportQuery.error && isSAPError(reportQuery.error));

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Non-Moving RM & PM"
        description="Raw and packing material by movement age — spot the stock that has stopped moving, and what it is worth"
      >
        <Button
          type="button"
          variant="outline"
          onClick={handleExport}
          disabled={hasSAPError || sortedRows.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </DashboardHeader>

      <NonMovingFilters
        onFiltersChange={handleFiltersChange}
        isFetching={itemGroupsQuery.isFetching || reportQuery.isFetching}
        defaultValues={effectiveFilters}
        itemGroups={materialTypes}
        isLoadingGroups={itemGroupsQuery.isLoading}
        warehouses={warehouses}
        warehousePreset={warehousePreset}
        subGroups={subGroups}
        externalResetSignal={filterResetSignal}
      />

      {hasSAPError && (
        <SAPUnavailableBanner error={reportQuery.error as ApiError} onRetry={reportQuery.refetch} />
      )}

      {!hasSAPError && materialTypesResolved && (
        <>
          <NonMovingMetaCards
            totals={cardTotals}
            overall={overallTotals}
            activeStatuses={effectiveFilters.status}
            onStatusSelect={handleStatusCardSelect}
          />
          <NonMovingTable
            rows={pageRows}
            isLoading={reportQuery.isLoading || reportQuery.isFetching}
            page={currentPage}
            totalPages={totalPages}
            totalItems={sortedRows.length}
            onPageChange={setPage}
            sortCol={sort.col}
            sortDir={sort.dir}
            onSortChange={handleSortChange}
            warehouseRowsFor={warehouseRowsFor}
            onSearchSelect={handleItemSearchSelect}
          />
        </>
      )}
    </div>
  );
}
