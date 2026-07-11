import {
  Building2,
  ChevronDown,
  HardHat,
  LogIn,
  LogOut,
  Undo2,
  UserCheck,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
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
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import type { LabourGateEntry, LabourShift } from '../../api/labourGate/labourGate.api';
import {
  useAddLabourOut,
  useLabourGateDay,
  useUndoLabourOut,
} from '../../api/labourGate/labourGate.queries';
import { ProgressBar, ShiftToggle, SummaryStat } from './labourShared';
import { defaultShift, fmtTime, pctOf, todayLocal } from './labourUtils';

interface BreakdownGroup {
  id: number;
  name: string;
  total: number;
  rows: { key: number; label: string; count: number }[];
}

interface AuditRow {
  batchId: number;
  entryId: number;
  contractorName: string;
  count: number;
  createdAt: string;
  by?: string | null;
  canUndo: boolean;
}

function BreakdownList({
  groups,
  openIds,
  onToggle,
  icon,
  emptyText,
  renderMeta,
}: {
  groups: BreakdownGroup[];
  openIds: Set<number>;
  onToggle: (id: number) => void;
  icon: ReactNode;
  emptyText: string;
  renderMeta?: (group: BreakdownGroup) => ReactNode;
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const open = openIds.has(g.id);
        return (
          <Collapsible key={g.id} open={open} onOpenChange={() => onToggle(g.id)}>
            <div className="rounded-lg border">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2 font-medium">
                    {icon}
                    {g.name}
                  </span>
                  <span className="flex items-center gap-2">
                    {renderMeta?.(g)}
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
                  {g.rows.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-4 p-3 text-sm"
                    >
                      <span className="font-medium">{row.label}</span>
                      <span className="font-semibold">{row.count}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}

export default function LabourOutPage() {
  const [workDate, setWorkDate] = useState<string>(todayLocal());
  const [shift, setShift] = useState<LabourShift>(defaultShift());
  const [outContractorId, setOutContractorId] = useState<number | null>(null);
  const [outCount, setOutCount] = useState('');
  const [openDepts, setOpenDepts] = useState<Set<number>>(new Set());
  const [openContractors, setOpenContractors] = useState<Set<number>>(new Set());

  const { data: allEntries = [], isLoading } = useLabourGateDay(workDate);
  const addOut = useAddLabourOut();
  const undoOut = useUndoLabourOut();
  const busy = addOut.isPending || undoOut.isPending;

  const gateEntries = useMemo(
    () => allEntries.filter((e) => e.department == null && !e.is_deleted && e.shift === shift),
    [allEntries, shift],
  );
  const moduleEntries = useMemo(
    () => allEntries.filter((e) => e.department != null && !e.is_deleted && e.shift === shift),
    [allEntries, shift],
  );

  const totalIn = useMemo(() => gateEntries.reduce((s, e) => s + e.count_in, 0), [gateEntries]);
  const totalOut = useMemo(() => gateEntries.reduce((s, e) => s + e.total_out, 0), [gateEntries]);
  const totalInside = totalIn - totalOut;
  const allCleared = totalIn > 0 && totalInside === 0;

  // Department-wise read-only breakdown (from the Labour module): department → contractors.
  const departmentGroups = useMemo<BreakdownGroup[]>(() => {
    const map = new Map<number, BreakdownGroup>();
    moduleEntries.forEach((e) => {
      const id = e.department as number;
      if (!map.has(id)) map.set(id, { id, name: e.department_name ?? `#${id}`, total: 0, rows: [] });
      const g = map.get(id)!;
      g.rows.push({ key: e.id, label: e.contractor_name ?? `#${e.contractor}`, count: e.count_in });
      g.total += e.count_in;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [moduleEntries]);

  // The inverse view: contractor → departments they have labour allocated to.
  const contractorGroups = useMemo<BreakdownGroup[]>(() => {
    const map = new Map<number, BreakdownGroup>();
    moduleEntries.forEach((e) => {
      const id = e.contractor;
      if (!map.has(id)) map.set(id, { id, name: e.contractor_name ?? `#${id}`, total: 0, rows: [] });
      const g = map.get(id)!;
      g.rows.push({ key: e.id, label: e.department_name ?? `#${e.department}`, count: e.count_in });
      g.total += e.count_in;
    });
    map.forEach((g) => g.rows.sort((a, b) => a.label.localeCompare(b.label)));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [moduleEntries]);

  const totalAllocated = useMemo(
    () => contractorGroups.reduce((s, g) => s + g.total, 0),
    [contractorGroups],
  );

  // Gate-recorded count_in per contractor, so each contractor row can show
  // how much of what came in through the gate is still unallocated.
  const gateInByContractor = useMemo(() => {
    const map = new Map<number, number>();
    gateEntries.forEach((e) => map.set(e.contractor, (map.get(e.contractor) ?? 0) + e.count_in));
    return map;
  }, [gateEntries]);

  // Contractors with labour still inside — the out form's options.
  const outableEntries = useMemo(() => gateEntries.filter((e) => e.remaining > 0), [gateEntries]);
  const selectedEntry = useMemo(
    () => gateEntries.find((e) => e.contractor === outContractorId) ?? null,
    [gateEntries, outContractorId],
  );

  // Flat out audit log (newest first), with undo on the most recent batch.
  const auditRows = useMemo<AuditRow[]>(() => {
    const rows: AuditRow[] = [];
    gateEntries.forEach((e) => {
      const batches = [...(e.out_batches ?? [])].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id,
      );
      const latestId = batches.length ? batches[batches.length - 1].id : -1;
      batches.forEach((b) => {
        rows.push({
          batchId: b.id,
          entryId: e.id,
          contractorName: e.contractor_name ?? `#${e.contractor}`,
          count: b.count,
          createdAt: b.created_at,
          by: b.by,
          canUndo: e.can_undo_last && b.id === latestId,
        });
      });
    });
    return rows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.batchId - a.batchId,
    );
  }, [gateEntries]);

  const toggleIn = (setter: typeof setOpenDepts) => (id: number) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleDept = toggleIn(setOpenDepts);
  const toggleContractor = toggleIn(setOpenContractors);

  const handleOut = async () => {
    if (!selectedEntry) {
      toast.error('Select a contractor');
      return;
    }
    const n = parseInt(outCount, 10);
    if (!n || n <= 0) {
      toast.error('Enter how many just left');
      return;
    }
    if (n > selectedEntry.remaining) {
      toast.error(`Only ${selectedEntry.remaining} remaining inside`);
      return;
    }
    try {
      await addOut.mutateAsync({ id: selectedEntry.id, count: n });
      setOutCount('');
      toast.success(`${selectedEntry.contractor_name}: ${n} out`);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not mark out'));
    }
  };

  const handleUndo = async (entryId: number) => {
    try {
      await undoOut.mutateAsync(entryId);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not undo'));
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header + date */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LogOut className="h-7 w-7" />
            Labour Out
          </h2>
          <p className="text-muted-foreground">
            Mark labour out per contractor as they leave. The allocation breakdown below is
            informational.
          </p>
        </div>
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <Label>Shift</Label>
            <div>
              <ShiftToggle value={shift} onChange={setShift} />
            </div>
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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : gateEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No labour recorded in for this date.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <Card className={cn(allCleared && 'border-green-500/50')}>
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
                  className={cn(allCleared && 'text-green-600 dark:text-green-400')}
                />
              </div>
              <ProgressBar pct={pctOf(totalOut, totalIn)} tone={allCleared ? 'green' : 'primary'} />
            </CardContent>
          </Card>

          {/* Allocation info (read-only), viewable either way round */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Allocation Breakdown
                <span className="text-xs font-normal text-muted-foreground">(from Labour module)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="department">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TabsList>
                    <TabsTrigger value="department">
                      <Building2 className="h-4 w-4 mr-1.5" /> By Department
                    </TabsTrigger>
                    <TabsTrigger value="contractor">
                      <HardHat className="h-4 w-4 mr-1.5" /> By Contractor
                    </TabsTrigger>
                  </TabsList>
                  <p className="text-sm text-muted-foreground">
                    Total allocated:{' '}
                    <span className="font-semibold text-foreground">{totalAllocated}</span> of{' '}
                    {totalIn} in
                  </p>
                </div>

                <TabsContent value="department" className="mt-4">
                  <BreakdownList
                    groups={departmentGroups}
                    openIds={openDepts}
                    onToggle={toggleDept}
                    icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                    emptyText="No department split entered in the Labour module."
                  />
                </TabsContent>

                <TabsContent value="contractor" className="mt-4">
                  <BreakdownList
                    groups={contractorGroups}
                    openIds={openContractors}
                    onToggle={toggleContractor}
                    icon={<HardHat className="h-4 w-4 text-muted-foreground" />}
                    emptyText="No contractor allocation entered in the Labour module."
                    renderMeta={(g) => {
                      const gateIn = gateInByContractor.get(g.id);
                      if (gateIn == null || gateIn <= g.total) return null;
                      return (
                        <span className="text-xs text-muted-foreground">
                          {gateIn - g.total} unallocated
                        </span>
                      );
                    }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Out form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mark Out</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="out-contractor">Contractor</Label>
                    <SearchableSelect<LabourGateEntry>
                      inputId="out-contractor"
                      value={selectedEntry?.contractor_name}
                      items={outableEntries}
                      isLoading={false}
                      placeholder="Search contractor with labour inside"
                      inputClassName="border-2 font-medium"
                      loadingText="Loading..."
                      emptyText="No contractors with labour inside"
                      notFoundText="No contractor found"
                      getItemKey={(e) => e.contractor}
                      getItemLabel={(e) => e.contractor_name ?? `#${e.contractor}`}
                      filterFn={(e, search) =>
                        (e.contractor_name ?? '').toLowerCase().includes(search.toLowerCase())
                      }
                      renderItem={(e) => (
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{e.contractor_name}</span>
                          <span className="text-xs text-muted-foreground">{e.remaining} inside</span>
                        </div>
                      )}
                      onItemSelect={(e) => setOutContractorId(e.contractor)}
                      onClear={() => setOutContractorId(null)}
                    />
                    {selectedEntry && (
                      <p className="text-xs text-muted-foreground">
                        {selectedEntry.remaining} inside · {selectedEntry.total_out} out of{' '}
                        {selectedEntry.count_in}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="out-count">Number leaving</Label>
                    <Input
                      id="out-count"
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={outCount}
                      onChange={(e) => setOutCount(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      className="border-2 font-medium text-right"
                    />
                  </div>
                </div>
                <Button type="button" onClick={handleOut} disabled={busy} className="md:h-10">
                  <LogOut className="h-4 w-4 mr-1" /> Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Out audit log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Out Log</CardTitle>
            </CardHeader>
            <CardContent>
              {auditRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No labour marked out yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Time</th>
                        <th className="py-2 pr-4 font-medium">Contractor</th>
                        <th className="py-2 pr-4 font-medium text-right">Out</th>
                        <th className="py-2 pr-4 font-medium">By</th>
                        <th className="py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {auditRows.map((r) => (
                        <tr key={r.batchId}>
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                            {fmtTime(r.createdAt)}
                          </td>
                          <td className="py-2 pr-4 font-medium">{r.contractorName}</td>
                          <td className="py-2 pr-4 text-right font-semibold text-primary">
                            +{r.count}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{r.by ?? '—'}</td>
                          <td className="py-2 text-right">
                            {r.canUndo && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUndo(r.entryId)}
                                disabled={busy}
                                title="Undo (within 10 min)"
                              >
                                <Undo2 className="h-4 w-4 mr-1" /> Undo
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
