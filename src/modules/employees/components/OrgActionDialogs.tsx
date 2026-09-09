/**
 * The dialogs behind every hierarchy operation the brief asks for.
 *
 * They are grouped in one file because they share a shape — pick a target, give
 * a reason, confirm — and because what makes them worth writing carefully is
 * the *consequences each one explains before it happens*:
 *
 * **Move to another manager** states, in the dialog, how many people will move
 * with them. "Move Sandeep under the CTO" is a very different act when Sandeep
 * has nine people underneath, and the choice between taking the team and
 * leaving it behind is offered explicitly — with the second option naming
 * exactly where the team would end up (one level up, with the manager being
 * left), because that is the only honest answer to "and then what happens to
 * them?".
 *
 * **Change status** warns before an exit or a suspension that the person's team
 * has to go somewhere, and lets the user say where. If they do not, it goes to
 * the leaver's own manager — and the dialog says so rather than surprising
 * them.
 *
 * **Promote** does several things at once on purpose: new rung, optionally a new
 * manager and department, optionally a revision. One reason is recorded against
 * all of it, so the trail reads as one decision a year later.
 *
 * **Revise salary** shows the current figure beside the new one and computes the
 * change as you type, because a raise is a *difference* and nobody thinks in
 * absolute annual totals.
 */
import { AlertTriangle, ArrowUpRight, Loader2, TrendingUp, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Switch,
  Textarea,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  useChangeDepartment,
  useChangeDesignation,
  useChangeManager,
  useChangeStatus,
  useCreateSalary,
  usePromote,
} from '../api';
import type { EmployeeDetail, EmployeeMeta, SalaryRecord } from '../types';
import { money } from '../utils';

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Every dialog here takes the same four things.
 *
 * ``open`` drives the dialog, and the caller is expected to render the dialog
 * **only while it is open** — every field below is seeded from the employee as
 * initial state, and a fresh mount is what resets it. That is deliberately not
 * done with an effect: syncing form fields back to props on open is the
 * cascading-render pattern React warns about, and "the state lives exactly as
 * long as the dialog is open" is both simpler and what the user expects.
 */
interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeDetail;
  meta: EmployeeMeta | undefined;
  onDone?: () => void;
}

/** The reason field, on every one of these dialogs. */
function ReasonField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <Label htmlFor="org-action-reason">Reason</Label>
      <Textarea
        id="org-action-reason"
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Recorded in the audit trail against this change. Worth a sentence — somebody will
        read it in a year.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ChangeManagerDialog({ open, onOpenChange, employee, meta, onDone }: BaseProps) {
  const [managerId, setManagerId] = useState(() =>
    employee.reporting_manager ? String(employee.reporting_manager) : '',
  );
  const [carryTeam, setCarryTeam] = useState(true);
  const [reason, setReason] = useState('');
  const change = useChangeManager(employee.id);

  const teamSize = employee.direct_report_count;
  const candidates = (meta?.managers ?? []).filter((person) => person.id !== employee.id);

  function submit() {
    change.mutate(
      {
        manager: managerId ? Number(managerId) : null,
        carry_team: carryTeam,
        reason,
      },
      {
        onSuccess: (result) => {
          toast.success(
            result.team_moved
              ? `${employee.full_name} moved, with ${result.team_moved} team member(s).`
              : `${employee.full_name} moved.`,
          );
          onDone?.();
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nobody was moved.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change who {employee.full_name} reports to</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <Label htmlFor="new-manager">New reporting manager</Label>
            <NativeSelect
              id="new-manager"
              className="mt-1"
              value={managerId}
              onChange={(event) => setManagerId(event.target.value)}
            >
              <SelectOption value="">Nobody — make them top level</SelectOption>
              {candidates.map((manager) => (
                <SelectOption key={manager.id} value={String(manager.id)}>
                  {manager.full_name} · L{manager.hierarchy_level} ·{' '}
                  {manager.department_name ?? '—'}
                </SelectOption>
              ))}
            </NativeSelect>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Only people who can currently hold a team are listed. A loop is refused —
              nobody can be moved under their own subordinate.
            </p>
          </div>

          {teamSize > 0 && (
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                {employee.full_name} has {teamSize} direct report(s)
              </p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <Label htmlFor="carry-team" className="text-xs font-normal leading-snug">
                  {carryTeam
                    ? 'Their whole team moves with them, and the hierarchy below them is untouched.'
                    : `They move alone. Their reports go one level up, to ${
                        employee.manager?.full_name ?? 'their current manager'
                      }.`}
                </Label>
                <Switch id="carry-team" checked={carryTeam} onChange={setCarryTeam} />
              </div>
            </div>
          )}

          <ReasonField
            value={reason}
            onChange={setReason}
            placeholder="Reorganisation, new project, change of department…"
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={change.isPending} className="gap-1.5">
            {change.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export function TransferDepartmentDialog({
  open,
  onOpenChange,
  employee,
  meta,
  onDone,
}: BaseProps) {
  const [departmentId, setDepartmentId] = useState(() =>
    employee.department ? String(employee.department) : '',
  );
  const [includeTeam, setIncludeTeam] = useState(false);
  const [reason, setReason] = useState('');
  const change = useChangeDepartment(employee.id);

  function submit() {
    change.mutate(
      {
        department: departmentId ? Number(departmentId) : null,
        include_team: includeTeam,
        reason,
      },
      {
        onSuccess: (result) => {
          toast.success(
            result.team_moved
              ? `Transferred, along with ${result.team_moved} team member(s).`
              : `${employee.full_name} transferred.`,
          );
          onDone?.();
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nothing was transferred.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Move {employee.full_name} to another department</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <Label htmlFor="new-department">Department</Label>
            <NativeSelect
              id="new-department"
              className="mt-1"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <SelectOption value="">Unassigned</SelectOption>
              {(meta?.departments ?? []).map((department) => (
                <SelectOption key={department.id} value={String(department.id)}>
                  {department.name}
                  {department.parent_name ? ` (under ${department.parent_name})` : ''}
                </SelectOption>
              ))}
            </NativeSelect>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Who they report to is left alone — which department somebody belongs to and who
              they report to are different facts.
            </p>
          </div>

          {employee.direct_report_count > 0 && (
            <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/20 p-3">
              <Label htmlFor="include-team" className="text-xs font-normal leading-snug">
                Move their whole team into this department too — what a restructure usually
                means.
              </Label>
              <Switch id="include-team" checked={includeTeam} onChange={setIncludeTeam} />
            </div>
          )}

          <ReasonField
            value={reason}
            onChange={setReason}
            placeholder="Restructure, change of function, correction…"
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={change.isPending} className="gap-1.5">
            {change.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export function PromoteDialog({ open, onOpenChange, employee, meta, onDone }: BaseProps) {
  const [designationId, setDesignationId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [withSalary, setWithSalary] = useState(false);
  const [basic, setBasic] = useState('');
  const [allowances, setAllowances] = useState('');
  const [bonuses, setBonuses] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [reason, setReason] = useState('');
  const promote = usePromote(employee.id);
  const canEnterSalary = !!meta?.permissions.salary.update || !!meta?.permissions.salary.create;

  // The ladder above their current rung — a promotion goes up, and offering
  // every rung would make "promote" mean nothing.
  const currentLevel = employee.designation_detail?.level ?? 99;
  const higherRungs = (meta?.designations ?? []).filter(
    (designation) => designation.level < currentLevel,
  );

  // The same arithmetic the revision dialog does, for the same reason: a
  // revision whose total is zero is refused by the server, and finding that out
  // from a toast after the fact is worse than being told before sending it.
  const revisionTotal =
    (Number(basic) || 0) + (Number(allowances) || 0) + (Number(bonuses) || 0);

  function submit() {
    if (!designationId && !managerId && !withSalary) {
      toast.error('A promotion needs at least a new designation, a new manager or a revision.');
      return;
    }
    if (withSalary && revisionTotal <= 0) {
      toast.error('Enter the new salary, or switch the revision off to promote without one.');
      return;
    }
    promote.mutate(
      {
        designation: designationId ? Number(designationId) : undefined,
        manager: managerId ? Number(managerId) : undefined,
        salary: withSalary
          ? {
              basic_salary: basic || '0',
              allowances: allowances || '0',
              bonuses: bonuses || '0',
              effective_from: effectiveFrom,
              reason: reason || 'Promotion',
            }
          : undefined,
        reason,
      },
      {
        onSuccess: () => {
          toast.success(`${employee.full_name} promoted.`);
          onDone?.();
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'The promotion was not applied.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Promote {employee.full_name}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Currently {employee.designation_detail?.name ?? 'unassigned'}
            {employee.designation_detail ? ` (level ${employee.designation_detail.level})` : ''}.
            Everything below is recorded as one decision with one reason.
          </p>

          <div>
            <Label htmlFor="promote-designation">New designation</Label>
            <NativeSelect
              id="promote-designation"
              className="mt-1"
              value={designationId}
              onChange={(event) => setDesignationId(event.target.value)}
            >
              <SelectOption value="">Unchanged</SelectOption>
              {higherRungs.map((designation) => (
                <SelectOption key={designation.id} value={String(designation.id)}>
                  {designation.name} (level {designation.level})
                </SelectOption>
              ))}
            </NativeSelect>
            {higherRungs.length === 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Nothing above their current rung on the ladder.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="promote-manager">New reporting manager</Label>
            <NativeSelect
              id="promote-manager"
              className="mt-1"
              value={managerId}
              onChange={(event) => setManagerId(event.target.value)}
            >
              <SelectOption value="">Unchanged</SelectOption>
              {(meta?.managers ?? [])
                .filter((person) => person.id !== employee.id)
                .map((manager) => (
                  <SelectOption key={manager.id} value={String(manager.id)}>
                    {manager.full_name} · L{manager.hierarchy_level}
                  </SelectOption>
                ))}
            </NativeSelect>
          </div>

          {canEnterSalary && (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="promote-with-salary" className="text-sm font-medium">
                  With a salary revision
                </Label>
                <Switch
                  id="promote-with-salary"
                  checked={withSalary}
                  onChange={setWithSalary}
                />
              </div>
              {withSalary && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="promote-basic">Basic (annual)</Label>
                    <Input
                      id="promote-basic"
                      type="number"
                      inputMode="numeric"
                      value={basic}
                      onChange={(event) => setBasic(event.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="promote-allowances">Allowances</Label>
                    <Input
                      id="promote-allowances"
                      type="number"
                      inputMode="numeric"
                      value={allowances}
                      onChange={(event) => setAllowances(event.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="promote-bonuses">Bonuses</Label>
                    <Input
                      id="promote-bonuses"
                      type="number"
                      inputMode="numeric"
                      value={bonuses}
                      onChange={(event) => setBonuses(event.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="promote-effective">Effective from</Label>
                    <Input
                      id="promote-effective"
                      type="date"
                      value={effectiveFrom}
                      onChange={(event) => setEffectiveFrom(event.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-baseline justify-between border-t pt-2">
                    <span className="text-xs text-muted-foreground">
                      New total, per year
                    </span>
                    <span className="text-base font-semibold tabular-nums">
                      {money(revisionTotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <ReasonField
            value={reason}
            onChange={setReason}
            placeholder="Performance review, new responsibilities, taking over a team…"
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={promote.isPending} className="gap-1.5">
            {promote.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Promote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

const LOSES_TEAM = new Set([
  'SUSPENDED',
  'INACTIVE',
  'RESIGNED',
  'TERMINATED',
  'RETIRED',
]);

export function ChangeStatusDialog({ open, onOpenChange, employee, meta, onDone }: BaseProps) {
  const [status, setStatus] = useState<string>(employee.employment_status);
  const [exitDate, setExitDate] = useState(() => employee.exit_date ?? today());
  const [reassignTo, setReassignTo] = useState('');
  const [reason, setReason] = useState('');
  const change = useChangeStatus(employee.id);

  const willLoseTeam = LOSES_TEAM.has(status) && employee.direct_report_count > 0;
  const isExit = status !== 'SUSPENDED' && LOSES_TEAM.has(status);

  function submit() {
    change.mutate(
      {
        status: status as EmployeeDetail['employment_status'],
        exit_date: isExit ? exitDate : null,
        reassign_reports_to: reassignTo ? Number(reassignTo) : null,
        reason,
      },
      {
        onSuccess: (result) => {
          toast.success(
            result.reports_reassigned
              ? `Status changed. ${result.reports_reassigned} report(s) reassigned.`
              : 'Status changed.',
          );
          onDone?.();
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'The status was not changed.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change {employee.full_name}&apos;s employment status</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <Label htmlFor="new-status">Status</Label>
            <NativeSelect
              id="new-status"
              className="mt-1"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {(meta?.employment_statuses ?? []).map((choice) => (
                <SelectOption key={choice.value} value={choice.value}>
                  {choice.label}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>

          {isExit && (
            <div>
              <Label htmlFor="exit-date">Last working day</Label>
              <Input
                id="exit-date"
                type="date"
                value={exitDate}
                onChange={(event) => setExitDate(event.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Drives turnover reporting. Their place in the chain and their history are
                kept.
              </p>
            </div>
          )}

          {willLoseTeam && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-500/40 dark:bg-amber-500/5">
              <p className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Their team has to report somewhere
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {employee.full_name} has {employee.direct_report_count} direct report(s) and
                cannot hold a team on this status.
              </p>
              <div className="mt-2">
                <Label htmlFor="reassign-to" className="text-xs">
                  Their reports move to
                </Label>
                <NativeSelect
                  id="reassign-to"
                  className="mt-1"
                  value={reassignTo}
                  onChange={(event) => setReassignTo(event.target.value)}
                >
                  <SelectOption value="">
                    {employee.manager
                      ? `${employee.manager.full_name} — one level up (default)`
                      : 'Somebody must be chosen'}
                  </SelectOption>
                  {(meta?.managers ?? [])
                    .filter((person) => person.id !== employee.id)
                    .map((manager) => (
                      <SelectOption key={manager.id} value={String(manager.id)}>
                        {manager.full_name} · L{manager.hierarchy_level}
                      </SelectOption>
                    ))}
                </NativeSelect>
              </div>
            </div>
          )}

          <ReasonField
            value={reason}
            onChange={setReason}
            placeholder="Resignation accepted, probation confirmed, long leave…"
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={change.isPending} className="gap-1.5">
            {change.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Change status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export function ChangeDesignationDialog({
  open,
  onOpenChange,
  employee,
  meta,
  onDone,
}: BaseProps) {
  const [designationId, setDesignationId] = useState(() =>
    employee.designation ? String(employee.designation) : '',
  );
  const [reason, setReason] = useState('');
  const change = useChangeDesignation(employee.id);

  function submit() {
    change.mutate(
      {
        designation: designationId ? Number(designationId) : null,
        reason,
      },
      {
        onSuccess: () => {
          toast.success('Designation changed.');
          onDone?.();
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nothing was changed.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change {employee.full_name}&apos;s designation</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <Label htmlFor="change-designation">Designation</Label>
            <NativeSelect
              id="change-designation"
              className="mt-1"
              value={designationId}
              onChange={(event) => setDesignationId(event.target.value)}
            >
              <SelectOption value="">Unassigned</SelectOption>
              {(meta?.designations ?? []).map((designation) => (
                <SelectOption key={designation.id} value={String(designation.id)}>
                  {designation.name} (level {designation.level})
                </SelectOption>
              ))}
            </NativeSelect>
            <p className="mt-1 text-[11px] text-muted-foreground">
              A sideways move. Use Promote when it is a step up — that records it as one.
            </p>
          </div>
          <ReasonField value={reason} onChange={setReason} placeholder="Role change, correction…" />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={change.isPending} className="gap-1.5">
            {change.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export function ReviseSalaryDialog({
  open,
  onOpenChange,
  employee,
  meta,
  current,
  onDone,
}: BaseProps & { current: SalaryRecord | null | undefined }) {
  // Seeded from the current package: a revision is nearly always an edit of the
  // last one, and retyping four numbers to change one is how mistakes happen.
  // The seeds are initial state, not an effect — the dialog is mounted fresh
  // each time it is opened (see the note on `BaseProps`), so they re-run then.
  const [basic, setBasic] = useState(() =>
    current ? String(Number(current.basic_salary)) : '',
  );
  const [allowances, setAllowances] = useState(() =>
    current ? String(Number(current.allowances)) : '',
  );
  const [bonuses, setBonuses] = useState(() =>
    current ? String(Number(current.bonuses)) : '',
  );
  const [deductions, setDeductions] = useState(() =>
    current ? String(Number(current.deductions)) : '',
  );
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [revisionType, setRevisionType] = useState(current ? 'ANNUAL_INCREMENT' : 'INITIAL');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const create = useCreateSalary(employee.id);
  const canApprove = !!meta?.permissions.salary.approve;

  const newTotal = useMemo(
    () =>
      (Number(basic) || 0) +
      (Number(allowances) || 0) +
      (Number(bonuses) || 0) -
      (Number(deductions) || 0),
    [basic, allowances, bonuses, deductions],
  );
  const previousTotal = current ? Number(current.total_compensation) : null;
  const difference = previousTotal === null ? null : newTotal - previousTotal;
  const percent =
    previousTotal && previousTotal !== 0 ? ((newTotal - previousTotal) / previousTotal) * 100 : null;

  function submit() {
    if (newTotal <= 0) {
      toast.error('The total has to be more than zero. Check the deductions.');
      return;
    }
    create.mutate(
      {
        basic_salary: basic || '0',
        allowances: allowances || '0',
        bonuses: bonuses || '0',
        deductions: deductions || '0',
        effective_from: effectiveFrom,
        revision_type: revisionType as never,
        reason,
        notes,
        approve: canApprove,
      },
      {
        onSuccess: () => {
          toast.success(
            canApprove
              ? 'Revision recorded and approved.'
              : 'Revision recorded. It waits for an approver before it counts as their salary.',
          );
          onDone?.();
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'The revision was not saved.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {current ? 'Revise' : 'Enter'} {employee.full_name}&apos;s salary
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {/* The comparison, because a raise is a difference. */}
          <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Current
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {previousTotal === null ? '—' : money(previousTotal, current?.currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">New</p>
              <p className="text-lg font-semibold tabular-nums">{money(newTotal)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Change</p>
              <p
                className={cn(
                  'text-lg font-semibold tabular-nums',
                  difference === null
                    ? ''
                    : difference > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : difference < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : '',
                )}
              >
                {difference === null
                  ? 'First record'
                  : `${difference >= 0 ? '+' : '−'}${money(Math.abs(difference))}`}
                {percent !== null && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {percent >= 0 ? '+' : ''}
                    {percent.toFixed(1)}%
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="revise-basic">Basic (annual)</Label>
              <Input
                id="revise-basic"
                type="number"
                inputMode="numeric"
                value={basic}
                onChange={(event) => setBasic(event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="revise-allowances">Allowances</Label>
              <Input
                id="revise-allowances"
                type="number"
                inputMode="numeric"
                value={allowances}
                onChange={(event) => setAllowances(event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="revise-bonuses">Bonuses</Label>
              <Input
                id="revise-bonuses"
                type="number"
                inputMode="numeric"
                value={bonuses}
                onChange={(event) => setBonuses(event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="revise-deductions">Deductions</Label>
              <Input
                id="revise-deductions"
                type="number"
                inputMode="numeric"
                value={deductions}
                onChange={(event) => setDeductions(event.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="revise-effective">Effective from</Label>
              <Input
                id="revise-effective"
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                A future date is fine — it is approved now and starts then. The previous record
                is kept either way.
              </p>
            </div>
            <div>
              <Label htmlFor="revise-type">Revision type</Label>
              <NativeSelect
                id="revise-type"
                className="mt-1"
                value={revisionType}
                onChange={(event) => setRevisionType(event.target.value)}
              >
                {(meta?.revision_types ?? []).map((choice) => (
                  <SelectOption key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div>
            <Label htmlFor="revise-reason">Reason</Label>
            <Input
              id="revise-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Annual review 2026, promotion to Team Lead…"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="revise-notes">Notes</Label>
            <Textarea
              id="revise-notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1"
            />
          </div>

          <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
            {canApprove
              ? 'You can approve revisions, so this one goes into force on its effective date.'
              : 'This is a proposal. Somebody with approval rights has to approve it before it becomes their salary.'}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending} className="gap-1.5">
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {canApprove ? 'Save and approve' : 'Submit for approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
