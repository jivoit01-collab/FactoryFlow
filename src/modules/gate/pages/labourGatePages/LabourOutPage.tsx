import { Building2, LogOut, Plus, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { LabourGateEntry } from '../../api/labourGate/labourGate.api';
import {
  useAddLabourOut,
  useLabourGateDay,
  useUndoLabourOut,
} from '../../api/labourGate/labourGate.queries';

function todayLocal(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('font-semibold', accent && 'text-primary')}>{value}</p>
    </div>
  );
}

interface DepartmentGroup {
  key: string;
  name: string;
  entries: LabourGateEntry[];
  totalIn: number;
  totalOut: number;
  remaining: number;
}

export default function LabourOutPage() {
  const [workDate, setWorkDate] = useState<string>(todayLocal());
  const [batchInputs, setBatchInputs] = useState<Record<number, string>>({});

  const { data: entries = [], isLoading } = useLabourGateDay(workDate);
  const addOut = useAddLabourOut();
  const undoOut = useUndoLabourOut();

  const busy = addOut.isPending || undoOut.isPending;

  const totalIn = useMemo(() => entries.reduce((s, e) => s + e.count_in, 0), [entries]);
  const totalOut = useMemo(() => entries.reduce((s, e) => s + e.total_out, 0), [entries]);
  const totalRemaining = totalIn - totalOut;

  // Group the labour-in records by department for review.
  const groups = useMemo<DepartmentGroup[]>(() => {
    const map = new Map<string, DepartmentGroup>();
    entries.forEach((e) => {
      const key = e.department != null ? `d${e.department}` : 'none';
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: e.department_name ?? 'No department',
          entries: [],
          totalIn: 0,
          totalOut: 0,
          remaining: 0,
        });
      }
      const g = map.get(key)!;
      g.entries.push(e);
      g.totalIn += e.count_in;
      g.totalOut += e.total_out;
      g.remaining = g.totalIn - g.totalOut;
    });
    return Array.from(map.values());
  }, [entries]);

  const handleOut = async (entry: LabourGateEntry) => {
    const n = parseInt(batchInputs[entry.id] ?? '', 10);
    if (!n || n <= 0) {
      toast.error('Enter how many just left');
      return;
    }
    if (n > entry.remaining) {
      toast.error(`Only ${entry.remaining} remaining inside`);
      return;
    }
    try {
      await addOut.mutateAsync({ id: entry.id, count: n });
      setBatchInputs((prev) => ({ ...prev, [entry.id]: '' }));
    } catch {
      toast.error('Could not mark out');
    }
  };

  const handleUndo = async (entry: LabourGateEntry) => {
    try {
      await undoOut.mutateAsync(entry.id);
    } catch {
      toast.error('Could not undo');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LogOut className="h-7 w-7" />
          Labour Out
        </h2>
        <p className="text-muted-foreground">
          Review labour-in counts department-wise, then mark labour out in batches as each group
          leaves.
        </p>
      </div>

      {/* Date */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No labour recorded in for this date.</p>
      ) : (
        <>
          {/* Grand totals */}
          <Card className={cn(totalRemaining === 0 && 'border-green-500/50')}>
            <CardContent className="pt-6 flex flex-wrap items-center gap-8">
              <div>
                <p className="text-xs text-muted-foreground">In</p>
                <p className="text-2xl font-bold">{totalIn}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Out</p>
                <p className="text-2xl font-bold text-primary">{totalOut}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Still inside</p>
                <p className="text-2xl font-bold">{totalRemaining}</p>
              </div>
            </CardContent>
          </Card>

          {/* Department-wise */}
          {groups.map((group) => (
            <Card key={group.key}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {group.name}
                  </span>
                  <span className="flex items-center gap-4 font-normal">
                    <Stat label="In" value={group.totalIn} />
                    <Stat label="Out" value={group.totalOut} accent />
                    <Stat label="Inside" value={group.remaining} />
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.entries.map((entry) => {
                  const done = entry.remaining === 0;
                  const batches = entry.out_batches ?? [];
                  return (
                    <div key={entry.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="min-w-[10rem] font-medium">
                          {entry.contractor_name ?? `#${entry.contractor}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                          <Stat label="In" value={entry.count_in} />
                          <Stat label="Out" value={entry.total_out} accent />
                          <Stat label="Inside" value={entry.remaining} />
                          {done ? (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              All out
                            </span>
                          ) : (
                            <Input
                              type="number"
                              min="1"
                              inputMode="numeric"
                              value={batchInputs[entry.id] ?? ''}
                              onChange={(e) =>
                                setBatchInputs((prev) => ({
                                  ...prev,
                                  [entry.id]: e.target.value.replace(/[^0-9]/g, ''),
                                }))
                              }
                              placeholder="#"
                              className="w-16 border-2 font-medium text-right"
                            />
                          )}
                          {!done && (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleOut(entry)}
                              disabled={busy}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Out
                            </Button>
                          )}
                          {batches.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUndo(entry)}
                              disabled={busy}
                              title="Undo last batch"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {batches.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Out:{' '}
                          {batches.map((b) => `+${b.count} @ ${fmtTime(b.created_at)}`).join('  ·  ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
