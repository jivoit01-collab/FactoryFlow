import { AlertTriangle, Boxes, Download, IndianRupee, Layers, RefreshCw, Ruler } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { ACCENTS, DashboardError, DashboardHeader, KpiStat } from '@/shared/components/dashboard';
import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import { formatInrCompact, formatQtyCompact } from '../../packing-material/utils';
import { useBeveragesPmStock } from '../api';
import { PiecesFamilyBars, PiecesItemTable, PiecesWarehouseStrip } from '../components';
import type { PiecesFilters } from '../types';
import {
  DEFAULT_FILTERS,
  exportBeveragesPmStock,
  filterPiecesRows,
  sumPiecesRows,
  toggleIn,
} from '../utils';

function isSAPError(error: unknown): error is ApiError {
  const status = (error as ApiError)?.status;
  return status === 502 || status === 503;
}

function stampOf(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

/**
 * Beverages PM Stock.
 *
 * All the packaging Beverages holds, in every warehouse SAP says holds any,
 * counted in PIECES. Each item is converted through its own SAP unit group;
 * one that SAP gives no piece unit is listed in its own unit and kept out of
 * every pieces figure, because a kilo of shrink film is not one more bottle.
 *
 * One request. The stores, families, search and unit filters all work on that
 * one answer in the browser, and the export writes what the table is showing.
 */
export default function BeveragesPmStockPage() {
  const stockQuery = useBeveragesPmStock();
  const stock = stockQuery.data;
  const [filters, setFilters] = useState<PiecesFilters>(DEFAULT_FILTERS);

  const patch = useCallback(
    (next: Partial<PiecesFilters>) => setFilters((current) => ({ ...current, ...next })),
    [],
  );

  const rows = useMemo(() => (stock ? filterPiecesRows(stock.items, filters) : []), [stock, filters]);
  const totals = useMemo(() => sumPiecesRows(rows), [rows]);
  // The family split ignores its own filter, so a picked family does not
  // collapse the bars to one and leave nothing else to pick.
  const familyRows = useMemo(
    () => (stock ? filterPiecesRows(stock.items, { ...filters, families: [] }) : []),
    [stock, filters],
  );

  const groupMismatch = stock ? !stock.meta.pm_item_group_matches : false;
  const otherError =
    stockQuery.error && !isSAPError(stockQuery.error) ? (stockQuery.error as ApiError) : null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <DashboardHeader
        title="Beverages PM Stock"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void stockQuery.refetch()}
          disabled={stockQuery.isFetching}
        >
          <RefreshCw className={cn('mr-1.5 h-4 w-4', stockQuery.isFetching && 'animate-spin')} />
          Refresh
        </Button>
        <Button
          size="sm"
          disabled={!stock}
          onClick={() => stock && exportBeveragesPmStock(stock, rows, stampOf(stock.meta.fetched_at))}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Export Excel
        </Button>
      </DashboardHeader>

      {isSAPError(stockQuery.error) && (
        <SAPUnavailableBanner error={stockQuery.error} onRetry={() => void stockQuery.refetch()} />
      )}

      {otherError && !stock && (
        <DashboardError
          message={otherError.message}
          isPermissionError={otherError.status === 403}
          onRetry={() => void stockQuery.refetch()}
        />
      )}

      {groupMismatch && stock && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            SAP item group {stock.meta.pm_item_group} is now called{' '}
            <span className="font-medium">{stock.meta.pm_item_group_name || '(no name)'}</span>, not
            &ldquo;PACKAGING MATERIAL&rdquo;. Every figure here is still counted on group{' '}
            {stock.meta.pm_item_group}.
          </span>
        </p>
      )}

      {stockQuery.isLoading && !stock ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              style={{ animationDelay: `${index * 60}ms` }}
              className="h-[8.5rem] animate-pulse rounded-2xl border border-border/60 bg-muted/40"
            />
          ))}
        </div>
      ) : stock ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiStat
              icon={Boxes}
              accent={ACCENTS.blue}
              label="Total PM stock"
              value={`${formatQtyCompact(stock.total.pcs_qty)} pcs`}
              sub={`across ${stock.total.warehouse_count} warehouses`}
            />
            <KpiStat
              icon={IndianRupee}
              accent={ACCENTS.teal}
              delayMs={60}
              label="Stock value"
              value={formatInrCompact(stock.total.stock_value)}
              sub="every item, converted or not"
            />
            <KpiStat
              icon={Layers}
              accent={ACCENTS.violet}
              delayMs={120}
              label="Items in stock"
              value={stock.total.item_count}
              sub={`${stock.total.converted_item_count} counted in pieces`}
            />
            <KpiStat
              icon={Ruler}
              accent={ACCENTS.amber}
              delayMs={180}
              label="Not in pieces"
              value={stock.total.unconverted_item_count}
              sub={
                stock.total.unconverted_item_count
                  ? `${formatInrCompact(stock.total.unconverted_value)} · no piece unit in SAP`
                  : 'every item converts to pieces'
              }
              onClick={
                stock.total.unconverted_item_count
                  ? () => patch({ unit: filters.unit === 'unconverted' ? 'all' : 'unconverted' })
                  : undefined
              }
            />
          </div>

          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">Warehouses</h3>
              <p className="text-xs text-muted-foreground">Click a warehouse to filter</p>
            </div>
            <PiecesWarehouseStrip
              warehouses={stock.warehouses}
              selected={filters.warehouses}
              onToggle={(code) => patch({ warehouses: toggleIn(filters.warehouses, code) })}
            />
          </section>

          {/* One fixed-height row from 1280px: both panels fill it and scroll
              inside, so neither leaves a gap under a shorter list. */}
          <div className="grid gap-6 xl:h-[80vh] xl:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] xl:grid-rows-1">
            <PiecesFamilyBars
              rows={familyRows}
              selected={filters.families}
              onToggle={(family) => patch({ families: toggleIn(filters.families, family) })}
            />
            <PiecesItemTable
              rows={rows}
              totals={totals}
              itemCount={stock.total.item_count}
              filters={filters}
              onFiltersChange={patch}
              onClear={() => setFilters((current) => ({ ...DEFAULT_FILTERS, sort: current.sort }))}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
