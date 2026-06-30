import { LogIn, LogOut, Save, Trash2, UserCheck, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SearchableSelect } from '@/shared/components';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useLabourGateDay,
  useRecordLabourIn,
  useRemoveLabourIn,
  useUpdateLabourIn,
} from '../../api/labourGate/labourGate.queries';
import type { Contractor } from '../../api/personGateIn/personGateIn.api';
import { useContractors } from '../../api/personGateIn/personGateIn.queries';
import { CreateContractorDialog } from '../../components/CreateContractorDialog';
import { ProgressBar, SummaryStat } from './labourShared';
import { pctOf, todayLocal } from './labourUtils';

export default function GateLabourInPage() {
  const [workDate, setWorkDate] = useState<string>(todayLocal());
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [addCount, setAddCount] = useState('');
  const [editCounts, setEditCounts] = useState<Record<number, string>>({});

  const { data: allEntries = [], isLoading } = useLabourGateDay(workDate);
  const { data: contractors = [] } = useContractors(true);

  const recordIn = useRecordLabourIn();
  const updateIn = useUpdateLabourIn();
  const removeIn = useRemoveLabourIn();

  const busy = recordIn.isPending || updateIn.isPending || removeIn.isPending;

  const activeContractors = useMemo(() => contractors.filter((c) => c.is_active), [contractors]);

  // Gate Labour In owns the department-less rows.
  const entries = useMemo(
    () => allEntries.filter((e) => e.department == null && !e.is_deleted),
    [allEntries],
  );

  const totalIn = useMemo(() => entries.reduce((s, e) => s + e.count_in, 0), [entries]);
  const totalOut = useMemo(() => entries.reduce((s, e) => s + e.total_out, 0), [entries]);
  const totalInside = totalIn - totalOut;

  const handleAdd = async () => {
    const n = parseInt(addCount, 10);
    if (!contractor) {
      toast.error('Select a contractor');
      return;
    }
    if (!n || n <= 0) {
      toast.error('Enter how many labourers came in');
      return;
    }
    try {
      await recordIn.mutateAsync({ contractor: contractor.id, work_date: workDate, count_in: n });
      toast.success(`${contractor.contractor_name}: ${n} in`);
      setContractor(null);
      setAddCount('');
    } catch {
      toast.error('Could not save labour in');
    }
  };

  const handleSaveEdit = async (id: number) => {
    const n = parseInt(editCounts[id] ?? '', 10);
    if (Number.isNaN(n) || n < 0) {
      toast.error('Enter a valid count');
      return;
    }
    try {
      await updateIn.mutateAsync({ id, count_in: n });
      setEditCounts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Updated');
    } catch {
      toast.error('Could not update (less than already marked out?)');
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeIn.mutateAsync(id);
      toast.success('Deleted');
    } catch {
      toast.error('Could not delete (labour already marked out)');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header + date */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserPlus className="h-7 w-7" />
            Labour In
          </h2>
          <p className="text-muted-foreground">
            Count the labourers each contractor brought in. Rows turn green → yellow → red as they
            leave.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="workDate">Date</Label>
          <Input
            id="workDate"
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            className="border-2 font-medium sm:w-44"
          />
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-8">
            <SummaryStat icon={<LogIn className="h-4 w-4" />} label="In" value={totalIn} />
            <SummaryStat
              icon={<LogOut className="h-4 w-4" />}
              label="Out"
              value={totalOut}
              className="text-primary"
            />
            <SummaryStat
              icon={<UserCheck className="h-4 w-4" />}
              label="Inside"
              value={totalInside}
              className={cn(totalInside > 0 && 'text-green-600 dark:text-green-400')}
            />
          </div>
          <ProgressBar pct={pctOf(totalOut, totalIn)} />
        </CardContent>
      </Card>

      {/* Add form */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="labour-in-contractor">Contractor</Label>
                <SearchableSelect<Contractor>
                  inputId="labour-in-contractor"
                  value={contractor?.contractor_name}
                  items={activeContractors}
                  isLoading={false}
                  placeholder="Search and select contractor"
                  inputClassName="border-2 font-medium"
                  loadingText="Loading contractors..."
                  emptyText="No contractors available"
                  notFoundText="No contractor found"
                  addNewLabel="Add contractor"
                  getItemKey={(c) => c.id}
                  getItemLabel={(c) => c.contractor_name}
                  filterFn={(c, search) =>
                    c.contractor_name.toLowerCase().includes(search.toLowerCase())
                  }
                  renderItem={(c) => (
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.contractor_name}</div>
                      {c.mobile && (
                        <div className="truncate text-xs text-muted-foreground">{c.mobile}</div>
                      )}
                    </div>
                  )}
                  onItemSelect={(c) => setContractor(c)}
                  onClear={() => setContractor(null)}
                  renderCreateDialog={(open, onOpenChange, updateSelection) => (
                    <CreateContractorDialog
                      open={open}
                      onOpenChange={onOpenChange}
                      onSuccess={(c) => {
                        updateSelection(c.id, c.contractor_name);
                        setContractor(c);
                      }}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labour-in-count">Number of labourers</Label>
                <Input
                  id="labour-in-count"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={addCount}
                  onChange={(e) => setAddCount(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  className="border-2 font-medium text-right"
                />
              </div>
            </div>
            <Button type="button" onClick={handleAdd} disabled={busy} className="md:h-10">
              <UserPlus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Labour In Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No labour recorded in yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const editing = entry.id in editCounts;
                const allOut = entry.count_in > 0 && entry.remaining === 0;
                const partial = entry.total_out > 0 && entry.remaining > 0;
                const allIn = entry.total_out === 0 && entry.remaining > 0;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center justify-between gap-4 rounded-lg border border-l-4 p-3',
                      allIn && 'border-l-green-500 bg-green-50/50 dark:bg-green-950/15',
                      partial && 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/15',
                      allOut && 'border-l-red-500 bg-red-50/50 dark:bg-red-950/15',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {entry.contractor_name ?? `#${entry.contractor}`}
                      </p>
                      <p
                        className={cn(
                          'text-xs font-medium truncate',
                          allIn && 'text-green-600 dark:text-green-400',
                          partial && 'text-yellow-700 dark:text-yellow-500',
                          allOut && 'text-red-600 dark:text-red-400',
                        )}
                      >
                        {allOut
                          ? 'All out'
                          : partial
                            ? `${entry.total_out} out · ${entry.remaining} inside`
                            : `${entry.remaining} inside`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={editing ? editCounts[entry.id] : String(entry.count_in)}
                        onChange={(e) =>
                          setEditCounts((prev) => ({
                            ...prev,
                            [entry.id]: e.target.value.replace(/[^0-9]/g, ''),
                          }))
                        }
                        className="w-20 border-2 font-medium text-right"
                      />
                      {editing && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSaveEdit(entry.id)}
                          disabled={busy}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(entry.id)}
                        disabled={busy}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
