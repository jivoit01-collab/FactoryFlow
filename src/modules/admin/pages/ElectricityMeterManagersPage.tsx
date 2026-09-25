import { Gauge, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  useAssignMeters,
  useElectricityMeters,
  useRemoveUserElectricityMeter,
  useUserElectricityMeters,
} from '@/modules/maintenance/api';
import { useCompanyUsers } from '@/modules/notifications/api/sendNotification.queries';
import { DashboardHeader } from '@/shared/components';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
 * Which electricity meters each user keeps.
 *
 * This is what decides who may retune a meter and who may book a day's units
 * against it, so it is deliberately an admin-only screen — letting a keeper
 * widen their own scope would defeat the point.
 */
export default function ElectricityMeterManagersPage() {
  const { data: users = [], isLoading: usersLoading } = useCompanyUsers();
  const { data: meters = [], isLoading: metersLoading } = useElectricityMeters();
  const { data: assignments = [], isLoading: assignmentsLoading } = useUserElectricityMeters();

  const assign = useAssignMeters();
  const remove = useRemoveUserElectricityMeter();

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PickableUser | null>(null);
  const [selectedMeters, setSelectedMeters] = useState<string[]>([]);

  const meterOptions = useMemo(
    () =>
      meters.map((m) => ({
        value: String(m.id),
        label: m.location ? `${m.name} — ${m.location}` : m.name,
      })),
    [meters],
  );

  // One row per user, meters folded in, because the question people ask of this
  // screen is "what does this person keep", not "list every pairing".
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
    if (!selectedUser) return new Set<number>();
    return new Set(
      assignments.filter((r) => r.user === selectedUser.id && r.is_active).map((r) => r.meter),
    );
  }, [assignments, selectedUser]);

  async function handleAssign() {
    if (!selectedUser) {
      toast.error('Choose a user first.');
      return;
    }
    if (selectedMeters.length === 0) {
      toast.error('Choose at least one meter.');
      return;
    }
    try {
      const result = await assign.mutateAsync({
        user: selectedUser.id,
        meters: selectedMeters.map(Number),
      });
      const added = [...result.created, ...result.reactivated];
      const names = added
        .map((id) => meters.find((m) => m.id === id)?.name ?? `#${id}`)
        .join(', ');
      toast.success(
        added.length
          ? `${selectedUser.full_name} now keeps ${names}`
          : `${selectedUser.full_name} already kept those meters`,
      );
      handleAssignOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the assignment.'));
    }
  }

  function handleAssignOpenChange(open: boolean) {
    setAssignOpen(open);
    if (!open) {
      setSelectedUser(null);
      setSelectedMeters([]);
    }
  }

  async function handleRemove(id: number, userName: string, meterName: string) {
    try {
      await remove.mutateAsync(id);
      toast.success(`${userName} no longer keeps ${meterName}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove the assignment.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Electricity Meter Managers"
        description="Who may change each meter, and record its daily readings"
        primaryAction={{
          label: 'Assign a manager',
          icon: <Plus className="mr-2 h-4 w-4" />,
          onClick: () => setAssignOpen(true),
        }}
      />

      <Dialog open={assignOpen} onOpenChange={handleAssignOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" /> Assign a manager
            </DialogTitle>
            <DialogDescription>
              A manager can change only the meters listed here, and can add, correct or
              delete a daily reading only against one of them. Reading the register stays
              open to everyone — only the writes are narrowed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="mm-user">User</Label>
              <SearchableSelect<PickableUser>
                items={users as PickableUser[]}
                isLoading={usersLoading}
                inputId="mm-user"
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
                  setSelectedMeters([]);
                }}
                onClear={() => {
                  setSelectedUser(null);
                  setSelectedMeters([]);
                }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="mm-meters">Meters</Label>
              <MultiSelect
                id="mm-meters"
                options={meterOptions}
                selected={selectedMeters}
                onChange={setSelectedMeters}
                searchable
                searchPlaceholder="Search meters…"
                placeholder={metersLoading ? 'Loading…' : 'Choose meters'}
              />
              {selectedUser && alreadyAssigned.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  Already keeps{' '}
                  {[...alreadyAssigned]
                    .map((id) => meters.find((m) => m.id === id)?.name ?? `#${id}`)
                    .sort()
                    .join(', ')}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleAssignOpenChange(false)}
              disabled={assign.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assign.isPending}>
              {assign.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Nobody is assigned yet. Until someone is, no meter can be edited and no
              reading can be entered.
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
                      .sort((a, b) => a.meter_name.localeCompare(b.meter_name))
                      .map((row) => (
                        <Badge
                          key={row.id}
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                        >
                          {row.meter_name}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            aria-label={`Remove ${row.meter_name} from ${entry.name}`}
                            disabled={remove.isPending}
                            onClick={() =>
                              handleRemove(row.id, entry.name || entry.email, row.meter_name)
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
