import {
  History,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { PFMovement } from '@/modules/warehouse/api';
import {
  useCancelPFMovement,
  usePFMovements,
  useRestorePFMovement,
  useWMSWarehouses,
} from '@/modules/warehouse/api';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/utils';

import { MovementFormDialog } from './MovementFormDialog';
import { MovementHistoryDialog } from './MovementHistoryDialog';

/** Only until the server's `default_from_warehouse` lands with the first response. */
const DEFAULT_FROM_WAREHOUSE_FALLBACK = 'BH-PF';

function firstOfMonth(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-01`;
}

/**
 * Godown stock movements — what a keeper says he is sending out and to where.
 *
 * This is a data-entry register, not a transfer flow. Nothing here posts to
 * SAP, reserves stock or seeds a branch transfer; it records the keeper's own
 * declaration so that a dashboard can later put it beside what SAP shows
 * actually moved. The move that has to happen *through* the system is Transfer
 * Requests.
 *
 * Everyone with view access sees every movement — a register whose totals
 * change depending on who is looking cannot be read against anything — but only
 * the manager of a floor may declare movements out of it, so the New button
 * appears only for a keeper with an assignment, and the row actions are gated
 * per row.
 */
export default function GodownMovementPage() {
  const { hasPermission } = usePermission();
  const canRecord = hasPermission(WAREHOUSE_PERMISSIONS.RECORD_PF_MOVEMENT);

  // Opens on the current month: the register grows a few entries a day, and a
  // page that loads every movement ever filed gets slower every week.
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PFMovement | null>(null);
  const [historyFor, setHistoryFor] = useState<PFMovement | null>(null);
  const [dialogSeq, setDialogSeq] = useState(0);

  const search = useDebounce(searchInput);
  const { data, isLoading } = usePFMovements({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: search.trim() || undefined,
    includeCancelled: showCancelled,
  });
  const { data: warehouseData } = useWMSWarehouses();
  const cancelMovement = useCancelPFMovement();
  const restoreMovement = useRestorePFMovement();

  // Memoised, not `data?.movements ?? []`: a fresh empty array on every render
  // would re-run every useMemo below it.
  const movements = useMemo(() => data?.movements ?? [], [data]);
  const warehouses = useMemo(() => warehouseData?.warehouses ?? [], [warehouseData]);

  const defaultFromWarehouse =
    data?.default_from_warehouse ?? DEFAULT_FROM_WAREHOUSE_FALLBACK;

  // Which floors this user may declare out of. The server is the enforcement
  // point; this only decides what the page offers, so a keeper is never sent to
  // fill in a form his save would be refused for.
  const sourceWarehouses = useMemo(() => {
    if (!data) return [];
    if (data.unrestricted) return warehouses;
    const managed = new Set(data.managed_warehouse_codes);
    // Fall back to the bare codes when SAP's warehouse list has not loaded, so
    // an unreachable HANA does not empty the dropdown.
    const named = warehouses.filter((w) => managed.has(w.code));
    return named.length
      ? named
      : data.managed_warehouse_codes.map((code) => ({ code, name: code }));
  }, [data, warehouses]);

  const manages = (code: string) =>
    !!data?.unrestricted || sourceWarehouses.some((w) => w.code === code);
  const managesNothing = canRecord && !!data && !data.unrestricted && !sourceWarehouses.length;
  const canFile = canRecord && !managesNothing;

  function openForm(movement: PFMovement | null) {
    setEditing(movement);
    // Bumping the sequence remounts the dialog, which is how its fields are
    // reset — a cancelled edit must not leak into the next one, and resetting
    // by effect on open is the version of this that gets subtly wrong.
    setDialogSeq((n) => n + 1);
    setFormOpen(true);
  }

  async function handleCancel(movement: PFMovement) {
    const ok = await confirmDialog({
      title: `Retract ${movement.entry_no}?`,
      description: `The declaration that ${movement.total_boxes} box${
        movement.total_boxes === 1 ? '' : 'es'
      } were going to ${movement.to_warehouse} is kept and marked retracted, not deleted. You can put it back afterwards.`,
      confirmLabel: 'Retract',
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancelMovement.mutateAsync({ id: movement.id });
      toast.success(`${movement.entry_no} retracted`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not retract the movement.'));
    }
  }

  async function handleRestore(movement: PFMovement) {
    try {
      await restoreMovement.mutateAsync({ id: movement.id });
      toast.success(`${movement.entry_no} is back on the register`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not restore the movement.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Godown Stock Movements"
        description="What you are sending out of your godown, and to which godown"
        {...(canFile
          ? {
              primaryAction: {
                label: 'Record a movement',
                icon: <Plus className="mr-2 h-4 w-4" />,
                onClick: () => openForm(null),
              },
            }
          : {})}
      />

      {managesNothing && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            You can read the register but not add to it: you are not set as the manager of any
            godown in this company. An administrator assigns that on Admin → Warehouse
            Managers.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="pf-filter-from-date">Moving on or after</Label>
          <Input
            id="pf-filter-from-date"
            type="date"
            className="w-[170px]"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pf-filter-to-date">On or before</Label>
          <Input
            id="pf-filter-to-date"
            type="date"
            className="w-[170px]"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pf-filter-search">Search</Label>
          <Input
            id="pf-filter-search"
            className="w-[260px]"
            placeholder="Entry no, godown, item or vehicle…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <label className="flex h-9 items-center gap-2 text-sm">
          <Checkbox
            checked={showCancelled}
            onCheckedChange={(checked) => setShowCancelled(checked === true)}
          />
          Show retracted
        </label>

        <p className="ml-auto pb-2 text-sm text-muted-foreground">
          {data?.summary.movements ?? 0} movement
          {(data?.summary.movements ?? 0) === 1 ? '' : 's'},{' '}
          {(data?.summary.total_boxes ?? 0).toLocaleString()} box
          {(data?.summary.total_boxes ?? 0) === 1 ? '' : 'es'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the register…
        </div>
      ) : movements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search || dateTo ? 'No movement matches those filters.' : 'Nothing recorded yet.'}
            </p>
            {canFile && !search && (
              <Button className="mt-4" onClick={() => openForm(null)}>
                <Plus className="mr-2 h-4 w-4" /> Record the first movement
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {movements.map((movement) => (
            <Card key={movement.id} className={movement.is_active ? '' : 'opacity-60'}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-medium">{movement.entry_no}</p>
                      <Badge variant="outline" className="text-xs">
                        {movement.movement_date}
                      </Badge>
                      {!movement.is_active && (
                        <Badge className="bg-red-100 text-xs text-red-800">Retracted</Badge>
                      )}
                      {movement.is_cross_company && (
                        <Badge variant="outline" className="text-xs">
                          to {movement.to_company_name}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm">
                      <span className="font-medium">{movement.from_warehouse}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">{movement.to_warehouse}</span>
                      {movement.to_warehouse_name && (
                        <span className="text-muted-foreground">
                          {' '}
                          {movement.to_warehouse_name}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {movement.line_count} item{movement.line_count === 1 ? '' : 's'},{' '}
                      {movement.total_boxes.toLocaleString()} box
                      {movement.total_boxes === 1 ? '' : 'es'}
                      {movement.vehicle_no ? ` · ${movement.vehicle_no}` : ''}
                      {movement.created_by_name ? ` · ${movement.created_by_name}` : ''}
                    </p>
                    {movement.remarks && (
                      <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
                        {movement.remarks}
                      </p>
                    )}
                    {!movement.is_active && movement.cancellation_reason && (
                      <p className="mt-1 max-w-2xl text-xs text-red-700">
                        Retracted: {movement.cancellation_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setHistoryFor(movement)}
                    >
                      <History className="mr-1 h-3 w-3" /> History
                    </Button>
                    {canRecord && manages(movement.from_warehouse) && (
                      <>
                        {movement.is_active ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => openForm(movement)}
                            >
                              <Pencil className="mr-1 h-3 w-3" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-600"
                              disabled={cancelMovement.isPending}
                              aria-label={`Retract ${movement.entry_no}`}
                              onClick={() => handleCancel(movement)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={restoreMovement.isPending}
                            onClick={() => handleRestore(movement)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" /> Put back
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {movement.lines.length > 0 && (
                  <div className="mt-3 overflow-x-auto border-t pt-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="px-2 py-1">Item</th>
                          <th className="px-2 py-1 text-right">Boxes</th>
                          <th className="px-2 py-1 text-right">Pieces</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movement.lines.map((line) => (
                          <tr key={line.id} className="align-top">
                            <td className="px-2 py-1">
                              <span className="font-mono text-xs">{line.item_code}</span>
                              <span className="ml-2">{line.item_name}</span>
                            </td>
                            <td className="px-2 py-1 text-right font-medium tabular-nums">
                              {line.boxes.toLocaleString()}
                            </td>
                            {/* An em dash, not 0: SAP had no pack size to
                                snapshot, which is not a piece count of zero. */}
                            <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                              {line.pieces != null ? line.pieces.toLocaleString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MovementFormDialog
        key={dialogSeq}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        sourceWarehouses={sourceWarehouses}
        defaultFromWarehouse={defaultFromWarehouse}
        editing={editing}
      />

      <MovementHistoryDialog
        movement={historyFor}
        onClose={() => setHistoryFor(null)}
      />
    </div>
  );
}
