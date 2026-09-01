import { Database, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useCompanyUsers } from '@/modules/notifications/api/sendNotification.queries';
import {
  useGrantSapReportAccess,
  useRemoveSapReportAccess,
  useSapReportAccess,
  useSapReports,
} from '@/modules/sap-reports/api';
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
 * Which SAP reports each user may see and run — the reports twin of the
 * Warehouse Managers page, with the same reading: no assignment means no
 * access. Superusers and report managers are exempt and see everything.
 */
export default function SapReportAccessPage() {
  const { data: users = [], isLoading: usersLoading } = useCompanyUsers();
  const { data: reportData, isLoading: reportsLoading } = useSapReports();
  const { data: assignments = [], isLoading: assignmentsLoading } = useSapReportAccess();

  const grant = useGrantSapReportAccess();
  const remove = useRemoveSapReportAccess();

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PickableUser | null>(null);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  const reports = useMemo(() => reportData?.data ?? [], [reportData]);

  const reportOptions = useMemo(
    () =>
      reports.map((report) => ({
        value: report.slug,
        label: report.sap_category_name
          ? `${report.title} — ${report.sap_category_name}`
          : report.title,
      })),
    [reports],
  );

  const titleBySlug = useMemo(
    () => new Map(reports.map((report) => [report.slug, report.title])),
    [reports],
  );

  // One row per user, reports folded in, because the question this screen
  // answers is "what can this person see", not "list every pairing".
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
        .filter((row) => row.user === selectedUser.id && row.is_active)
        .map((row) => row.report_slug),
    );
  }, [assignments, selectedUser]);

  async function handleAssign() {
    if (!selectedUser) {
      toast.error('Choose a user first.');
      return;
    }
    if (selectedReports.length === 0) {
      toast.error('Choose at least one report.');
      return;
    }
    try {
      const result = await grant.mutateAsync({
        user: selectedUser.id,
        report_slugs: selectedReports,
      });
      const added = [...result.created, ...result.reactivated].map(
        (slug) => titleBySlug.get(slug) ?? slug,
      );
      toast.success(
        added.length
          ? `${selectedUser.full_name} can now run ${added.join(', ')}`
          : `${selectedUser.full_name} already had those reports`,
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
      setSelectedReports([]);
    }
  }

  async function handleRemove(id: number, userName: string, reportTitle: string) {
    try {
      await remove.mutateAsync(id);
      toast.success(`${userName} can no longer run ${reportTitle}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove the assignment.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="SAP Report Access"
        description="Who may see and run each SAP report — unassigned users see none"
        primaryAction={{
          label: 'Assign reports',
          icon: <Plus className="mr-2 h-4 w-4" />,
          onClick: () => setAssignOpen(true),
        }}
      />

      <Dialog open={assignOpen} onOpenChange={handleAssignOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" /> Assign reports
            </DialogTitle>
            <DialogDescription>
              A user sees only the reports listed here for them. Superusers and report
              managers are exempt. Assignments apply to the company you are currently in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="ra-user">User</Label>
              <SearchableSelect<PickableUser>
                items={users as PickableUser[]}
                isLoading={usersLoading}
                inputId="ra-user"
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
                  setSelectedReports([]);
                }}
                onClear={() => {
                  setSelectedUser(null);
                  setSelectedReports([]);
                }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ra-reports">Reports</Label>
              <MultiSelect
                id="ra-reports"
                options={reportOptions}
                selected={selectedReports}
                onChange={setSelectedReports}
                searchable
                searchPlaceholder="Search reports…"
                placeholder={reportsLoading ? 'Loading…' : 'Choose reports'}
              />
              {selectedUser && alreadyAssigned.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  Already has {alreadyAssigned.size} report
                  {alreadyAssigned.size === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleAssignOpenChange(false)}
              disabled={grant.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={grant.isPending}>
              {grant.isPending ? (
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
            Current access {byUser.length > 0 && `(${byUser.length} users)`}
          </div>

          {assignmentsLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading assignments…
            </p>
          ) : byUser.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nobody is assigned yet. Until someone is, only superusers and report managers
              can see any report in this company.
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
                  <div className="flex max-w-2xl flex-wrap gap-2">
                    {entry.rows
                      .slice()
                      .sort((a, b) => a.report_title.localeCompare(b.report_title))
                      .map((row) => (
                        <Badge
                          key={row.id}
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                        >
                          {row.report_title}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            aria-label={`Remove ${row.report_title} from ${entry.name}`}
                            disabled={remove.isPending}
                            onClick={() =>
                              handleRemove(row.id, entry.name || entry.email, row.report_title)
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
