import { BookUser, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useCompanyUsers } from '@/modules/notifications/api/sendNotification.queries';
import {
  useCreateCustomerLedgerLink,
  useCustomerLedgerLinks,
  useRemoveCustomerLedgerLink,
} from '@/modules/warehouse/ar-invoice/api/ar-invoice.queries';
import { CustomerSelect } from '@/modules/warehouse/ar-invoice/components/CustomerSelect';
import type { Customer, CustomerLedgerLink } from '@/modules/warehouse/ar-invoice/types';
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
 * Which SAP customer each user is — what the Ledger tab on AR Invoices may show
 * them. A linked user sees only their own customers' ledgers, and a user with
 * no link sees none, unless they hold the right to see every customer's.
 *
 * Admin-only, like Warehouse Managers: letting a user link themselves would let
 * them read anyone's account.
 */
export default function CustomerLedgerLinksPage() {
  const { data: users = [], isLoading: usersLoading } = useCompanyUsers();
  const { data: links = [], isLoading: linksLoading } = useCustomerLedgerLinks();

  const create = useCreateCustomerLedgerLink();
  const remove = useRemoveCustomerLedgerLink();

  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PickableUser | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  // One row per user, their customers folded in: the question asked of this
  // screen is "whose ledger does this person see".
  const byUser = useMemo(() => {
    const map = new Map<
      number,
      { name: string; email: string; code: string; rows: CustomerLedgerLink[] }
    >();
    for (const row of links) {
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
    return [...map.entries()].sort((a, b) =>
      (a[1].name || a[1].email).localeCompare(b[1].name || b[1].email),
    );
  }, [links]);

  const alreadyLinked = useMemo(
    () =>
      selectedUser
        ? links.filter((r) => r.user === selectedUser.id && r.is_active)
        : ([] as CustomerLedgerLink[]),
    [links, selectedUser],
  );

  function handleLinkOpenChange(open: boolean) {
    setLinkOpen(open);
    if (!open) {
      setSelectedUser(null);
      setCustomer(null);
    }
  }

  async function handleLink() {
    if (!selectedUser) {
      toast.error('Choose a user first.');
      return;
    }
    if (!customer) {
      toast.error('Choose the customer.');
      return;
    }
    try {
      const link = await create.mutateAsync({
        user: selectedUser.id,
        customer_code: customer.customer_code,
      });
      toast.success(
        `${selectedUser.full_name || selectedUser.email} now sees ${link.customer_name}'s ledger`,
      );
      handleLinkOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the link.'));
    }
  }

  async function handleRemove(row: CustomerLedgerLink, userName: string) {
    try {
      await remove.mutateAsync(row.id);
      toast.success(`${userName} no longer sees ${row.customer_name}'s ledger`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove the link.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Customer Ledger Links"
        primaryAction={{
          label: 'Link a customer',
          icon: <Plus className="mr-2 h-4 w-4" />,
          onClick: () => setLinkOpen(true),
        }}
      />

      <Dialog open={linkOpen} onOpenChange={handleLinkOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookUser className="h-5 w-5" /> Link a customer
            </DialogTitle>
            <DialogDescription>
              The user will see this customer's ledger on AR Invoices › Ledger, and no other
              customer's. Links apply to the company you are currently in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="cl-user">User</Label>
              <SearchableSelect<PickableUser>
                items={users as PickableUser[]}
                isLoading={usersLoading}
                inputId="cl-user"
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
                onItemSelect={setSelectedUser}
                onClear={() => setSelectedUser(null)}
              />
            </div>

            <div className="space-y-1">
              <CustomerSelect
                label="SAP customer"
                value={customer?.customer_code ?? ''}
                onChange={setCustomer}
              />
              {alreadyLinked.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Already sees {alreadyLinked.map((r) => r.customer_name).join(', ')}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleLinkOpenChange(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleLink} disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="text-sm font-semibold">
            Linked users {byUser.length > 0 && `(${byUser.length})`}
          </div>

          {linksLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading links…
            </p>
          ) : byUser.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nobody is linked yet. Until they are, a user without the right to see every customer
              sees no ledger in this company.
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
                    {entry.rows.map((row) => (
                      <Badge
                        key={row.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                        title={row.customer_code}
                      >
                        {row.customer_name || row.customer_code}
                        <span className="font-normal text-muted-foreground">
                          {row.customer_code}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          aria-label={`Unlink ${row.customer_code} from ${entry.name || entry.email}`}
                          disabled={remove.isPending}
                          onClick={() => handleRemove(row, entry.name || entry.email)}
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
