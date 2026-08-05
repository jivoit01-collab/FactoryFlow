import { ArrowLeft } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import {
  useProductionMovementReport,
  useProductionMovementWarehouseBalanceReports,
} from '../api';
import {
  ProductionMovementItemPicker,
  ProductionMovementPositionFilters,
  ProductionMovementPositionGrid,
  type WarehousePosition,
} from '../components';
import {
  getDefaultProductionMovementFilters,
  getPositionBalanceFilters,
  POSITION_WAREHOUSE_CODES,
  POSITION_WAREHOUSES,
} from '../constants';
import type { ProductionMovementFilters } from '../types';
import { deriveRecentItems } from '../utils';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

interface PositionDateRange {
  date_from: string;
  date_to: string;
}

interface SelectedItem {
  code: string;
  name: string;
}

export default function ProductionMovementDashboardPage() {
  const [range, setRange] = useState<PositionDateRange>(() => {
    const defaults = getDefaultProductionMovementFilters();
    return { date_from: defaults.date_from, date_to: defaults.date_to };
  });
  const [itemCode, setItemCode] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  const debouncedItemCode = useDebounce(itemCode, 400);
  const debouncedWarehouse = useDebounce(warehouse, 400);

  // ----- Recent items (picker view) -----
  const recentFilters = useMemo<ProductionMovementFilters>(
    () => ({
      date_from: range.date_from,
      date_to: range.date_to,
      direction: 'out',
      production_only: false,
      limit: 500,
      search: debouncedItemCode.trim().toUpperCase() || undefined,
      warehouse: debouncedWarehouse.trim().toUpperCase() || undefined,
    }),
    [range.date_from, range.date_to, debouncedItemCode, debouncedWarehouse],
  );

  const recentQuery = useProductionMovementReport(recentFilters, !selectedItem);
  const recentItems = useMemo(
    () => deriveRecentItems(recentQuery.data?.data ?? []),
    [recentQuery.data],
  );

  // ----- Item position (detail view) -----
  const balanceFilters = useMemo<ProductionMovementFilters>(
    () => ({
      ...getPositionBalanceFilters(range.date_from, range.date_to),
      search: selectedItem?.code,
    }),
    [range.date_from, range.date_to, selectedItem?.code],
  );

  const balanceQueries = useProductionMovementWarehouseBalanceReports(
    balanceFilters,
    POSITION_WAREHOUSE_CODES,
    Boolean(selectedItem),
  );

  const positions = useMemo<WarehousePosition[]>(() => {
    return POSITION_WAREHOUSES.map((wh, index) => {
      const query = balanceQueries[index];
      const summary = query?.data?.summary;

      return {
        code: wh.code,
        name: wh.name,
        opening: summary?.opening_qty ?? 0,
        received: summary?.total_in_qty ?? 0,
        issued: summary?.total_out_qty ?? 0,
        closing: summary?.closing_qty ?? 0,
        isLoading: Boolean(query?.isLoading),
        isError: Boolean(query?.error),
      };
    });
  }, [balanceQueries]);

  const sapError = selectedItem
    ? balanceQueries.find((query) => query.error)?.error
    : recentQuery.error;
  const isFetching = selectedItem
    ? balanceQueries.some((query) => query.isFetching)
    : recentQuery.isFetching;

  const handleLoadItem = useCallback(() => {
    const code = itemCode.trim().toUpperCase();
    if (!code) return;
    const match = recentItems.find((item) => item.item_code === code);
    setSelectedItem({ code, name: match?.item_name ?? '' });
  }, [itemCode, recentItems]);

  const handleClear = useCallback(() => {
    setItemCode('');
    setWarehouse('');
  }, []);

  const handleRetry = useCallback(() => {
    if (selectedItem) {
      balanceQueries.forEach((query) => query.refetch());
    } else {
      recentQuery.refetch();
    }
  }, [selectedItem, balanceQueries, recentQuery]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Production Movement"
        description="Item-wise warehouse position: opening + received - issued = closing"
      />

      <ProductionMovementPositionFilters
        range={range}
        isFetching={isFetching}
        onRangeChange={setRange}
      />

      {sapError && isSAPError(sapError) ? (
        <SAPUnavailableBanner error={sapError as ApiError} onRetry={handleRetry} />
      ) : selectedItem ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedItem(null)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to items
            </Button>
            <div>
              <div className="text-lg font-bold">{selectedItem.code}</div>
              {selectedItem.name && (
                <div className="text-sm text-muted-foreground">{selectedItem.name}</div>
              )}
            </div>
          </div>

          <ProductionMovementPositionGrid positions={positions} />
        </div>
      ) : (
        <ProductionMovementItemPicker
          itemCode={itemCode}
          warehouse={warehouse}
          recentItems={recentItems}
          isLoading={recentQuery.isLoading || recentQuery.isFetching}
          onItemCodeChange={setItemCode}
          onWarehouseChange={setWarehouse}
          onLoadItem={handleLoadItem}
          onClear={handleClear}
          onSelectItem={(item) =>
            setSelectedItem({ code: item.item_code, name: item.item_name })
          }
        />
      )}
    </div>
  );
}
