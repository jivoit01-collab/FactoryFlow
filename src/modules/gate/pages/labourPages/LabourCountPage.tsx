import { CalendarOff, CheckCircle2, Clock, Lock, Moon, Save, Sun, Undo2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { LabourCountSheet, LabourShift } from '../../api/labourCount/labourCount.api';
import {
  useEnsureLabourSheet,
  useHolidayLabourSheet,
  usePullBackLabourSheet,
  useSaveLabourItems,
  useSubmitLabourSheet,
} from '../../api/labourCount/labourCount.queries';
import { useContractors } from '../../api/personGateIn/personGateIn.queries';
import { DepartmentSelect } from '../../components';

function todayLocal(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function itemsToCounts(sheet: LabourCountSheet | null): Record<number, string> {
  const map: Record<number, string> = {};
  sheet?.items.forEach((it) => {
    map[it.contractor] = String(it.count);
  });
  return map;
}

function StatusBadge({ sheet }: { sheet: LabourCountSheet }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    VERIFIED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  };
  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', map[sheet.status])}>
      {sheet.is_holiday ? 'Holiday' : sheet.status}
    </span>
  );
}

export default function LabourCountPage() {
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [departmentName, setDepartmentName] = useState('');
  const [workDate, setWorkDate] = useState<string>(todayLocal());
  const [shift, setShift] = useState<LabourShift>('DAY');

  const [sheet, setSheet] = useState<LabourCountSheet | null>(null);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [now, setNow] = useState(() => Date.now());

  const { data: contractors = [] } = useContractors(true);
  const activeContractors = useMemo(
    () => contractors.filter((c) => c.is_active),
    [contractors],
  );

  const ensure = useEnsureLabourSheet();
  const saveItems = useSaveLabourItems(sheet?.id ?? 0);
  const submitSheet = useSubmitLabourSheet();
  const pullBack = usePullBackLabourSheet();
  const holiday = useHolidayLabourSheet();

  const applySheet = (data: LabourCountSheet) => {
    setSheet(data);
    setCounts(itemsToCounts(data));
  };

  // Load (get-or-create) the sheet whenever department/date/shift change.
  useEffect(() => {
    if (!departmentId) {
      setSheet(null);
      setCounts({});
      return;
    }
    ensure.mutate(
      { work_date: workDate, shift, department: departmentId },
      {
        onSuccess: applySheet,
        onError: () => toast.error('Failed to load the labour sheet'),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-load only when these inputs change
  }, [departmentId, workDate, shift]);

  // Tick once a minute for the live lock countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const isEditable = !!sheet?.is_editable;
  const total = useMemo(
    () => Object.values(counts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0),
    [counts],
  );

  const lockText = useMemo(() => {
    if (!sheet) return '';
    const lockMs = new Date(sheet.lock_at).getTime();
    const diff = lockMs - now;
    const lockTime = new Date(sheet.lock_at).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
    if (diff <= 0) return `Locked (auto-submitted at ${lockTime})`;
    const mins = Math.floor(diff / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `Auto-submits in ${h > 0 ? `${h}h ` : ''}${m}m (at ${lockTime})`;
  }, [sheet, now]);

  const handleCountChange = (contractorId: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    setCounts((prev) => ({ ...prev, [contractorId]: clean }));
  };

  const buildItems = () =>
    Object.entries(counts)
      .map(([contractor, v]) => ({ contractor: Number(contractor), count: parseInt(v, 10) || 0 }))
      .filter((it) => it.count > 0);

  const handleSave = async () => {
    if (!sheet) return;
    try {
      const updated = await saveItems.mutateAsync({ items: buildItems() });
      applySheet(updated);
      toast.success('Counts saved');
    } catch {
      toast.error('Could not save counts (sheet may be locked)');
    }
  };

  const handleSubmit = async () => {
    if (!sheet) return;
    try {
      // Persist any pending edits first, then submit.
      const saved = await saveItems.mutateAsync({ items: buildItems() });
      const updated = await submitSheet.mutateAsync(saved.id);
      applySheet(updated);
      toast.success('Submitted to the gate');
    } catch {
      toast.error('Could not submit');
    }
  };

  const handlePullBack = async () => {
    if (!sheet) return;
    try {
      const updated = await pullBack.mutateAsync(sheet.id);
      applySheet(updated);
      toast.success('Pulled back to draft');
    } catch {
      toast.error('Could not pull back (past the lock time?)');
    }
  };

  const handleHoliday = async () => {
    if (!sheet) return;
    try {
      const updated = await holiday.mutateAsync(sheet.id);
      applySheet(updated);
      toast.success('Marked as holiday');
    } catch {
      toast.error('Could not mark holiday');
    }
  };

  const busy =
    ensure.isPending ||
    saveItems.isPending ||
    submitSheet.isPending ||
    pullBack.isPending ||
    holiday.isPending;

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-7 w-7" />
          Daily Labour Count
        </h2>
        <p className="text-muted-foreground">
          Enter today&apos;s casual-labour headcount per contractor and submit it to the gate.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Department</Label>
              <DepartmentSelect
                value={departmentId}
                onChange={(id, name) => {
                  setDepartmentId(id);
                  setDepartmentName(name);
                }}
                initialDisplayText={departmentName || undefined}
                placeholder="Select department"
              />
            </div>
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

      {!departmentId && (
        <p className="text-sm text-muted-foreground">Select a department to begin.</p>
      )}

      {sheet && (
        <>
          {/* Status bar */}
          <Card>
            <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <StatusBadge sheet={sheet} />
                {sheet.status === 'VERIFIED' ? (
                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Verified{sheet.verified_by_name ? ` by ${sheet.verified_by_name}` : ''}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    {new Date(sheet.lock_at).getTime() - now <= 0 ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                    {lockText}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Submitted</span>
                  <p className="text-2xl font-bold text-primary">{total}</p>
                </div>
                {sheet.gate_counted != null && sheet.gate_counted > 0 && (
                  <>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">
                        {sheet.status === 'VERIFIED' ? 'Out (gate)' : 'Out so far'}
                      </span>
                      <p className="text-2xl font-bold">{sheet.gate_counted}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">
                        {sheet.status === 'VERIFIED' ? 'Variance' : 'Left'}
                      </span>
                      {sheet.status === 'VERIFIED' ? (
                        <p>
                          <span
                            className={cn(
                              'rounded px-2 py-1 text-lg font-bold',
                              (sheet.variance ?? 0) === 0
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
                            )}
                          >
                            {(sheet.variance ?? 0) > 0 ? '+' : ''}
                            {sheet.variance ?? 0}
                          </span>
                        </p>
                      ) : (
                        <p className="text-2xl font-bold">
                          {sheet.remaining ?? sheet.total_count - (sheet.gate_counted ?? 0)}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contractor Counts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sheet.is_holiday ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <CalendarOff className="h-5 w-5" />
                  Marked as a holiday / no labour for this shift.
                </div>
              ) : (
                <div className="divide-y">
                  {activeContractors.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-4 py-2">
                      <div>
                        <p className="font-medium">{c.contractor_name}</p>
                        {c.mobile && (
                          <p className="text-xs text-muted-foreground">{c.mobile}</p>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={counts[c.id] ?? ''}
                        onChange={(e) => handleCountChange(c.id, e.target.value)}
                        disabled={!isEditable}
                        placeholder="0"
                        className="w-24 border-2 font-medium text-right"
                      />
                    </div>
                  ))}
                  {activeContractors.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4">
                      No active contractors found.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {sheet.can_pull_back && (
              <Button type="button" variant="outline" onClick={handlePullBack} disabled={busy}>
                <Undo2 className="h-4 w-4 mr-2" />
                Pull Back
              </Button>
            )}
            {isEditable && !sheet.is_holiday && (
              <Button type="button" variant="outline" onClick={handleHoliday} disabled={busy}>
                <CalendarOff className="h-4 w-4 mr-2" />
                Mark Holiday
              </Button>
            )}
            {isEditable && (
              <Button type="button" variant="secondary" onClick={handleSave} disabled={busy}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            )}
            {isEditable && (
              <Button type="button" onClick={handleSubmit} disabled={busy}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit
              </Button>
            )}
            {!isEditable && !sheet.can_pull_back && (
              <span className="text-sm text-muted-foreground">
                {sheet.status === 'VERIFIED'
                  ? 'Verified by the gate.'
                  : 'Locked — no further edits.'}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
