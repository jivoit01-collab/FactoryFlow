/**
 * Request Labour — what each department needs on the NEXT day's shifts.
 *
 * The evening counterpart of the Labour module: there, an HOD splits the labour
 * that a contractor actually walked through the gate *today*; here, a department
 * says in advance how many people it will need *tomorrow*, and an approver
 * signs the number off before the contractors are called. The shape of the
 * screen is deliberately the one people already know — shift toggle, date,
 * an add form, a department-grouped accordion, deleted rows at the bottom.
 *
 * Two numbers ride on every row and the difference matters: the ask and the
 * grant. The header totals show both, because "we asked for 40 and got 28" is
 * the thing the morning meeting argues about.
 *
 * The date defaults to TOMORROW, not today — this page exists to be filled in
 * the evening. Nothing stops an earlier or later date being picked; it is a
 * default, not a rule.
 */
import {
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  History,
  Pencil,
  RotateCcw,
  Scale,
  Trash2,
  Undo2,
  UserPlus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { LABOUR_REQUEST_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth';
import { DepartmentSelect } from '@/modules/gate/components/DepartmentSelect';
import { ShiftToggle } from '@/modules/gate/pages/labourGatePages/labourShared';
import { fmtDateTime } from '@/modules/gate/pages/labourGatePages/labourUtils';
import {
  Badge,
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
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  useDecideLabourRequest,
  useLabourRequestDay,
  useRaiseLabourRequest,
  useRemoveLabourRequest,
  useReopenLabourRequest,
  useRestoreLabourRequest,
  useUpdateLabourRequest,
} from '../api/labourRequest.queries';
import { DecideLabourRequestDialog } from '../components/DecideLabourRequestDialog';
import { EditLabourRequestDialog } from '../components/EditLabourRequestDialog';
import { LabourRequestHistoryDialog } from '../components/LabourRequestHistoryDialog';
import { STATUS_BADGE, tomorrowLocal } from '../components/labourRequestShared';
import type { LabourRequest, LabourRequestShift, LabourRequestStatus } from '../types';

export default function RequestLabourPage() {
  const [workDate, setWorkDate] = useState<string>(tomorrowLocal());
  // Tomorrow's day shift is what almost everyone is filling in; night is a
  // deliberate second click rather than a time-of-day guess, because this form
  // is filled in the evening and a clock-based default would flip to NIGHT
  // exactly when people are planning the DAY shift.
  const [shift, setShift] = useState<LabourRequestShift>('DAY');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [departmentName, setDepartmentName] = useState('');
  const [addCount, setAddCount] = useState('');
  const [addNote, setAddNote] = useState('');
  const [openDepts, setOpenDepts] = useState<Set<number>>(new Set());
  const [historyRequest, setHistoryRequest] = useState<LabourRequest | null>(null);
  const [decideRequest, setDecideRequest] = useState<LabourRequest | null>(null);
  const [editRequest, setEditRequest] = useState<LabourRequest | null>(null);

  const canRaise = useHasPermission(LABOUR_REQUEST_PERMISSIONS.RAISE);
  const canDecide = useHasPermission(LABOUR_REQUEST_PERMISSIONS.DECIDE);

  const { data: allRequests = [], isLoading } = useLabourRequestDay(workDate);

  const raise = useRaiseLabourRequest();
  const update = useUpdateLabourRequest();
  const remove = useRemoveLabourRequest();
  const restore = useRestoreLabourRequest();
  const decide = useDecideLabourRequest();
  const reopen = useReopenLabourRequest();
  const busy =
    raise.isPending ||
    update.isPending ||
    remove.isPending ||
    restore.isPending ||
    decide.isPending ||
    reopen.isPending;

  // One fetch covers the whole day; the toggle is a local filter.
  const shiftRequests = useMemo(
    () => allRequests.filter((r) => r.shift === shift),
    [allRequests, shift],
  );
  const liveRequests = useMemo(() => shiftRequests.filter((r) => !r.is_deleted), [shiftRequests]);
  const deletedRequests = useMemo(() => shiftRequests.filter((r) => r.is_deleted), [shiftRequests]);

  const departmentGroups = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; requested: number; effective: number; rows: LabourRequest[] }
    >();
    liveRequests.forEach((r) => {
      if (!map.has(r.department)) {
        map.set(r.department, {
          id: r.department,
          name: r.department_name,
          requested: 0,
          effective: 0,
          rows: [],
        });
      }
      const group = map.get(r.department)!;
      group.rows.push(r);
      group.requested += r.requested_count;
      group.effective += r.effective_count;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [liveRequests]);

  const totals = useMemo(() => {
    const pending = liveRequests.filter((r) => r.status === 'PENDING').length;
    return {
      requested: liveRequests.reduce((sum, r) => sum + r.requested_count, 0),
      effective: liveRequests.reduce((sum, r) => sum + r.effective_count, 0),
      pending,
    };
  }, [liveRequests]);

  /** The live ask this department already has on this shift, if any. */
  const existingForDepartment = useMemo(
    () => (departmentId === '' ? null : liveRequests.find((r) => r.department === departmentId)),
    [departmentId, liveRequests],
  );

  const toggleDept = (id: number) =>
    setOpenDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAdd = async () => {
    if (departmentId === '') {
      toast.error('Select a department');
      return;
    }
    const count = parseInt(addCount, 10);
    if (!count || count <= 0) {
      toast.error('Enter how many labourers are needed');
      return;
    }
    const reason = addNote.trim();
    if (!reason) {
      toast.error('Give a reason for this request');
      return;
    }
    try {
      await raise.mutateAsync({
        department: Number(departmentId),
        work_date: workDate,
        shift,
        requested_count: count,
        note: reason,
      });
      toast.success(
        existingForDepartment
          ? `${departmentName}: request revised to ${count}`
          : `${departmentName}: ${count} requested`,
      );
      setAddCount('');
      setAddNote('');
      // The department stays selected: raising a Day and a Night ask for the
      // same department back to back is the common case.
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the request'));
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await remove.mutateAsync(id);
      toast.success('Request withdrawn');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not withdraw the request'));
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restore.mutateAsync(id);
      toast.success('Request restored');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not restore the request'));
    }
  };

  const handleQuickApprove = async (request: LabourRequest) => {
    try {
      await decide.mutateAsync({ id: request.id, decision: 'APPROVED' });
      toast.success(`${request.department_name}: ${request.requested_count} approved`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not approve the request'));
    }
  };

  const handleReopen = async (request: LabourRequest) => {
    try {
      await reopen.mutateAsync(request.id);
      toast.success('Decision taken back');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not reopen the request'));
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header + date */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <ClipboardList className="h-7 w-7" />
            Request Labour
          </h2>
          <p className="text-muted-foreground">
            What each department needs for the next day’s shifts. Raise the ask here; the approved
            number is what the plant arranges.
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
            <Label htmlFor="requestDate">Date needed</Label>
            <Input
              id="requestDate"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="border-2 font-medium sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Add / revise form — department first, then the number and why it is needed */}
      {canRaise && (
        <Card>
          <CardContent className="space-y-4 pt-6">
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
                <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                  <div className="space-y-2">
                    <Label htmlFor="request-count">Labourers needed</Label>
                    <Input
                      id="request-count"
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={addCount}
                      onChange={(e) => setAddCount(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      className="border-2 text-right font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="request-note">Reason</Label>
                    <Input
                      id="request-note"
                      value={addNote}
                      onChange={(e) => setAddNote(e.target.value)}
                      placeholder="Why is it needed? e.g. Loading 3 trucks"
                      maxLength={255}
                      className="border-2 font-medium"
                    />
                  </div>
                </div>
                <Button type="button" onClick={handleAdd} disabled={busy} className="md:h-10">
                  <UserPlus className="mr-1 h-4 w-4" />
                  {existingForDepartment ? 'Revise' : 'Request'}
                </Button>
              </div>
            )}

            {existingForDepartment && (
              <p className="text-xs text-muted-foreground">
                {departmentName} already has a{' '}
                <span className="font-semibold text-foreground">
                  {existingForDepartment.requested_count}
                </span>{' '}
                request on this shift ({existingForDepartment.status_display.toLowerCase()}). Saving
                replaces it
                {existingForDepartment.status !== 'PENDING'
                  ? ' and sends it back for approval.'
                  : '.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Department-grouped accordion */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5" />
            Requests for {shift === 'DAY' ? 'the day shift' : 'the night shift'}
          </CardTitle>
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Requested</p>
              <p className="text-2xl font-bold">{totals.requested}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">To arrange</p>
              <p className="text-2xl font-bold text-primary">{totals.effective}</p>
            </div>
            {totals.pending > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {totals.pending}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : departmentGroups.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No requests for this shift yet.
              {canRaise ? ' Pick a department above to raise one.' : ''}
            </p>
          ) : (
            <div className="space-y-2">
              {departmentGroups.map((group) => {
                const open = openDepts.has(group.id);
                return (
                  <Collapsible key={group.id} open={open} onOpenChange={() => toggleDept(group.id)}>
                    <div className="rounded-lg border">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/40"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {group.name}
                          </span>
                          <span className="flex items-center gap-2">
                            {group.effective !== group.requested && (
                              <span className="text-xs text-muted-foreground">
                                asked {group.requested}
                              </span>
                            )}
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold">
                              {group.effective}
                            </span>
                            <ChevronDown
                              className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
                            />
                          </span>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="divide-y border-t">
                          {group.rows.map((request) => {
                            const badge = STATUS_BADGE[request.status];
                            return (
                              <div
                                key={request.id}
                                className="flex flex-wrap items-start justify-between gap-3 p-3"
                              >
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={badge.variant} className={badge.className}>
                                      {request.status_display}
                                    </Badge>
                                    <span className="text-sm font-semibold">
                                      {request.requested_count} requested
                                    </span>
                                    {request.status === 'APPROVED' &&
                                      request.approved_count !== request.requested_count && (
                                        <span className="text-sm font-semibold text-primary">
                                          · {request.approved_count} approved
                                        </span>
                                      )}
                                  </div>
                                  {request.note && (
                                    <p className="truncate text-sm text-muted-foreground">
                                      {request.note}
                                    </p>
                                  )}
                                  <p className="truncate text-xs text-muted-foreground">
                                    Raised by {request.created_by_name ?? '—'} ·{' '}
                                    {fmtDateTime(request.created_at)}
                                    {request.decided_by_name && (
                                      <>
                                        {' '}
                                        · {request.status === 'APPROVED'
                                          ? 'approved'
                                          : 'rejected'}{' '}
                                        by {request.decided_by_name} ·{' '}
                                        {fmtDateTime(request.decided_at)}
                                      </>
                                    )}
                                  </p>
                                  {request.decision_note && (
                                    <p className="truncate text-xs italic text-muted-foreground">
                                      “{request.decision_note}”
                                    </p>
                                  )}
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                  {canDecide && request.status === 'PENDING' && (
                                    <>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleQuickApprove(request)}
                                        disabled={busy}
                                      >
                                        <Check className="mr-1 h-4 w-4" /> Approve
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setDecideRequest(request)}
                                        disabled={busy}
                                        title="Approve fewer, or reject with a reason"
                                      >
                                        <Scale className="mr-1 h-4 w-4" /> Decide…
                                      </Button>
                                    </>
                                  )}
                                  {canDecide && request.status !== 'PENDING' && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleReopen(request)}
                                      disabled={busy}
                                      title="Take the decision back"
                                    >
                                      <Undo2 className="mr-1 h-4 w-4" /> Reopen
                                    </Button>
                                  )}
                                  {canRaise && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditRequest(request)}
                                      title="Edit"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setHistoryRequest(request)}
                                    title="History"
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                  {canRaise && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemove(request.id)}
                                      disabled={busy}
                                      title="Withdraw"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
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

      {/* Withdrawn (soft-deleted) requests */}
      {deletedRequests.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="h-5 w-5" />
              Withdrawn ({deletedRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {deletedRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-4 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-muted-foreground line-through">
                    {request.department_name} · {request.requested_count}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Withdrawn by {request.deleted_by_name ?? '—'} ·{' '}
                    {fmtDateTime(request.deleted_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setHistoryRequest(request)}
                    title="History"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  {canRaise && request.can_restore && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(request.id)}
                      disabled={busy}
                      title="Undo withdrawal (within 10 min)"
                    >
                      <RotateCcw className="mr-1 h-4 w-4" /> Undo
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <DecideLabourRequestDialog
        request={decideRequest}
        open={decideRequest != null}
        onOpenChange={(open) => !open && setDecideRequest(null)}
        onDecide={async (decision: Exclude<LabourRequestStatus, 'PENDING'>, approved, note) => {
          await decide.mutateAsync({
            id: decideRequest!.id,
            decision,
            ...(decision === 'APPROVED' ? { approved_count: approved } : {}),
            note,
          });
          setDecideRequest(null);
        }}
      />

      <EditLabourRequestDialog
        request={editRequest}
        open={editRequest != null}
        onOpenChange={(open) => !open && setEditRequest(null)}
        onSave={async (count, note) => {
          await update.mutateAsync({
            id: editRequest!.id,
            requested_count: count,
            note,
          });
          setEditRequest(null);
        }}
      />

      <LabourRequestHistoryDialog
        requestId={historyRequest?.id ?? null}
        title={
          historyRequest
            ? `${historyRequest.department_name} · ${
                historyRequest.shift === 'DAY' ? 'Day' : 'Night'
              } · ${historyRequest.work_date}`
            : ''
        }
        open={historyRequest != null}
        onOpenChange={(open) => !open && setHistoryRequest(null)}
      />
    </div>
  );
}
