import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Factory,
  PackageCheck,
  RefreshCw,
  Warehouse,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';
import { formatCurrency, formatNumber } from '@/shared/utils';

import { useProductionStockBoard } from '../api';
import type { StockBoardWarehouse, WarehouseRoleType } from '../types';

function isSAPError(err: unknown): boolean {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

const ROLE_LABEL: Record<WarehouseRoleType, string> = {
  RM_STORE: 'RM Store',
  PM_STORE: 'PM Store',
  PRODUCTION_CONSUMPTION: 'Issue Point',
  FG_RECEIPT: 'FG Receipt',
  GR_STAGING: 'GR Staging',
  WASTAGE: 'Wastage',
  VIRTUAL: 'Virtual',
  INACTIVE: 'Inactive',
  OTHER: 'Other',
};

const ROLE_BADGE: Record<WarehouseRoleType, string> = {
  RM_STORE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  PM_STORE: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  PRODUCTION_CONSUMPTION:
    'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  FG_RECEIPT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  GR_STAGING: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  WASTAGE: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  VIRTUAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  INACTIVE: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  OTHER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

// The order warehouses appear along the material flow.
const FLOW_ORDER: WarehouseRoleType[] = [
  'PM_STORE',
  'PRODUCTION_CONSUMPTION',
  'FG_RECEIPT',
];

function WarehouseCard({ w }: { w: StockBoardWarehouse }) {
  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">
              {w.whs_code}
              {w.is_grpo_target && (
                <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                  GRPO
                </Badge>
              )}
              {w.is_bom_issue_point && (
                <Badge variant="outline" className="ml-1 align-middle text-[10px]">
                  BOM issue
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{w.warehouse_name}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_BADGE[w.role]}`}
          >
            {ROLE_LABEL[w.role]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">On-hand</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatNumber(w.total_on_hand, 0)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Value</span>
          <span className="text-sm tabular-nums">{formatCurrency(w.total_value)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Items</span>
          <span className="text-sm tabular-nums">{formatNumber(w.total_items, 0)}</span>
        </div>
        {w.feeds_whs_code && (
          <p className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
            feeds <ArrowRight className="h-3 w-3" /> {w.feeds_whs_code}
          </p>
        )}
        <div className="flex flex-wrap gap-1 pt-1">
          {!w.in_sap && (
            <Badge variant="outline" className="text-[10px] text-amber-600">
              not in SAP
            </Badge>
          )}
          {w.needs_review && (
            <Badge variant="outline" className="text-[10px] text-amber-600">
              needs review
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProductionStockBoardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useProductionStockBoard();
  const [showUnmapped, setShowUnmapped] = useState(false);

  const flowStages = useMemo(() => {
    const byRole = new Map<WarehouseRoleType, StockBoardWarehouse[]>();
    (data?.warehouses ?? []).forEach((w) => {
      const list = byRole.get(w.role) ?? [];
      list.push(w);
      byRole.set(w.role, list);
    });
    return FLOW_ORDER.map((role) => ({ role, items: byRole.get(role) ?? [] })).filter(
      (s) => s.items.length > 0,
    );
  }, [data]);

  const otherWarehouses = useMemo(
    () =>
      (data?.warehouses ?? []).filter(
        (w) => !FLOW_ORDER.includes(w.role),
      ),
    [data],
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Production Warehouse Stock"
        description="Live SAP on-hand for the production flow — GRPO → PM stores → issue point → finished goods (BH-PF)."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </DashboardHeader>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading stock…
        </div>
      )}

      {isError && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium">
                {isSAPError(error)
                  ? 'SAP is currently unavailable.'
                  : 'Could not load stock.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSAPError(error)
                  ? 'The stock figures come live from SAP HANA. Please try again shortly.'
                  : (error as ApiError)?.message || 'Unexpected error.'}
              </p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {data && !isLoading && (
        <>
          {/* Flow stages */}
          <div className="space-y-6">
            {flowStages.map((stage, idx) => (
              <section key={stage.role} className="space-y-2">
                <div className="flex items-center gap-2">
                  {stage.role === 'PM_STORE' && <Warehouse className="h-4 w-4" />}
                  {stage.role === 'PRODUCTION_CONSUMPTION' && <Factory className="h-4 w-4" />}
                  {stage.role === 'FG_RECEIPT' && <PackageCheck className="h-4 w-4" />}
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {idx + 1}. {ROLE_LABEL[stage.role]}
                    {stage.role === 'PM_STORE' && ' (packaging)'}
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {stage.items.map((w) => (
                    <WarehouseCard key={w.whs_code} w={w} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Other (inactive / virtual) warehouses in the config */}
          {otherWarehouses.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Other mapped warehouses
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {otherWarehouses.map((w) => (
                  <WarehouseCard key={w.whs_code} w={w} />
                ))}
              </div>
            </section>
          )}

          {/* Unmapped SAP warehouses holding stock */}
          {data.unmapped.length > 0 && (
            <section className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUnmapped((s) => !s)}
                className="text-muted-foreground"
              >
                {showUnmapped ? 'Hide' : 'Show'} {data.unmapped.length} unmapped warehouse(s)
                with stock
              </Button>
              {showUnmapped && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2 text-right">On-hand</th>
                        <th className="px-3 py-2 text-right">Value</th>
                        <th className="px-3 py-2 text-right">Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.unmapped.map((u) => (
                        <tr key={u.whs_code} className="border-t">
                          <td className="px-3 py-1.5 font-medium">{u.whs_code}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {u.warehouse_name}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatNumber(u.total_on_hand, 0)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatCurrency(u.total_value)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatNumber(u.total_items, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
