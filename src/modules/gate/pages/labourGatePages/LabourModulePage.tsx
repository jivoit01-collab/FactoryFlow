import { Building2, ChevronDown, RotateCcw, Save, Trash2, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SearchableSelect } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import type { LabourGateEntry } from '../../api/labourGate/labourGate.api';
import {
  useLabourGateDay,
  useRecordLabourIn,
  useRemoveLabourIn,
  useRestoreLabourIn,
} from '../../api/labourGate/labourGate.queries';
import type { Contractor } from '../../api/personGateIn/personGateIn.api';
import { useContractors } from '../../api/personGateIn/personGateIn.queries';
import { CreateContractorDialog } from '../../components/CreateContractorDialog';
import { DepartmentSelect } from '../../components/DepartmentSelect';
import { AuditLine } from './labourShared';
import { fmtDateTime, todayLocal } from './labourUtils';

interface OverAlloc {
  contractorName: string;
  entered: number;
  used: number;
  left: number;
  attempted: number;
}

export default function LabourModulePage() {
  const [workDate, setWorkDate] = useState<string>(todayLocal());
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [departmentName, setDepartmentName] = useState('');
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [addCount, setAddCount] = useState('');
  const [editCounts, setEditCounts] = useState<Record<number, string>>({});
  const [openDepts, setOpenDepts] = useState<Set<number>>(new Set());
  const [overAlloc, setOverAlloc] = useState<OverAlloc | null>(null);

  const { data: allEntries = [], isLoading } = useLabourGateDay(workDate);
  const { data: contractors = [] } = useContractors(true);

  const recordIn = useRecordLabourIn();
  const removeIn = useRemoveLabourIn();
  const restoreIn = useRestoreLabourIn();
  const busy = recordIn.isPending || removeIn.isPending || restoreIn.isPending;

  // Only contractors that still have labour inside via the gate.
  const insideContractorIds = useMemo(
    () =>
      new Set(
        allEntries
          .filter((e) => e.department == null && !e.is_deleted && e.remaining > 0)
          .map((e) => e.contractor),
      ),
    [allEntries],
  );
  const selectableContractors = useMemo(
    () => contractors.filter((c) => c.is_active && insideContractorIds.has(c.id)),
    [contractors, insideContractorIds],
  );

  const moduleEntries = useMemo(
    () => allEntries.filter((e) => e.department != null && !e.is_deleted),
    [allEntries],
  );
  const deletedEntries = useMemo(
    () => allEntries.filter((e) => e.department != null && e.is_deleted),
    [allEntries],
  );

  const departmentGroups = useMemo(() => {
    const map = new Map<number, { id: number; name: string; total: number; rows: LabourGateEntry[] }>();
    moduleEntries.forEach((e) => {
      const id = e.department as number;
      if (!map.has(id)) map.set(id, { id, name: e.department_name ?? `#${id}`, total: 0, rows: [] });
      const g = map.get(id)!;
      g.rows.push(e);
      g.total += e.count_in;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [moduleEntries]);

  const totalAllocated = useMemo(() => moduleEntries.reduce((s, e) => s + e.count_in, 0), [moduleEntries]);

  const gateCountOf = (contractorId: number) =>
    allEntries.find((e) => e.department == null && !e.is_deleted && e.contractor === contractorId)
      ?.count_in ?? 0;
  const usedExcept = (contractorId: number, deptId: number) =>
    moduleEntries
      .filter((e) => e.contractor === contractorId && e.department !== deptId)
      .reduce((s, e) => s + e.count_in, 0);

  // selected contractor's allocation tally (for the inline hint while adding)
  const formSummary = useMemo(() => {
    if (!contractor || !departmentId) return null;
    const entered = gateCountOf(contractor.id);
    const used = usedExcept(contractor.id, Number(departmentId));
    return { entered, used, left: entered - used };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractor, departmentId, allEntries, moduleEntries]);

  const toggleDept = (id: number) =>
    setOpenDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const fromBackend = (e: unknown): OverAlloc | null => {
    const data = (e as { response?: { data?: { entered?: number; used?: number; left?: number } } })
      .response?.data;
    if (data && typeof data.left === 'number') {
      return {
        contractorName: contractor?.contractor_name ?? '',
        entered: data.entered ?? 0,
        used: data.used ?? 0,
        left: data.left,
        attempted: parseInt(addCount, 10) || 0,
      };
    }
    return null;
  };

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
      toast.error('Enter how many labourers');
      return;
    }
    const entered = gateCountOf(contractor.id);
    const used = usedExcept(contractor.id, Number(departmentId));
    const left = entered - used;
    if (n > left) {
      setOverAlloc({ contractorName: contractor.contractor_name, entered, used, left, attempted: n });
      return;
    }
    try {
      await recordIn.mutateAsync({
        department: Number(departmentId),
        contractor: contractor.id,
        work_date: workDate,
        count_in: n,
      });
      toast.success(`${contractor.contractor_name}: ${n} → ${departmentName}`);
      setContractor(null);
      setAddCount('');
    } catch (e) {
      const oa = fromBackend(e);
      if (oa) setOverAlloc(oa);
      else toast.error(getErrorMessage(e, 'Could not save'));
    }
  };

  const handleSaveEdit = async (entry: LabourGateEntry) => {
    const n = parseInt(editCounts[entry.id] ?? '', 10);
    if (Number.isNaN(n) || n < 0) {
      toast.error('Enter a valid count');
      return;
    }
    const entered = gateCountOf(entry.contractor);
    const used = usedExcept(entry.contractor, entry.department as number);
    const left = entered - used;
    if (n > left) {
      setOverAlloc({
        contractorName: entry.contractor_name ?? `#${entry.contractor}`,
        entered,
        used,
        left,
        attempted: n,
      });
      return;
    }
    try {
      await recordIn.mutateAsync({
        department: entry.department,
        contractor: entry.contractor,
        work_date: workDate,
        count_in: n,
      });
      setEditCounts((prev) => {
        const next = { ...prev };
        delete next[entry.id];
        return next;
      });
      toast.success('Updated');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update'));
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeIn.mutateAsync(id);
      toast.success('Deleted');
    } catch {
      toast.error('Could not delete');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restoreIn.mutateAsync(id);
      toast.success('Restored');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not restore'));
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header + date */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7" />
            Labour
          </h2>
          <p className="text-muted-foreground">
            Split each contractor’s gate labour across departments (for information). The split can’t
            exceed what they brought in.
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

      {/* Progressive add form: department first, then contractor + count */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="department-select">Department</Label>
              <DepartmentSelect
                value={departmentId}
                onChange={(id, name) => {
                  setDepartmentId(id);
                  setDepartmentName(name);
                }}
                placeholder="Select department"
                allowCreate
              />
            </div>
          </div>

          {departmentId !== '' && (
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="labour-module-contractor">Contractor</Label>
                  <SearchableSelect<Contractor>
                    inputId="labour-module-contractor"
                    value={contractor?.contractor_name}
                    items={selectableContractors}
                    isLoading={false}
                    placeholder="Search and select contractor"
                    inputClassName="border-2 font-medium"
                    loadingText="Loading contractors..."
                    emptyText="No contractors with labour still inside"
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
                  <Label htmlFor="labour-module-count">Number of labourers</Label>
                  <Input
                    id="labour-module-count"
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
          )}

          {formSummary && (
            <p className="text-xs text-muted-foreground">
              {contractor?.contractor_name}: entered{' '}
              <span className="font-semibold text-foreground">{formSummary.entered}</span> · used{' '}
              <span className="font-semibold text-foreground">{formSummary.used}</span> · left{' '}
              <span
                className={cn(
                  'font-semibold',
                  formSummary.left > 0 ? 'text-green-600 dark:text-green-400' : 'text-foreground',
                )}
              >
                {formSummary.left}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Department-grouped accordion */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Department Allocation
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Allocated</p>
            <p className="text-2xl font-bold text-primary">{totalAllocated}</p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : departmentGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No department allocations yet. Pick a department above to start.
            </p>
          ) : (
            <div className="space-y-2">
              {departmentGroups.map((g) => {
                const open = openDepts.has(g.id);
                return (
                  <Collapsible key={g.id} open={open} onOpenChange={() => toggleDept(g.id)}>
                    <div className="rounded-lg border">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/40"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {g.name}
                            <span className="text-xs text-muted-foreground">
                              ({g.rows.length} contractor{g.rows.length === 1 ? '' : 's'})
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold">
                              {g.total}
                            </span>
                            <ChevronDown
                              className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
                            />
                          </span>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="divide-y border-t">
                          {g.rows.map((entry) => {
                            const editing = entry.id in editCounts;
                            return (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between gap-4 p-3"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium truncate">
                                    {entry.contractor_name ?? `#${entry.contractor}`}
                                  </p>
                                  <AuditLine entry={entry} />
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
                                      onClick={() => handleSaveEdit(entry)}
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
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deleted (soft-deleted) allocations */}
      {deletedEntries.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="h-5 w-5" />
              Deleted ({deletedEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {deletedEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 py-2">
                <div className="min-w-0">
                  <p className="font-medium truncate line-through text-muted-foreground">
                    {entry.contractor_name ?? `#${entry.contractor}`}
                    {entry.department_name && <span> · {entry.department_name}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Deleted by {entry.deleted_by_name ?? '—'} · {fmtDateTime(entry.deleted_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {entry.count_in} released
                  </span>
                  {entry.can_restore && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(entry.id)}
                      disabled={busy}
                      title="Undo delete (within 10 min)"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> Undo
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Over-allocation pop-up */}
      <Dialog open={overAlloc != null} onOpenChange={(o) => !o && setOverAlloc(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Not enough labour left</DialogTitle>
            <DialogDescription>
              {overAlloc?.contractorName}’s department split can’t exceed what they brought in.
            </DialogDescription>
          </DialogHeader>
          {overAlloc && (
            <>
              <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Entered</p>
                  <p className="text-2xl font-bold">{overAlloc.entered}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Used</p>
                  <p className="text-2xl font-bold text-primary">{overAlloc.used}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Left</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {overAlloc.left}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                You tried to add <span className="font-semibold text-foreground">{overAlloc.attempted}</span>
                , but only <span className="font-semibold text-foreground">{overAlloc.left}</span>{' '}
                {overAlloc.left === 1 ? 'is' : 'are'} left to allocate.
              </p>
            </>
          )}
          <DialogFooter>
            <Button onClick={() => setOverAlloc(null)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
