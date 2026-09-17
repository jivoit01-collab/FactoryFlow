import { Building2, Check, Loader2, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { CASH_BOOK_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { CashBranch } from '@/modules/accounts/api';
import {
  useCashBranches,
  useCreateCashBranch,
  useRetireCashBranch,
  useUpdateCashBranch,
} from '@/modules/accounts/api';
import { ColumnFilter } from '@/modules/accounts/components/ColumnFilter';
import { useLocalColumns } from '@/modules/accounts/components/useLocalColumns';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Input, Label } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

/**
 * Cash Book Branches — the list every payment is filed under.
 *
 * Four to start with: Oil, Beverage, Water and Common. "Common" is where a
 * spend that belongs to the whole site goes, which is most of the drill bits
 * and housekeeping.
 *
 * Retiring rather than deleting is the only option offered, and deliberately:
 * entries already filed under a branch keep it, so the register still reads
 * back years later. A retired branch drops out of the entry form and the
 * filter, and nothing else changes. Renaming, by contrast, reaches through the
 * whole register at once — every entry ever filed under it now reads the new
 * name — which is why this screen has its own right rather than riding on the
 * custodian's.
 */
export default function CashBranchSettingsPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(CASH_BOOK_PERMISSIONS.BRANCHES);

  const [showRetired, setShowRetired] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');


  const { data: all = [], isLoading } = useCashBranches(showRetired);
  const {
    rows: branches,
    column,
    filteredColumns,
    clearFilters,
  } = useLocalColumns(
    all,
    {
      name: { value: (branch) => branch.name },
      entries: {
        value: (branch) => String(branch.entry_count),
        sortValue: (branch) => branch.entry_count,
      },
      status: { value: (branch) => (branch.is_active ? 'In use' : 'Retired') },
    },
    { key: 'name', direction: 'asc' },
  );
  const create = useCreateCashBranch();
  const update = useUpdateCashBranch();
  const retire = useRetireCashBranch();
  const busy = create.isPending || update.isPending || retire.isPending;

  async function handleCreate() {
    const name = newName.trim();
    if (!name) {
      toast.error('Give the branch a name.');
      return;
    }
    try {
      await create.mutateAsync({ name, sort_order: branches.length });
      setNewName('');
      toast.success(`${name} added`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That branch could not be added.'));
    }
  }

  function startEdit(branch: CashBranch) {
    setEditingId(branch.id);
    setEditingName(branch.name);
  }

  async function saveEdit(branch: CashBranch) {
    const name = editingName.trim();
    if (!name || name === branch.name) {
      setEditingId(null);
      return;
    }
    try {
      await update.mutateAsync({ id: branch.id, payload: { name } });
      setEditingId(null);
      toast.success(`Renamed to ${name}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That branch could not be renamed.'));
    }
  }

  async function handleRetire(branch: CashBranch) {
    const ok = await confirmDialog({
      title: `Retire ${branch.name}?`,
      description:
        branch.entry_count > 0
          ? `${branch.entry_count} ${branch.entry_count === 1 ? 'entry is' : 'entries are'} filed under it. They keep it and stay readable — it just stops being offered on new entries.`
          : 'It stops being offered on new entries. Nothing else changes.',
      confirmLabel: 'Retire',
      destructive: true,
    });
    if (!ok) return;
    try {
      await retire.mutateAsync(branch.id);
      toast.success(`${branch.name} retired`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That branch could not be retired.'));
    }
  }

  async function handleRevive(branch: CashBranch) {
    try {
      await update.mutateAsync({ id: branch.id, payload: { is_active: true } });
      toast.success(`${branch.name} is back in use`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That branch could not be brought back.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Cash Book Branches"
        description="The branches every payment in the cash book is filed under"
      >
        <div className="flex flex-wrap items-center gap-2">
          {filteredColumns.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowRetired((value) => !value)}>
            {showRetired ? 'Hide retired' : 'Show retired'}
          </Button>
        </div>
      </DashboardHeader>

      {!canManage && (
        <Card className="border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
          <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-400">
            You can see the branch list but not change it. Changing it needs the Cash Book
            Administrator role.
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div className="space-y-1">
              <Label htmlFor="new-branch">Add a branch</Label>
              <Input
                id="new-branch"
                className="w-[260px]"
                placeholder="Oil, Beverage, Water, Common…"
                maxLength={60}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreate();
                }}
              />
            </div>
            <Button onClick={handleCreate} disabled={busy || !newName.trim()}>
              {create.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the branches…
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filteredColumns.length > 0
                ? 'No branch matches those column filters.'
                : 'No branches yet. Until one exists, no payment can be recorded.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <ColumnFilter {...column('name', 'Branch')} />
                <ColumnFilter {...column('entries', 'Entries filed', 'right')} />
                <ColumnFilter {...column('status', 'Status')} />
                {canManage && <th className="px-3 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => {
                const editing = editingId === branch.id;
                return (
                  <tr
                    key={branch.id}
                    className={`border-b hover:bg-muted/40 ${
                      branch.is_active ? '' : 'text-muted-foreground'
                    }`}
                  >
                    <td className="px-3 py-2">
                      {editing ? (
                        <Input
                          autoFocus
                          className="w-[240px]"
                          maxLength={60}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveEdit(branch);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                      ) : (
                        <span className="font-medium">{branch.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {branch.entry_count}
                    </td>
                    <td className="px-3 py-2">
                      {branch.is_active ? (
                        <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-400">
                          In use
                        </Badge>
                      ) : (
                        <Badge variant="outline">Retired</Badge>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {editing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveEdit(branch)}
                                disabled={busy}
                                aria-label="Save the new name"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingId(null)}
                                aria-label="Cancel renaming"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : branch.is_active ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(branch)}
                                aria-label={`Rename ${branch.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetire(branch)}
                                disabled={busy}
                                aria-label={`Retire ${branch.name}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevive(branch)}
                              disabled={busy}
                              aria-label={`Bring ${branch.name} back into use`}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Renaming a branch changes how it reads on every entry ever filed under it. Retiring one
        leaves those entries alone and only takes it out of the picker.
      </p>
    </div>
  );
}
