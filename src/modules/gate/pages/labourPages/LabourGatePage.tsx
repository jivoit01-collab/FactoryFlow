import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Undo2,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { LabourCountSheet, LabourShift } from '../../api/labourCount/labourCount.api';
import {
  useFinalizeLabour,
  useLabourBoard,
  useMarkOutLabour,
  useReopenLabour,
  useUndoOutLabour,
} from '../../api/labourCount/labourCount.queries';

function todayLocal(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function VarianceTag({ variance }: { variance: number }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-xs font-semibold',
        variance === 0
          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      )}
    >
      {variance > 0 ? '+' : ''}
      {variance}
    </span>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('font-semibold', accent && 'text-primary')}>{value}</p>
    </div>
  );
}

function contractorLine(sheet: LabourCountSheet): string {
  return sheet.items.map((it) => `${it.contractor_name ?? '#' + it.contractor} ${it.count}`).join(', ');
}

export default function LabourGatePage() {
  const [workDate, setWorkDate] = useState<string>(todayLocal());
  const [shift, setShift] = useState<LabourShift>('DAY');
  const [view, setView] = useState<'DEPARTMENT' | 'CONTRACTOR'>('DEPARTMENT');
  const [batchInputs, setBatchInputs] = useState<Record<number, string>>({});

  const { data: sheets = [], isLoading } = useLabourBoard({ work_date: workDate, shift });
  const markOut = useMarkOutLabour();
  const undoOut = useUndoOutLabour();
  const finalize = useFinalizeLabour();
  const reopen = useReopenLabour();

  const submittedTotal = useMemo(() => sheets.reduce((s, x) => s + x.total_count, 0), [sheets]);
  const outTotal = useMemo(() => sheets.reduce((s, x) => s + (x.gate_counted ?? 0), 0), [sheets]);
  const finalizedCount = useMemo(
    () => sheets.filter((s) => s.status === 'VERIFIED').length,
    [sheets],
  );
  const allFinalized = sheets.length > 0 && finalizedCount === sheets.length;

  const byContractor = useMemo(() => {
    const m = new Map<number, { id: number; name: string; total: number }>();
    sheets.forEach((s) =>
      s.items.forEach((it) => {
        const cur = m.get(it.contractor) ?? {
          id: it.contractor,
          name: it.contractor_name ?? `#${it.contractor}`,
          total: 0,
        };
        cur.total += it.count;
        m.set(it.contractor, cur);
      }),
    );
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [sheets]);

  const busy = markOut.isPending || undoOut.isPending || finalize.isPending || reopen.isPending;

  const handleMarkOut = async (sheet: LabourCountSheet) => {
    const n = parseInt(batchInputs[sheet.id] ?? '', 10);
    if (!n || n <= 0) {
      toast.error('Enter how many just left');
      return;
    }
    try {
      await markOut.mutateAsync({ sheet: sheet.id, count: n });
      setBatchInputs((prev) => ({ ...prev, [sheet.id]: '' }));
    } catch {
      toast.error('Could not mark out');
    }
  };

  const handleUndo = async (sheet: LabourCountSheet) => {
    try {
      await undoOut.mutateAsync(sheet.id);
    } catch {
      toast.error('Could not undo');
    }
  };

  const handleFinalize = async (sheet: LabourCountSheet) => {
    try {
      await finalize.mutateAsync({ sheet: sheet.id });
      toast.success(`${sheet.department_name}: finalized`);
    } catch {
      toast.error('Could not finalize');
    }
  };

  const handleReopen = async (sheet: LabourCountSheet) => {
    try {
      await reopen.mutateAsync(sheet.id);
      toast.success(`${sheet.department_name}: re-opened`);
    } catch {
      toast.error('Could not re-open');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7" />
          Gate — Labour Verification
        </h2>
        <p className="text-muted-foreground">
          Mark labour out in batches as each group leaves, then finalize when the shift exit is done.
        </p>
      </div>

      {/* Controls */}
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
            <div className="space-y-2">
              <Label>Shift</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={shift === 'DAY' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setShift('DAY')}
                >
                  <Sun className="h-4 w-4 mr-1" /> Day
                </Button>
                <Button
                  type="button"
                  variant={shift === 'NIGHT' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setShift('NIGHT')}
                >
                  <Moon className="h-4 w-4 mr-1" /> Night
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : sheets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing submitted yet for this shift.</p>
      ) : (
        <>
          {/* Grand-total headline */}
          <Card className={cn(allFinalized && 'border-green-500/50')}>
            <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="text-2xl font-bold">{submittedTotal}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Out so far</p>
                  <p className="text-2xl font-bold text-primary">{outTotal}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Variance</p>
                  <p className="text-2xl font-bold">
                    <VarianceTag variance={outTotal - submittedTotal} />
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {allFinalized ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> All departments finalized
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {finalizedCount}/{sheets.length} departments finalized
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filter */}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={view === 'DEPARTMENT' ? 'default' : 'outline'}
              onClick={() => setView('DEPARTMENT')}
            >
              <Building2 className="h-4 w-4 mr-1" /> By Department
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === 'CONTRACTOR' ? 'default' : 'outline'}
              onClick={() => setView('CONTRACTOR')}
            >
              <Users className="h-4 w-4 mr-1" /> By Contractor
            </Button>
          </div>

          {view === 'DEPARTMENT' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Departments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sheets.map((sheet) => {
                  const verified = sheet.status === 'VERIFIED';
                  const out = sheet.gate_counted ?? 0;
                  const remaining = sheet.remaining ?? sheet.total_count - out;
                  const batches = sheet.out_batches ?? [];
                  return (
                    <div key={sheet.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-[11rem]">
                          <p className="font-medium">
                            {sheet.department_name}
                            {sheet.is_holiday && (
                              <span className="ml-2 text-xs text-muted-foreground">(holiday)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sheet.is_holiday ? 'No labour' : contractorLine(sheet) || '—'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <Stat label="Submitted" value={sheet.total_count} />
                          <Stat label="Out" value={out} accent />
                          {verified ? (
                            <>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Var</p>
                                <VarianceTag variance={sheet.variance ?? 0} />
                              </div>
                              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <Lock className="h-3.5 w-3.5" />
                                {sheet.verified_by_name ?? 'finalized'}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReopen(sheet)}
                                disabled={busy}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" /> Re-open
                              </Button>
                            </>
                          ) : (
                            <>
                              <Stat label="Left" value={remaining} />
                              <Input
                                type="number"
                                min="1"
                                inputMode="numeric"
                                value={batchInputs[sheet.id] ?? ''}
                                onChange={(e) =>
                                  setBatchInputs((prev) => ({
                                    ...prev,
                                    [sheet.id]: e.target.value.replace(/[^0-9]/g, ''),
                                  }))
                                }
                                placeholder="#"
                                className="w-16 border-2 font-medium text-right"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => handleMarkOut(sheet)}
                                disabled={busy}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Out
                              </Button>
                              {batches.length > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUndo(sheet)}
                                  disabled={busy}
                                  title="Undo last batch"
                                >
                                  <Undo2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                onClick={() => handleFinalize(sheet)}
                                disabled={busy}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Finalize
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {batches.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Out: {batches.map((b) => `+${b.count} @ ${fmtTime(b.created_at)}`).join('  ·  ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Contractor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Reference breakdown to help you count — out is recorded per department.
                </p>
                <div className="divide-y">
                  {byContractor.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="font-semibold">{c.total}</span>
                    </div>
                  ))}
                  {byContractor.length === 0 && (
                    <p className="py-2 text-sm text-muted-foreground">No contractor counts.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
