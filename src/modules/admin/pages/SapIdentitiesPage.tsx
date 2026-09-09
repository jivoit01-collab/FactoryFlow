import { AlertTriangle, KeyRound, Link2, Plus, Trash2, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  type SapUserOption,
  useCreateSapIdentity,
  useRemoveSapIdentity,
  useSapIdentities,
  useSapUsers,
} from '@/modules/admin/api';
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
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

interface PickableUser {
  id: number;
  full_name: string;
  email: string;
}

/**
 * Who each app user is inside SAP, per company.
 *
 * SAP accepts an approval decision only from the one authorizer its template
 * names on the request's current stage. This mapping is how the app knows
 * whether the person clicking Approve *is* that authorizer — without it the app
 * could only hold a pool of shared credentials and sign with whichever fitted,
 * which makes every decision anonymous.
 *
 * Passwords are not managed here. They live in the server's
 * `SAP_APPROVER_CREDENTIALS` env map and this page only reports whether one is
 * present, so it doubles as the worklist for what is still missing.
 */
export default function SapIdentitiesPage() {
  const { data: appUsers = [], isLoading: appUsersLoading } = useCompanyUsers();
  const { data: identities = [], isLoading: identitiesLoading } = useSapIdentities();
  const { data: sapUsers = [], isLoading: sapUsersLoading, isError } = useSapUsers();

  const create = useCreateSapIdentity();
  const remove = useRemoveSapIdentity();

  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PickableUser | null>(null);
  const [selectedSapUser, setSelectedSapUser] = useState<SapUserOption | null>(null);

  const mappedUserIds = useMemo(
    () => new Set(identities.filter((row) => row.is_active).map((row) => row.user)),
    [identities],
  );

  // Authorizers first, then anyone still unmapped: the page's job is to close
  // the gap between "SAP will only accept this person" and "the app knows who
  // that is", so the accounts that authorize something come first.
  const sapUserOptions = useMemo(() => {
    return [...sapUsers].sort((a, b) => {
      const aRank = (a.mapped_to ? 0 : 1) * -1 + (a.authorizing_templates > 0 ? -2 : 0);
      const bRank = (b.mapped_to ? 0 : 1) * -1 + (b.authorizing_templates > 0 ? -2 : 0);
      if (aRank !== bRank) return aRank - bRank;
      return a.user_code.localeCompare(b.user_code);
    });
  }, [sapUsers]);

  const authorizersMissingMapping = useMemo(
    () => sapUsers.filter((u) => u.authorizing_templates > 0 && !u.mapped_to),
    [sapUsers],
  );
  const authorizersMissingPassword = useMemo(
    () => sapUsers.filter((u) => u.authorizing_templates > 0 && !u.password_configured),
    [sapUsers],
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSelectedUser(null);
      setSelectedSapUser(null);
    }
  }

  async function handleCreate() {
    if (!selectedUser) {
      toast.error('Choose an app user first.');
      return;
    }
    if (!selectedSapUser) {
      toast.error('Choose the SAP account they are.');
      return;
    }
    try {
      await create.mutateAsync({
        user: selectedUser.id,
        sap_user_code: selectedSapUser.user_code,
        sap_user_name: selectedSapUser.user_name,
      });
      toast.success(`${selectedUser.full_name} now acts as ${selectedSapUser.user_code} in SAP`);
      handleOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the mapping.'));
    }
  }

  async function handleRemove(id: number, who: string, code: string) {
    try {
      await remove.mutateAsync(id);
      toast.success(`${who} no longer acts as ${code}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove the mapping.'));
    }
  }

  const loading = identitiesLoading || sapUsersLoading;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="SAP Identities"
        description="Which SAP account each user is — approvals are signed as this account"
        primaryAction={{
          label: 'Map a user',
          icon: <Plus className="mr-2 h-4 w-4" />,
          onClick: () => setOpen(true),
        }}
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        SAP accepts an approval decision only from the authorizer named on the request&apos;s
        current stage. A user can approve in this app when their mapped SAP account is that
        authorizer <em>and</em> its password is configured on the server. Mappings apply to the
        company you are currently in — the same person is a separate SAP account, with its own
        password, in each company.
      </div>

      {(authorizersMissingMapping.length > 0 || authorizersMissingPassword.length > 0) && (
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="font-medium">Still to do in this company</div>
            {authorizersMissingMapping.length > 0 && (
              <div className="flex items-start gap-2 text-amber-800">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>{authorizersMissingMapping.length}</strong> SAP authorizer
                  {authorizersMissingMapping.length === 1 ? '' : 's'} not mapped to anyone:{' '}
                  {authorizersMissingMapping.map((u) => u.user_code).join(', ')}
                </span>
              </div>
            )}
            {authorizersMissingPassword.length > 0 && (
              <div className="flex items-start gap-2 text-amber-800">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>{authorizersMissingPassword.length}</strong> SAP authorizer
                  {authorizersMissingPassword.length === 1 ? '' : 's'} with no password on file:{' '}
                  {authorizersMissingPassword.map((u) => u.user_code).join(', ')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Map a user to a SAP account
            </DialogTitle>
            <DialogDescription>
              Pick the person, then the SAP account they log into SAP with. Accounts that authorize
              approvals are listed first.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="si-user">App user</Label>
              <SearchableSelect<PickableUser>
                items={(appUsers as PickableUser[]).filter(
                  (u) => !mappedUserIds.has(u.id) || u.id === selectedUser?.id,
                )}
                isLoading={appUsersLoading}
                inputId="si-user"
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
                emptyText="Every user is already mapped"
                notFoundText="No user matches that"
                onItemSelect={setSelectedUser}
                onClear={() => setSelectedUser(null)}
              />
              <p className="text-xs text-muted-foreground">
                Users already mapped in this company are hidden — edit their row instead.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="si-sap-user">SAP account</Label>
              <SearchableSelect<SapUserOption>
                items={sapUserOptions}
                isLoading={sapUsersLoading}
                isError={isError}
                inputId="si-sap-user"
                value={selectedSapUser?.user_code ?? ''}
                defaultDisplayText={
                  selectedSapUser
                    ? `${selectedSapUser.user_code} — ${selectedSapUser.user_name}`
                    : ''
                }
                placeholder="Search a SAP user…"
                getItemKey={(u) => u.user_code}
                getItemLabel={(u) => `${u.user_code} — ${u.user_name}`}
                filterFn={(u, term) => {
                  const needle = term.trim().toLowerCase();
                  if (!needle) return true;
                  return (
                    u.user_code.toLowerCase().includes(needle) ||
                    u.user_name.toLowerCase().includes(needle)
                  );
                }}
                renderItem={(u) => (
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{u.user_code}</span>
                      {u.authorizing_templates > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          authorizes {u.authorizing_templates}
                        </Badge>
                      )}
                      {u.mapped_to && (
                        <Badge variant="outline" className="text-xs">
                          taken
                        </Badge>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {u.user_name}
                      {u.mapped_to ? ` · already ${u.mapped_to.user_name}` : ''}
                    </div>
                  </div>
                )}
                loadingText="Reading SAP users…"
                emptyText="No SAP users found"
                notFoundText="No SAP user matches that"
                errorText="Could not read the SAP user list"
                onItemSelect={setSelectedSapUser}
                onClear={() => setSelectedSapUser(null)}
              />
              {selectedSapUser?.mapped_to && (
                <p className="flex items-center gap-1 text-xs text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  {selectedSapUser.user_code} is already {selectedSapUser.mapped_to.user_name}. One
                  SAP account belongs to one person.
                </p>
              )}
              {selectedSapUser && !selectedSapUser.password_configured && (
                <p className="flex items-center gap-1 text-xs text-amber-700">
                  <KeyRound className="h-3 w-3" />
                  No password on file for {selectedSapUser.user_code} — the mapping saves, but they
                  cannot approve until it is added on the server.
                </p>
              )}
              {selectedSapUser && selectedSapUser.authorizing_templates === 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedSapUser.user_code} authorizes no active approval template today, so this
                  mapping will not let them decide anything yet.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                create.isPending || !selectedUser || !selectedSapUser || !!selectedSapUser.mapped_to
              }
            >
              {create.isPending ? 'Saving…' : 'Save mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading mappings…</p>
          ) : identities.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nobody is mapped to a SAP account in this company yet, so no SAP approval can be taken
              from the app.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">App user</th>
                    <th className="px-4 py-3 text-left font-medium">SAP account</th>
                    <th className="px-4 py-3 text-left font-medium">Password</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {identities.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.user_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.user_code ? `${row.user_code} · ` : ''}
                          {row.user_email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.sap_user_code}</div>
                        {row.sap_user_name && (
                          <div className="text-xs text-muted-foreground">{row.sap_user_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.password_configured ? (
                          <Badge variant="secondary" className="text-xs">
                            on file
                          </Badge>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <KeyRound className="h-3 w-3" />
                            not configured
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.is_active ? (
                          <Badge variant="secondary" className="text-xs">
                            active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            inactive
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={remove.isPending}
                          onClick={() => handleRemove(row.id, row.user_name, row.sap_user_code)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
