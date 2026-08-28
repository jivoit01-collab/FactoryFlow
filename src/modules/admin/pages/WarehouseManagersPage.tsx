import { AlertTriangle, Loader2, Save, Trash2, Warehouse } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useCompanyUsers } from '@/modules/notifications/api/sendNotification.queries';
import {
  useAssignWarehouses,
  useRemoveUserWarehouse,
  useUserWarehouses,
  useWarehouseScopeGaps,
  useWMSWarehouses,
} from '@/modules/warehouse/api';
import { DashboardHeader } from '@/shared/components';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Label,
  MultiSelect,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

interface PickableUser {
  id: number;
  full_name: string;
  email: string;
}

/**
 * Which warehouses each user is the manager of.
 *
 * This is what decides who may raise a transfer out of a warehouse and who may
 * accept one coming into it, so it is deliberately an admin-only screen —
 * letting a warehouse manager widen their own scope would defeat the point.
 *
 * A user with no row here is blocked from moving stock at all, which is why the
 * unassigned warning is at the top rather than buried: a missing assignment is
 * not a cosmetic gap, it is somebody who cannot work.
 */
export default function WarehouseManagersPage() {
  const { data: users = [], isLoading: usersLoading } = useCompanyUsers();
  const { data: warehouseData, isLoading: warehousesLoading } = useWMSWarehouses();
  const { data: assignments = [], isLoading: assignmentsLoading } = useUserWarehouses();

  const assign = useAssignWarehouses();
  const remove = useRemoveUserWarehouse();

  const [selectedUser, setSelectedUser] = useState<PickableUser | null>(null);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);

  const warehouseOptions = useMemo(
    () =>
      (warehouseData?.warehouses ?? []).map((w) => ({
        value: w.code,
        label: `${w.code} — ${w.name}`,
      })),
    [warehouseData],
  );

  // One row per user, warehouses folded in, because the question people ask of
  // this screen is "what does this person run", not "list every pairing".
  const byUser = useMemo(() => {
    const map = new Map<
      number,
      { name: string; email: string; code: string; rows: typeof assignments }
    >();
    for (const row of assignments) {
      if (!row.is_active) continue;
      const entry = map.get(row.user) ?? {
        name: row.user_name,
        email: row.user_email,
        code: row.user_code,
        rows: [],
      };
      entry.rows = [...entry.rows, row];
      map.set(row.user, entry);
    }
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [assignments]);

  const alreadyAssigned = useMemo(() => {
    if (!selectedUser) return new Set<string>();
    return new Set(
      assignments
        .filter((r) => r.user === selectedUser.id && r.is_active)
        .map((r) => r.warehouse_code),
    );
  }, [assignments, selectedUser]);

  async function handleAssign() {
    if (!selectedUser) {
      toast.error('Choose a user first.');
      return;
    }
    if (selectedWarehouses.length === 0) {
      toast.error('Choose at least one warehouse.');
      return;
    }
    try {
      const result = await assign.mutateAsync({
        user: selectedUser.id,
        warehouse_codes: selectedWarehouses,
      });
      const added = [...result.created, ...result.reactivated];
      toast.success(
        added.length
          ? `${selectedUser.full_name} now manages ${added.join(', ')}`
          : `${selectedUser.full_name} already managed those warehouses`,
      );
      setSelectedWarehouses([]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the assignment.'));
    }
  }

  async function handleRemove(id: number, userName: string, warehouse: string) {
    try {
      await remove.mutateAsync(id);
      toast.success(`${userName} no longer manages ${warehouse}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove the assignment.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Warehouse Managers"
        description="Who may send stock out of, and accept it into, each warehouse"
      />

      <UnassignedWarning />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Warehouse className="h-4 w-4" /> Assign a manager
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="wm-user">User</Label>
              <SearchableSelect<PickableUser>
                items={users as PickableUser[]}
                isLoading={usersLoading}
                inputId="wm-user"
                value={selectedUser ? String(selectedUser.id) : ''}
                defaultDisplayText={selectedUser?.full_name ?? ''}
                placeholder="Search a user…"
                getItemKey={(u) => String(u.id)}
                getItemLabel={(u) => u.full_name || u.email}
                filterFn={(u, term) => {
                  const needle = term.trim().toLowerCase();
                  if (!needle) return true;
                  return (
                    (u.full_name ?? '').toLowerCase().includes(needle) ||
                    (u.email ?? '').toLowerCase().includes(needle)
                  );
                }}
                renderItem={(u) => (
                  <div className="w-full">
                    <div className="truncate text-sm font-medium">{u.full_name || u.email}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  </div>
                )}
                loadingText="Loading users…"
                emptyText="No users found"
                notFoundText="No user matches that"
                onItemSelect={(u) => {
                  setSelectedUser(u);
                  setSelectedWarehouses([]);
                }}
                onClear={() => {
                  setSelectedUser(null);
                  setSelectedWarehouses([]);
                }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="wm-warehouses">Warehouses</Label>
              <MultiSelect
                id="wm-warehouses"
                options={warehouseOptions}
                selected={selectedWarehouses}
                onChange={setSelectedWarehouses}
                searchable
                searchPlaceholder="Search warehouses…"
                placeholder={warehousesLoading ? 'Loading…' : 'Choose warehouses'}
              />
              {selectedUser && alreadyAssigned.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  Already manages {[...alreadyAssigned].sort().join(', ')}
                </p>
              )}
            </div>

            <Button onClick={handleAssign} disabled={assign.isPending}>
              {assign.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Assign
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            A manager can raise a transfer only out of a warehouse listed here, and can approve
            or reject only requests coming into one. Assignments apply to the company you are
            currently in.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="text-sm font-semibold">
            Current managers {byUser.length > 0 && `(${byUser.length})`}
          </div>

          {assignmentsLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading assignments…
            </p>
          ) : byUser.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nobody is assigned yet. Until someone is, they cannot raise or approve a transfer
              in this company.
            </p>
          ) : (
            <div className="space-y-2">
              {byUser.map(([userId, entry]) => (
                <div
                  key={userId}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{entry.name || entry.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.email}
                      {entry.code && ` · ${entry.code}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.rows
                      .slice()
                      .sort((a, b) => a.warehouse_code.localeCompare(b.warehouse_code))
                      .map((row) => (
                        <Badge
                          key={row.id}
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                        >
                          {row.warehouse_code}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            aria-label={`Remove ${row.warehouse_code} from ${entry.name}`}
                            disabled={remove.isPending}
                            onClick={() =>
                              handleRemove(row.id, entry.name || entry.email, row.warehouse_code)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Users who hold a stock-movement permission but manage no warehouse.
 *
 * They are refused every transfer and BST action, and the refusal only shows up
 * when they try, so this states it up front instead.
 */
function UnassignedWarning() {
  const { data: gaps = [], isLoading } = useWarehouseScopeGaps();

  if (isLoading || gaps.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          {gaps.length} user{gaps.length === 1 ? '' : 's'} can move stock but manage no warehouse
        </div>
        <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
          Until they are assigned below, every transfer and BST action will be refused for them.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {gaps.map((u) => (
            <Badge key={u.id} variant="outline" className="bg-background">
              {u.full_name || u.email}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
