import { Download } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button } from '@/shared/components/ui';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import { findDefaultMaterialGroup } from '../../utils/itemGroupDefaults';
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
import { getMovementStatus, type MovementStatus } from '../utils/movementStatus';
import { groupNonMovingRowsBySku } from '../utils/nonMovingGrouping';
import {
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

const STATUS_LABELS: Record<MovementStatus, string> = {
  recent: 'Recently Moved',
  'slow-moving': 'Slow Moving',
  'non-moving': 'Non Moving',
};

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

  const defaultItemGroupCode = useMemo(() => {
    const groups = itemGroupsQuery.data?.data ?? [];
    return findDefaultMaterialGroup(groups, (group) => group.item_group_name)?.item_group_code ?? 0;
  }, [itemGroupsQuery.data]);

  const effectiveFilters = useMemo<NonMovingFiltersType>(
    () => ({
      ...filters,
      item_group: hasSelectedMaterialType ? filters.item_group : defaultItemGroupCode,
    }),
    [defaultItemGroupCode, filters, hasSelectedMaterialType],
  );

  const reportQuery = useNonMovingReport(effectiveFilters, materialTypesResolved);
  const items = useMemo(() => reportQuery.data?.data ?? [], [reportQuery.data]);

  const warehouses = useMemo(() => warehouseOptions(items), [items]);
  const subGroups = useMemo(() => subGroupOptions(items), [items]);

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

    const rows = sortedRows.map((row) => ({
      'Item Code': row.item_code,
      'Item Name': row.item_name,
      Branch: row.branch,
      Warehouse: row.warehouses.join(', ') || row.warehouse,
      'Sub Group': row.sub_group,
      Quantity: row.quantity,
      Value: row.value,
      'Days Idle': row.days_since_last_movement,
      'Last Movement': row.last_movement_date ?? '',
      'Consumption %': row.consumption_ratio,
      Status: STATUS_LABELS[getMovementStatus(row.days_since_last_movement)],
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = Object.keys(rows[0]).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r] ?? '').length)) + 2,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Non-Moving');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `non_moving_${stamp}.xlsx`);
    toast.success('Export downloaded');
  }, [sortedRows]);

  const hasSAPError = Boolean(reportQuery.error && isSAPError(reportQuery.error));

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Non-Moving"
        description="Inventory by movement age — spot the stock that has stopped moving, and what it is worth"
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
        itemGroups={itemGroupsQuery.data?.data ?? []}
        isLoadingGroups={itemGroupsQuery.isLoading}
        warehouses={warehouses}
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
