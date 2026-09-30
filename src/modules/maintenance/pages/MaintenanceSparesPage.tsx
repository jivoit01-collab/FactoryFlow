import {
  ChevronDown,
  CircleCheck,
  HandHelping,
  PackageOpen,
  PackagePlus,
  Search,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useMaintenanceSpares, useMaterialIndents, useSpareRequests } from '../api';
import {
  CountDialog,
  formatQty,
  GiveOutDialog,
  ItemDialog,
  ItemFormDialog,
  lineLabel,
  linesToReceive,
  ReceiveDialog,
  stockLevel,
  StockLevelBadge,
  toNumber,
} from '../components/store';
import type { MaintenanceSpare, MaterialIndent, SpareRequest } from '../types';

/*
 * The store keeper's page. It answers "what do I do now?" before anything
 * else: goods the gate let in wait under To do with one Receive button each,
 * and a work order's request waits there with one Give button. Below that is
 * the stock itself — search, how many, where kept, Give out.
 *
 * Nothing here waits on the shelf count. Until the store's real stock is
 * entered, what goes out comes off even below zero (the backend's
 * ALLOW_NEGATIVE_STOCK), and such an item shows red, "Below 0".
 */

const ACTIVE_SPARES = { is_active: true };
const AT_GATE = { status: 'GATE_IN' as const };
const ON_THE_WAY = { status: 'PURCHASED' as const };
const OPEN_REQUESTS = { is_active: true };

type StoreDialog =
  | { kind: 'receive'; indent: MaterialIndent }
  | { kind: 'item'; spareId: number }
  | { kind: 'give'; spareId: number; request?: SpareRequest; fromItem?: boolean }
  | { kind: 'count'; spareId: number; fromItem?: boolean }
  | { kind: 'form'; spareId?: number; name?: string; fromItem?: boolean };

function indentSummary(indent: MaterialIndent) {
  return linesToReceive(indent)
    .map((line) => `${lineLabel(line)} ${formatQty(line.shortfall_quantity)} ${line.unit}`)
    .join(' · ');
}

function isWaiting(request: SpareRequest) {
  return (
    request.status !== 'CLOSED' &&
    request.status !== 'CANCELLED' &&
    toNumber(request.pending_issue_qty) > 0
  );
}

function matches(spare: MaintenanceSpare, query: string) {
  return [spare.name, spare.part_number, spare.storage_location, spare.sap_item_code].some(
    (value) => value?.toLowerCase().includes(query),
  );
}

export default function MaintenanceSparesPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_SPARE);
  const canReceive = hasPermission(MAINTENANCE_PERMISSIONS.RECEIVE_MATERIAL_INDENT);

  const sparesQuery = useMaintenanceSpares(ACTIVE_SPARES);
  const atGateQuery = useMaterialIndents(AT_GATE, canReceive);
  const onTheWayQuery = useMaterialIndents(ON_THE_WAY, canReceive);
  const requestsQuery = useSpareRequests(OPEN_REQUESTS, canManage);

  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [dialog, setDialog] = useState<StoreDialog | null>(null);

  const spares = useMemo(
    () => [...(sparesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [sparesQuery.data],
  );
  const spareById = useMemo(() => new Map(spares.map((spare) => [spare.id, spare])), [spares]);
  const atGate = canReceive ? (atGateQuery.data ?? []) : [];
  const onTheWay = canReceive ? (onTheWayQuery.data ?? []) : [];
  const waiting = canManage ? (requestsQuery.data ?? []).filter(isWaiting) : [];
  const lowCount = spares.filter((spare) => stockLevel(spare) !== 'ok').length;

  const query = search.trim().toLowerCase();
  const shown = spares.filter(
    (spare) => (!lowOnly || stockLevel(spare) !== 'ok') && (!query || matches(spare, query)),
  );

  // A dialog opened from an item's own window goes back to it when done.
  const closeTo = (fromItem: boolean | undefined, spareId: number | undefined) => () =>
    setDialog(fromItem && spareId ? { kind: 'item', spareId } : null);

  const dialogSpare =
    dialog && 'spareId' in dialog && dialog.spareId ? spareById.get(dialog.spareId) : undefined;

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <DashboardHeader title="Store">
        {canManage && (
          <Button size="lg" onClick={() => setDialog({ kind: 'form' })}>
            <PackagePlus />
            Add item
          </Button>
        )}
      </DashboardHeader>

      {(canReceive || canManage) && (
        <section aria-labelledby="store-todo" className="space-y-3">
          <h3 id="store-todo" className="text-lg font-semibold">
            To do
          </h3>
          {atGate.length === 0 && waiting.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-card p-4 text-base text-muted-foreground dark:border-border">
              <CircleCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Nothing to do now.
            </p>
          ) : (
            <ul className="space-y-3">
              {atGate.map((indent) => (
                <li
                  key={`receive-${indent.id}`}
                  className="flex flex-col gap-3 rounded-xl border-2 border-sky-200 bg-sky-50/60 p-4 sm:flex-row sm:items-center dark:border-sky-500/30 dark:bg-sky-500/10"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <PackageOpen className="mt-0.5 h-6 w-6 shrink-0 text-sky-600 dark:text-sky-400" />
                    <div className="min-w-0">
                      <p className="text-base font-semibold">
                        Goods at gate
                        {indent.requested_by_name && ` · for ${indent.requested_by_name}`}
                      </p>
                      <p className="text-sm text-muted-foreground">{indentSummary(indent)}</p>
                      <p className="text-xs text-muted-foreground">{indent.indent_no}</p>
                    </div>
                  </div>
                  <Button size="lg" onClick={() => setDialog({ kind: 'receive', indent })}>
                    <PackageOpen />
                    Receive
                  </Button>
                </li>
              ))}
              {waiting.map((request) => {
                const spare = spareById.get(request.spare);
                return (
                  <li
                    key={`give-${request.id}`}
                    className="flex flex-col gap-3 rounded-xl border-2 border-violet-200 bg-violet-50/60 p-4 sm:flex-row sm:items-center dark:border-violet-500/30 dark:bg-violet-500/10"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <HandHelping className="mt-0.5 h-6 w-6 shrink-0 text-violet-600 dark:text-violet-400" />
                      <div className="min-w-0">
                        <p className="text-base font-semibold">
                          Give {formatQty(request.pending_issue_qty)} {request.spare_uom} ·{' '}
                          {request.spare_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Work order {request.work_order_no}
                          {request.requested_by_name && ` · ${request.requested_by_name}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      disabled={!spare}
                      onClick={() =>
                        spare && setDialog({ kind: 'give', spareId: spare.id, request })
                      }
                    >
                      <HandHelping />
                      Give
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          {onTheWay.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <Truck className="h-4 w-4" />
                {onTheWay.length} bought, not at gate yet
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200/80 bg-card text-sm dark:divide-border/60 dark:border-border">
                  {onTheWay.map((indent) => (
                    <li key={indent.id} className="px-3 py-2">
                      <span className="font-medium">{indentSummary(indent)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {indent.indent_no}
                        {indent.requested_by_name && ` · for ${indent.requested_by_name}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          )}
        </section>
      )}

      <section aria-labelledby="store-stock" className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h3 id="store-stock" className="text-lg font-semibold">
            Stock
          </h3>
          {spares.length > 0 && (
            <span className="text-sm text-muted-foreground">{spares.length} items</span>
          )}
        </div>

        {spares.length > 0 && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search stock"
                placeholder="Search item or place"
                className="h-12 pl-10 text-base"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {lowCount > 0 && (
              <Button
                type="button"
                size="lg"
                variant={lowOnly ? 'default' : 'outline'}
                aria-pressed={lowOnly}
                className="h-12"
                onClick={() => setLowOnly((current) => !current)}
              >
                Low ({lowCount})
              </Button>
            )}
          </div>
        )}

        {sparesQuery.isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : spares.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-border">
            <p className="text-base font-medium">Store is empty.</p>
            <p className="text-sm text-muted-foreground">
              {canReceive ? 'Receive goods, or add an item.' : 'Add an item to begin.'}
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-border">
            <p className="text-base font-medium">No item found.</p>
            {canManage && query && (
              <Button
                variant="outline"
                size="lg"
                className="mt-3"
                onClick={() => setDialog({ kind: 'form', name: search.trim() })}
              >
                <PackagePlus />
                Add “{search.trim()}”
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-card shadow-sm dark:divide-border/60 dark:border-border">
            {shown.map((spare) => {
              const stock = toNumber(spare.current_stock);
              return (
                <li key={spare.id} className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setDialog({ kind: 'item', spareId: spare.id })}
                  >
                    <span className="block truncate text-base font-semibold hover:underline">
                      {spare.name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {spare.storage_location || 'No place written'}
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-col items-end">
                    <span
                      className={cn(
                        'text-lg font-bold tabular-nums',
                        stock === 0 && 'text-muted-foreground',
                        stock < 0 && 'text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {formatQty(spare.current_stock)}{' '}
                      <span className="text-sm font-normal text-muted-foreground">{spare.uom}</span>
                    </span>
                    <StockLevelBadge spare={spare} />
                  </div>
                  {canManage && (
                    <Button
                      variant="outline"
                      className="shrink-0"
                      aria-label={`Give out ${spare.name}`}
                      onClick={() => setDialog({ kind: 'give', spareId: spare.id })}
                    >
                      <HandHelping />
                      Give
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {dialog?.kind === 'receive' && (
        <ReceiveDialog
          key={dialog.indent.id}
          indent={dialog.indent}
          onOpenChange={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'item' && dialogSpare && (
        <ItemDialog
          spare={dialogSpare}
          canManage={canManage}
          onGiveOut={() => setDialog({ kind: 'give', spareId: dialogSpare.id, fromItem: true })}
          onCount={() => setDialog({ kind: 'count', spareId: dialogSpare.id, fromItem: true })}
          onEdit={() => setDialog({ kind: 'form', spareId: dialogSpare.id, fromItem: true })}
          onOpenChange={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'give' && dialogSpare && (
        <GiveOutDialog
          spare={dialogSpare}
          request={dialog.request}
          onOpenChange={closeTo(dialog.fromItem, dialog.spareId)}
        />
      )}
      {dialog?.kind === 'count' && dialogSpare && (
        <CountDialog spare={dialogSpare} onOpenChange={closeTo(dialog.fromItem, dialog.spareId)} />
      )}
      {dialog?.kind === 'form' && (
        <ItemFormDialog
          spare={dialogSpare}
          initialName={dialog.name}
          onOpenChange={closeTo(dialog.fromItem, dialog.spareId)}
        />
      )}
    </div>
  );
}
