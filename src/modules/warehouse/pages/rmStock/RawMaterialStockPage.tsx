import {
  History,
  Loader2,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { RawMaterialStockRow } from '@/modules/warehouse/api';
import { useRemoveRMStock, useRMStock, useWMSWarehouses } from '@/modules/warehouse/api';
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
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/utils';

import { ImportSheetDialog } from './ImportSheetDialog';
import { SetQuantityDialog } from './SetQuantityDialog';
import { StockHistoryDialog } from './StockHistoryDialog';

const ALL = 'ALL';
// Only until the server's `register_warehouse` lands with the first response.
const REGISTER_WAREHOUSE_FALLBACK = 'BH-LO';

/**
 * The raw-material stock register — what each store states it is holding.
 *
 * SAP already carries an on-hand figure per item and warehouse, and this page
 * does not replace it. It records the floor's own figure, which in practice
 * differs: receipts booked late, material issued but not posted, stock moved
 * between stores without a document. The item and its SAP on-hand come from
 * SAP; the quantity is typed here and posted nowhere.
 *
 * Everyone with view access sees the whole register — a figure that changes
 * depending on who is looking cannot be reconciled against anything — but only
 * the manager of a warehouse can state quantities for it, so the Set buttons
 * appear per row.
 */
export default function RawMaterialStockPage() {
  const { hasPermission } = usePermission();
  const canSet = hasPermission(WAREHOUSE_PERMISSIONS.SET_RM_STOCK);

  // The register covers one warehouse, so the filter opens on it rather than
  // on "all" — showing a cross-warehouse view by default implies a spread of
  // stores that does not exist. "All" stays available for rows banked under
  // another code before the register was narrowed.
  const [warehouseFilter, setWarehouseFilter] = useState(REGISTER_WAREHOUSE_FALLBACK);
  const [searchInput, setSearchInput] = useState('');
  const [showRemoved, setShowRemoved] = useState(false);
  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<RawMaterialStockRow | null>(null);
  const [historyRow, setHistoryRow] = useState<RawMaterialStockRow | null>(null);
  const [dialogSeq, setDialogSeq] = useState(0);

  const search = useDebounce(searchInput);
  const { data, isLoading } = useRMStock({
    warehouseCode: warehouseFilter === ALL ? undefined : warehouseFilter,
    search: search.trim() || undefined,
    includeInactive: showRemoved,
  });
  const { data: warehouseData } = useWMSWarehouses();
  const removeRow = useRemoveRMStock();

  // Memoised, not `data?.rows ?? []`: a fresh empty array on every render would
  // re-run every useMemo below it.
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const warehouses = useMemo(() => warehouseData?.warehouses ?? [], [warehouseData]);

  // The register covers one warehouse — the bulk-oil store. The server decides
  // which, so the page cannot drift from it; BH-LO is only the fallback for a
  // list that has not loaded yet.
  const registerWarehouse = data?.register_warehouse ?? 'BH-LO';
  const registerWarehouseName = useMemo(
    () => warehouses.find((w) => w.code === registerWarehouse)?.name,
    [warehouses, registerWarehouse],
  );

  // Which warehouses this user may state a quantity for. The server is the
  // enforcement point; this only decides what the page offers, so that a keeper
  // is never sent to fill in a form their save would be refused for.
  const settableWarehouses = useMemo(() => {
    if (!data) return [];
    if (data.unrestricted) return warehouses;
    const managed = new Set(data.managed_warehouse_codes);
    // Fall back to the bare code when SAP's warehouse list has not loaded, so
    // an unreachable HANA does not empty the dropdown.
    const named = warehouses.filter((w) => managed.has(w.code));
    return named.length
      ? named
      : data.managed_warehouse_codes.map((code) => ({ code, name: code }));
  }, [data, warehouses]);

  const settableCodes = useMemo(
    () => new Set(settableWarehouses.map((w) => w.code)),
    [settableWarehouses],
  );
  const manages = (code: string) => !!data?.unrestricted || settableCodes.has(code);
  const managesNothing = canSet && !!data && !data.unrestricted && settableCodes.size === 0;

  const summary = useMemo(() => {
    const active = rows.filter((r) => r.is_active);
    return {
      items: active.length,
      warehouses: new Set(active.map((r) => r.warehouse_code)).size,
    };
  }, [rows]);

  function openSet(row: RawMaterialStockRow | null) {
    setEditing(row);
    // Bumping the sequence remounts the dialog, which is how its fields are
    // reset — a cancelled edit must not leak into the next one, and resetting
    // by effect on open is the version of this that gets subtly wrong.
    setDialogSeq((n) => n + 1);
    setSetDialogOpen(true);
  }

  async function handleRemove(row: RawMaterialStockRow) {
    const ok = await confirmDialog({
      title: `Take ${row.item_code} off the register?`,
      description: `It will no longer be listed for ${row.warehouse_code}. The quantities it has held are kept, and setting it again brings it back.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeRow.mutateAsync(row.id);
      toast.success(`${row.item_code} removed from ${row.warehouse_code}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove the item.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Raw Material Stock"
        description="The quantity of each raw material your store is holding"
        {...(canSet && !managesNothing
          ? {
              primaryAction: {
                label: 'Set a quantity',
                icon: <Plus className="mr-2 h-4 w-4" />,
                onClick: () => openSet(null),
              },
            }
          : {})}
      >
        {canSet && !managesNothing && (
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload sheet
          </Button>
        )}
      </DashboardHeader>

      {managesNothing && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            You can read the register but not change it: you are not set as the manager of any
            warehouse in this company. An administrator assigns that on Admin → Warehouse
            Managers.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="rm-filter-warehouse">Warehouse</Label>
          <NativeSelect
            id="rm-filter-warehouse"
            className="w-[220px]"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <SelectOption value={ALL}>All warehouses</SelectOption>
            {warehouses.map((w) => (
              <SelectOption key={w.code} value={w.code}>
                {w.code} — {w.name}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1">
          <Label htmlFor="rm-filter-search">Search</Label>
          <Input
            id="rm-filter-search"
            className="w-[260px]"
            placeholder="Item code or name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <label className="flex h-9 items-center gap-2 text-sm">
          <Checkbox
            checked={showRemoved}
            onCheckedChange={(checked) => setShowRemoved(checked === true)}
          />
          Show removed items
        </label>

        <p className="ml-auto pb-2 text-sm text-muted-foreground">
          {summary.items} item{summary.items === 1 ? '' : 's'} across {summary.warehouses}{' '}
          warehouse{summary.warehouses === 1 ? '' : 's'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the register…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search || warehouseFilter !== ALL
                ? 'No raw material matches those filters.'
                : 'Nothing on the register yet.'}
            </p>
            {canSet && !managesNothing && !search && warehouseFilter === ALL && (
              <Button className="mt-4" onClick={() => openSet(null)}>
                <Plus className="mr-2 h-4 w-4" /> Set the first quantity
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2">Warehouse</th>
                <th className="px-3 py-2">Raw material</th>
                <th className="px-3 py-2 text-right">Quantity</th>
                <th className="px-3 py-2">UoM</th>
                <th className="px-3 py-2">As of</th>
                <th className="px-3 py-2">Last set by</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b align-top hover:bg-muted/50 ${
                    row.is_active ? '' : 'opacity-60'
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium">
                    {row.warehouse_code}
                    {!row.is_active && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Removed
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-mono text-xs font-medium">{row.item_code}</p>
                    <p className="text-sm">{row.item_name}</p>
                    {row.remarks && (
                      <p className="mt-1 max-w-[22rem] text-xs text-muted-foreground">
                        {row.remarks}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{row.qty}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.uom || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.as_of_date}</td>
                  <td className="px-3 py-2">
                    <p>{row.set_by_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.updated_at).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setHistoryRow(row)}
                      >
                        <History className="mr-1 h-3 w-3" /> History
                      </Button>
                      {canSet && manages(row.warehouse_code) && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => openSet(row)}
                          >
                            {row.is_active ? (
                              <>
                                <Pencil className="mr-1 h-3 w-3" /> Set qty
                              </>
                            ) : (
                              <>
                                <RotateCcw className="mr-1 h-3 w-3" /> Restore
                              </>
                            )}
                          </Button>
                          {row.is_active && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-600"
                              disabled={removeRow.isPending}
                              aria-label={`Remove ${row.item_code} from ${row.warehouse_code}`}
                              onClick={() => handleRemove(row)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SetQuantityDialog
        key={dialogSeq}
        open={setDialogOpen}
        onOpenChange={(open) => {
          setSetDialogOpen(open);
          if (!open) setEditing(null);
        }}
        registerWarehouse={registerWarehouse}
        registerWarehouseName={registerWarehouseName}
        editing={editing}
      />

      <ImportSheetDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        registerWarehouse={registerWarehouse}
      />

      <StockHistoryDialog row={historyRow} onClose={() => setHistoryRow(null)} />
    </div>
  );
}
