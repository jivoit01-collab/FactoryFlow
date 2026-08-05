import { Download } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api';
import { useWMSItemGroups } from '@/modules/warehouse/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button } from '@/shared/components/ui';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import {
  DEFAULT_MATERIAL_TYPE_NAME,
  findDefaultMaterialGroup,
} from '../../utils/itemGroupDefaults';
import { stockLevelApi, useStockLevels } from '../api';
import { StockLevelFilters, StockLevelMetaCards, StockLevelTable } from '../components';
import {
  DEFAULT_STOCK_MOVEMENT_FILTER,
  DEFAULT_STOCK_STATUS_FILTER,
  DEFAULT_STOCK_WAREHOUSE_FILTER,
  STOCK_BENCHMARK_STATS_STATUS_FILTER,
} from '../constants';
import type { StockDashboardFilters, StockHealthStatus, StockSortCol } from '../types';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

function normalizeSearchParam(value: string | null): string | undefined {
  const search = value?.trim();
  return search ? search.toUpperCase() : undefined;
}

export default function StockLevelDashboardPage() {
  const [searchParams] = useSearchParams();

  const [initialFilters] = useState<StockDashboardFilters>(() => {
    const search = normalizeSearchParam(searchParams.get('search'));
    const itemGroup = searchParams.get('item_group')?.trim();
    return {
      ...(search ? { search } : {}),
      ...(itemGroup ? { item_group: itemGroup } : {}),
      warehouse: [...DEFAULT_STOCK_WAREHOUSE_FILTER],
      status: [...DEFAULT_STOCK_STATUS_FILTER],
      movement_status: [...DEFAULT_STOCK_MOVEMENT_FILTER],
    };
  }); // Only read URL params on mount

  const [filters, setFilters] = useState<StockDashboardFilters>(initialFilters);
  const [filterResetSignal, setFilterResetSignal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ col: StockSortCol; dir: 'asc' | 'desc' }>({
    col: 'health_ratio',
    dir: 'asc',
  });
  const itemGroupsQuery = useWMSItemGroups();

  const itemGroups = useMemo(
    () => itemGroupsQuery.data?.item_groups.map((group) => group.name).filter(Boolean) ?? [],
    [itemGroupsQuery.data],
  );

  const defaultItemGroup = useMemo(
    () => findDefaultMaterialGroup(itemGroups, (group) => group) ?? DEFAULT_MATERIAL_TYPE_NAME,
    [itemGroups],
  );

  const materialTypesResolved = Boolean(itemGroupsQuery.data) || itemGroupsQuery.isError;

  const effectiveFilters = useMemo<StockDashboardFilters>(
    () => ({
      ...filters,
      item_group: filters.item_group ?? defaultItemGroup,
    }),
    [defaultItemGroup, filters],
  );

  const handleFiltersChange = useCallback((f: StockDashboardFilters) => {
    setFilters(f);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((col: StockSortCol, dir: 'asc' | 'desc') => {
    setSort({ col, dir });
    setPage(1);
  }, []);

  const handleStatusCardSelect = useCallback((statuses: StockHealthStatus[]) => {
    setFilters((current) => ({
      ...current,
      status: [...statuses],
      movement_status: [...DEFAULT_STOCK_MOVEMENT_FILTER],
    }));
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

  const query = useStockLevels(
    { ...effectiveFilters, sort_by: sort.col, sort_dir: sort.dir, page },
    materialTypesResolved,
  );
  const statsQuery = useStockLevels(
    {
      item_group: defaultItemGroup,
      warehouse: [...DEFAULT_STOCK_WAREHOUSE_FILTER],
      status: [...STOCK_BENCHMARK_STATS_STATUS_FILTER],
      movement_status: [...DEFAULT_STOCK_MOVEMENT_FILTER],
      ...(effectiveFilters.as_of_date ? { as_of_date: effectiveFilters.as_of_date } : {}),
      page: 1,
      page_size: 1,
    },
    materialTypesResolved,
  );
  const meta = query.data?.meta;
  const statsMeta = statsQuery.data?.meta;
  const latestWarehouses =
    meta?.warehouses && meta.warehouses.length > 0
      ? meta.warehouses
      : statsMeta?.warehouses && statsMeta.warehouses.length > 0
        ? statsMeta.warehouses
        : undefined;
  const sapError = query.error ?? statsQuery.error;
  const hasSAPError = sapError && isSAPError(sapError);

  const [isExporting, setIsExporting] = useState(false);
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await stockLevelApi.exportStockLevels({
        ...effectiveFilters,
        sort_by: sort.col,
        sort_dir: sort.dir,
      });
      const stamp = effectiveFilters.as_of_date ?? new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock_benchmark_${stamp}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Could not export stock benchmark');
    } finally {
      setIsExporting(false);
    }
  }, [effectiveFilters, sort]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Stock Benchmark"
        description="Inventory items with benchmark levels — monitor on-hand vs. benchmark requirements"
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleExport()}
          disabled={isExporting || Boolean(hasSAPError)}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export Excel'}
        </Button>
      </DashboardHeader>

      <StockLevelFilters
        onFiltersChange={handleFiltersChange}
        isFetching={itemGroupsQuery.isFetching || query.isFetching || statsQuery.isFetching}
        defaultValues={effectiveFilters}
        warehouses={latestWarehouses ?? []}
        itemGroups={itemGroups}
        defaultItemGroup={defaultItemGroup}
        externalResetSignal={filterResetSignal}
      />

      {hasSAPError && (
        <SAPUnavailableBanner
          error={sapError as ApiError}
          onRetry={() => {
            void query.refetch();
            void statsQuery.refetch();
          }}
        />
      )}

      {!hasSAPError && (
        <>
          <StockLevelMetaCards
            meta={statsMeta}
            activeStatuses={effectiveFilters.status}
            onStatusSelect={handleStatusCardSelect}
          />
          <StockLevelTable
            items={query.data?.data ?? []}
            isLoading={query.isLoading || query.isFetching}
            page={page}
            totalPages={meta?.total_pages ?? 1}
            totalItems={meta?.total_items ?? 0}
            onPageChange={setPage}
            selectedWarehouses={filters.warehouse}
            sortCol={sort.col}
            sortDir={sort.dir}
            onSortChange={handleSortChange}
            onSearchSelect={handleItemSearchSelect}
          />
        </>
      )}
    </div>
  );
}
