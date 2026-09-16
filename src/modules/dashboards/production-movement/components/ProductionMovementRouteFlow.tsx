import { ArrowRight, ArrowRightLeft, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

import type { WMSTransferLine, WMSTransferRoute } from '@/modules/warehouse/types';
import { Badge } from '@/shared/components/ui';

import { useProductionMovementSkuBalanceReports } from '../api';
import { PRODUCTION_FLOW_ROUTES, type ProductionFlowRouteDefinition } from '../constants';
import type { ProductionMovementFilters } from '../types';

interface FlowRouteRow extends ProductionFlowRouteDefinition {
  openingQty?: number;
  closingQty?: number;
  sourceOutQty: number;
  targetInQty: number;
  movementQty: number;
  transferCount: number;
  lineCount: number;
  skuRows: SkuRouteRow[];
}

interface WarehouseBalance {
  openingQty: number;
  closingQty: number;
}

interface SkuRouteRow {
  key: string;
  itemCode: string;
  itemName: string;
  sourceOutQty: number;
  targetInQty: number;
  movementQty: number;
  transferCount: number;
  lineCount: number;
}

interface ProductionMovementRouteFlowProps {
  balanceFilters?: ProductionMovementFilters;
  transferLines?: WMSTransferLine[];
  transferRoutes?: WMSTransferRoute[];
  warehouseBalances?: Record<string, WarehouseBalance>;
  isLoading?: boolean;
}

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

function normalizeWarehouse(code: string): string {
  return code.trim().toUpperCase();
}

function matchesRoute(
  route: Pick<WMSTransferRoute | WMSTransferLine, 'from_warehouse' | 'to_warehouse'>,
  definition: ProductionFlowRouteDefinition,
): boolean {
  const fromWarehouse = normalizeWarehouse(route.from_warehouse);
  const toWarehouse = normalizeWarehouse(route.to_warehouse);
  return definition.fromCodes.includes(fromWarehouse) && definition.toCodes.includes(toWarehouse);
}

function formatCodes(codes: string[]): string {
  return codes.join(' / ');
}

function formatQuantity(value: number): string {
  return numberFormatter.format(value || 0);
}

function formatOptionalQuantity(value?: number): string {
  if (value === undefined) return '--';
  return formatQuantity(value);
}

export function ProductionMovementRouteFlow({
  balanceFilters,
  transferLines = [],
  transferRoutes = [],
  warehouseBalances = {},
  isLoading,
}: ProductionMovementRouteFlowProps) {
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(() => new Set());

  const rows = useMemo<FlowRouteRow[]>(() => {
    function sumTargetBalance(codes: string[], key: keyof WarehouseBalance): number | undefined {
      let found = false;
      const total = codes.reduce((sum, code) => {
        const balance = warehouseBalances[normalizeWarehouse(code)];
        if (!balance) return sum;
        found = true;
        return sum + balance[key];
      }, 0);

      return found ? total : undefined;
    }

    function buildTransferSkuRows(definition: ProductionFlowRouteDefinition): SkuRouteRow[] {
      const grouped = new Map<string, SkuRouteRow & { docNums: Set<number> }>();

      transferLines
        .filter((line) => matchesRoute(line, definition))
        .forEach((line) => {
          const itemCode = line.item_code.trim().toUpperCase();
          const itemIdentity = itemCode || line.item_name;
          const key = `transfer:${itemIdentity}`;
          const current = grouped.get(key) ?? {
            key,
            itemCode,
            itemName: line.item_name,
            sourceOutQty: 0,
            targetInQty: 0,
            movementQty: 0,
            transferCount: 0,
            lineCount: 0,
            docNums: new Set<number>(),
          };

          current.sourceOutQty += line.quantity;
          current.targetInQty += line.quantity;
          current.movementQty += line.quantity;
          current.lineCount += 1;
          current.docNums.add(line.doc_num);
          current.transferCount = current.docNums.size;
          grouped.set(key, current);
        });

      return Array.from(grouped.values())
        .map((row) => ({
          key: row.key,
          itemCode: row.itemCode,
          itemName: row.itemName,
          sourceOutQty: row.sourceOutQty,
          targetInQty: row.targetInQty,
          movementQty: row.movementQty,
          transferCount: row.transferCount,
          lineCount: row.lineCount,
        }))
        .sort((a, b) => b.movementQty - a.movementQty);
    }

    return PRODUCTION_FLOW_ROUTES.map((definition) => {
      const openingQty = sumTargetBalance(definition.toCodes, 'openingQty');
      const closingQty = sumTargetBalance(definition.toCodes, 'closingQty');

      const matchingRoutes = transferRoutes.filter((route) => matchesRoute(route, definition));
      const movementQty = matchingRoutes.reduce((total, route) => total + route.quantity, 0);

      return {
        ...definition,
        openingQty,
        closingQty,
        sourceOutQty: movementQty,
        targetInQty: movementQty,
        movementQty,
        transferCount: matchingRoutes.reduce((total, route) => total + route.transfer_count, 0),
        lineCount: matchingRoutes.reduce((total, route) => total + route.line_count, 0),
        skuRows: buildTransferSkuRows(definition),
      };
    });
  }, [transferLines, transferRoutes, warehouseBalances]);

  function toggleRoute(routeId: string) {
    setExpandedRoutes((current) => {
      const next = new Set(current);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          Production Flow Routes
        </h3>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Flow</th>
              <th className="px-5 py-3 text-left font-medium">Route</th>
              <th className="px-5 py-3 text-right font-medium">Opening Qty</th>
              <th className="px-5 py-3 text-right font-medium">Closing Qty</th>
              <th className="px-5 py-3 text-right font-medium">Out</th>
              <th className="px-5 py-3 text-right font-medium">In</th>
              <th className="px-5 py-3 text-right font-medium">Difference</th>
              <th className="px-5 py-3 text-right font-medium">Entries</th>
              <th className="px-5 py-3 text-left font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const hasMovement =
                row.sourceOutQty > 0 || row.targetInQty > 0 || row.movementQty > 0;
              const isExpanded = expandedRoutes.has(row.id);
              const canExpand = row.skuRows.length > 0;

              return (
                <Fragment key={row.id}>
                  <tr className="border-t">
                    <td className="whitespace-nowrap px-5 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => toggleRoute(row.id)}
                          disabled={!canExpand}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${row.label}`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <span>{row.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span>{formatCodes(row.fromCodes)}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>{formatCodes(row.toCodes)}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {formatOptionalQuantity(row.openingQty)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {formatOptionalQuantity(row.closingQty)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {formatQuantity(row.sourceOutQty)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {formatQuantity(row.targetInQty)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {formatQuantity(row.sourceOutQty - row.targetInQty)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {`${numberFormatter.format(row.transferCount)} / ${numberFormatter.format(
                        row.lineCount,
                      )}`}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge
                        variant="outline"
                        className={
                          hasMovement
                            ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'border-muted bg-muted/40 text-muted-foreground'
                        }
                      >
                        Transfer
                      </Badge>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-t bg-muted/20">
                      <td colSpan={9} className="p-0">
                        <div className="px-5 py-4">
                          <div className="overflow-hidden rounded-md border bg-background">
                            <SkuMovementTable row={row} balanceFilters={balanceFilters} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkuMovementTable({
  row,
  balanceFilters,
}: {
  row: FlowRouteRow;
  balanceFilters?: ProductionMovementFilters;
}) {
  const skuBalanceRequests = useMemo(() => {
    if (!balanceFilters) return [];

    return row.skuRows.flatMap((sku) => {
      const search = sku.itemCode || sku.itemName;
      if (!search) return [];

      return row.toCodes.map((warehouse) => ({
        key: `${row.id}|${sku.key}|${warehouse}`,
        search,
        skuKey: sku.key,
        warehouse,
      }));
    });
  }, [balanceFilters, row.id, row.skuRows, row.toCodes]);

  const skuBalanceQueries = useProductionMovementSkuBalanceReports(
    balanceFilters ?? {
      date_from: '',
      date_to: '',
      direction: 'all',
      production_only: false,
      limit: 1,
    },
    skuBalanceRequests,
    Boolean(balanceFilters),
  );

  const balancesBySku = useMemo(() => {
    return skuBalanceRequests.reduce<Map<string, WarehouseBalance>>((balances, request, index) => {
      const summary = skuBalanceQueries[index]?.data?.summary;
      if (!summary) return balances;

      const current = balances.get(request.skuKey) ?? { openingQty: 0, closingQty: 0 };
      balances.set(request.skuKey, {
        openingQty: current.openingQty + summary.opening_qty,
        closingQty: current.closingQty + summary.closing_qty,
      });

      return balances;
    }, new Map());
  }, [skuBalanceQueries, skuBalanceRequests]);

  const isBalanceLoading = skuBalanceQueries.some((query) => query.isLoading || query.isFetching);

  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/40 text-muted-foreground">
        <tr>
          <th className="px-4 py-2 text-left font-medium">
            <div className="flex items-center gap-2">
              <span>SKU</span>
              {isBalanceLoading && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
          </th>
          <th className="px-4 py-2 text-right font-medium">Opening Qty</th>
          <th className="px-4 py-2 text-right font-medium">Closing Qty</th>
          <th className="px-4 py-2 text-right font-medium">Out</th>
          <th className="px-4 py-2 text-right font-medium">In</th>
          <th className="px-4 py-2 text-right font-medium">Difference</th>
          <th className="px-4 py-2 text-right font-medium">Entries</th>
          <th className="px-4 py-2 text-left font-medium">Type</th>
        </tr>
      </thead>
      <tbody>
        {row.skuRows.map((sku) => {
          const balance = balancesBySku.get(sku.key);

          return (
            <tr key={sku.key} className="border-t">
              <td className="min-w-80 px-4 py-2">
                <div className="font-medium">{sku.itemName}</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {sku.itemCode || '-'}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                {formatOptionalQuantity(balance?.openingQty)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                {formatOptionalQuantity(balance?.closingQty)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                {formatQuantity(sku.sourceOutQty)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                {formatQuantity(sku.targetInQty)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                {formatQuantity(sku.sourceOutQty - sku.targetInQty)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                {`${numberFormatter.format(sku.transferCount)} / ${numberFormatter.format(
                  sku.lineCount,
                )}`}
              </td>
              <td className="whitespace-nowrap px-4 py-2">
                <Badge variant="outline" className="bg-background">
                  Transfer
                </Badge>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
