import { Save, Trash2, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SearchableSelect } from '@/shared/components';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';

import {
  useLabourGateDay,
  useRecordLabourIn,
  useRemoveLabourIn,
  useUpdateLabourIn,
} from '../../api/labourGate/labourGate.queries';
import type { Contractor } from '../../api/personGateIn/personGateIn.api';
import { useContractors } from '../../api/personGateIn/personGateIn.queries';
import { CreateContractorDialog } from '../../components/CreateContractorDialog';
import { DepartmentSelect } from '../../components/DepartmentSelect';

function todayLocal(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function LabourInPage() {
  const [workDate, setWorkDate] = useState<string>(todayLocal());
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [addCount, setAddCount] = useState('');
  const [editCounts, setEditCounts] = useState<Record<number, string>>({});

  const { data: entries = [], isLoading } = useLabourGateDay(workDate);
  const { data: contractors = [] } = useContractors(true);

  const recordIn = useRecordLabourIn();
  const updateIn = useUpdateLabourIn();
  const removeIn = useRemoveLabourIn();

  const busy = recordIn.isPending || updateIn.isPending || removeIn.isPending;

  // A contractor can supply labour to more than one department, so all active
  // contractors stay selectable (uniqueness is per department + contractor).
  const activeContractors = useMemo(
    () => contractors.filter((c) => c.is_active),
    [contractors],
  );

  const totalIn = useMemo(() => entries.reduce((s, e) => s + e.count_in, 0), [entries]);

  const handleAdd = async () => {
    const n = parseInt(addCount, 10);
    if (!departmentId) {
      toast.error('Select a department');
      return;
    }
    if (!contractor) {
      toast.error('Select a contractor');
      return;
    }
    if (!n || n <= 0) {
      toast.error('Enter how many labourers came in');
      return;
    }
    try {
      await recordIn.mutateAsync({
        department: Number(departmentId),
        contractor: contractor.id,
        work_date: workDate,
        count_in: n,
      });
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
      toast.success('Removed');
    } catch {
      toast.error('Could not remove (labour already marked out)');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserPlus className="h-7 w-7" />
          Labour
        </h2>
        <p className="text-muted-foreground">
          Record how many labourers each contractor brought into each department today. Mark them
          out from the gate&apos;s Labour Out board.
        </p>
      </div>

      {/* Controls + add form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="workDate">Date</Label>
              <Input
                id="workDate"
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="border-2 font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-select">Department</Label>
              <DepartmentSelect
                value={departmentId}
                onChange={(id) => setDepartmentId(id)}
                placeholder="Select department"
              />
            </div>
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
              <div className="flex gap-2">
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
                <Button type="button" onClick={handleAdd} disabled={busy}>
                  <UserPlus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Labour In Today
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total in</p>
            <p className="text-2xl font-bold text-primary">{totalIn}</p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No labour recorded in yet.</p>
          ) : (
            <div className="divide-y">
              {entries.map((entry) => {
                const editing = entry.id in editCounts;
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-4 py-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {entry.contractor_name ?? `#${entry.contractor}`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.department_name ?? '—'}
                        {entry.total_out > 0 &&
                          ` · ${entry.total_out} out · ${entry.remaining} inside`}
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
                        title="Remove"
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
