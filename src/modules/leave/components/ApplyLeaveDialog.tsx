/**
 * The application form.
 *
 * Two things it deliberately does not do.
 *
 * It does not compute how many days the leave will cost. Weekly offs and the
 * holiday calendar decide that, both live on the server, and a client that
 * guessed would show a number the approval screen then contradicts. The server
 * returns `total_days` on the created request and that is what gets displayed.
 *
 * It does not pre-validate overlaps. The server refuses them with a message
 * naming the clashing date, and that message is shown as-is — duplicating the
 * rule here would mean two places to fix when it changes.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import { LEAVE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import { useApplyLeave, useLeaveTypes, usePickerEmployees } from '../api';
import type { DayPortion } from '../api/leave.api';
import { todayLocal } from './statusBits';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set when the time office is raising it for somebody else. */
  employeeId?: number;
  employeeName?: string;
}

export function ApplyLeaveDialog({ open, onOpenChange, employeeId, employeeName }: Props) {
  const { data: types = [] } = useLeaveTypes();
  const apply = useApplyLeave();
  const { hasPermission } = usePermission();
  const canApplyForOthers = hasPermission(LEAVE_PERMISSIONS.APPLY_FOR_OTHERS);

  // The time office picks a person; everybody else only ever applies for
  // themselves, so the search is not even mounted for them.
  const [search, setSearch] = useState('');
  const [pickedEmployee, setPickedEmployee] = useState<number | undefined>(employeeId);
  const { data: pickerPeople = [] } = usePickerEmployees(
    search,
    canApplyForOthers && employeeId === undefined && open,
  );

  const [leaveType, setLeaveType] = useState<string>('');
  const [fromDate, setFromDate] = useState(todayLocal());
  const [toDate, setToDate] = useState(todayLocal());
  const [portion, setPortion] = useState<DayPortion>('FULL');
  const [reason, setReason] = useState('');
  const [contact, setContact] = useState('');
  const [document, setDocument] = useState<File | null>(null);

  const selected = types.find((type) => String(type.id) === leaveType);
  const isSingleDay = fromDate === toDate;
  // A half day is only ever meaningful on one date, and only where the type
  // allows it — the server enforces both, this just stops offering the choice.
  const canHalfDay = Boolean(selected?.allow_half_day) && isSingleDay;

  function reset() {
    setLeaveType('');
    setFromDate(todayLocal());
    setToDate(todayLocal());
    setPortion('FULL');
    setReason('');
    setContact('');
    setDocument(null);
    setSearch('');
    setPickedEmployee(employeeId);
  }

  function submit() {
    if (!leaveType) {
      toast.error('Choose a leave type.');
      return;
    }
    if (!reason.trim()) {
      toast.error('A reason is required.');
      return;
    }
    // Mirrored from the server so the file is asked for before the round trip,
    // not after it. The server refuses it too — this is convenience, not the rule.
    if (selected?.requires_document && !document) {
      toast.error(`${selected.name} needs supporting paperwork attached.`);
      return;
    }

    apply.mutate(
      {
        employee: employeeId ?? pickedEmployee,
        leave_type: Number(leaveType),
        from_date: fromDate,
        to_date: toDate,
        portion: canHalfDay ? portion : 'FULL',
        reason: reason.trim(),
        contact_number: contact.trim(),
        document,
      },
      {
        onSuccess: (created) => {
          toast.success(
            `Applied for ${created.total_days} day(s). Waiting on ${
              created.responsible_manager_name || 'your approver'
            }.`,
          );
          reset();
          onOpenChange(false);
        },
        // The interceptor already raises the server's message; this keeps the
        // dialog open so the dates can be corrected rather than re-entered.
        onError: () => undefined,
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {employeeName ? `Apply for leave — ${employeeName}` : 'Apply for leave'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {canApplyForOthers && employeeId === undefined ? (
            <div className="space-y-2">
              <Label htmlFor="employee-search">Applying for</Label>
              <Input
                id="employee-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or code — leave blank to apply for yourself"
              />
              {search ? (
                <NativeSelect
                  value={pickedEmployee ? String(pickedEmployee) : ''}
                  onChange={(event) =>
                    setPickedEmployee(event.target.value ? Number(event.target.value) : undefined)
                  }
                  aria-label="Employee"
                >
                  <SelectOption value="">Myself</SelectOption>
                  {pickerPeople.map((person) => (
                    <SelectOption key={person.id} value={String(person.id)}>
                      {person.full_name} ({person.employee_code})
                      {person.has_login ? '' : ' — no login'}
                    </SelectOption>
                  ))}
                </NativeSelect>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="leave-type">Leave type</Label>
            <NativeSelect
              id="leave-type"
              value={leaveType}
              onChange={(event) => setLeaveType(event.target.value)}
            >
              <SelectOption value="">Select…</SelectOption>
              {types.map((type) => (
                <SelectOption key={type.id} value={String(type.id)}>
                  {type.name}
                  {type.annual_quota ? ` (${type.annual_quota}/yr)` : ''}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>

          {selected?.requires_document ? (
            <div className="space-y-2">
              <Label htmlFor="leave-document">Supporting document (required)</Label>
              <Input
                id="leave-document"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                {selected.name} is not accepted without one.
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="from-date">From</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  if (event.target.value > toDate) setToDate(event.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">To</Label>
              <Input
                id="to-date"
                type="date"
                min={fromDate}
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </div>

          {canHalfDay ? (
            <div className="space-y-2">
              <Label htmlFor="portion">Portion</Label>
              <NativeSelect
                id="portion"
                value={portion}
                onChange={(event) => setPortion(event.target.value as DayPortion)}
              >
                <SelectOption value="FULL">Full day</SelectOption>
                <SelectOption value="FIRST_HALF">First half</SelectOption>
                <SelectOption value="SECOND_HALF">Second half</SelectOption>
              </NativeSelect>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why you need the time off"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact number while away (optional)</Label>
            <Input
              id="contact"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Weekly offs and factory holidays inside the range are not counted.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={apply.isPending}>
            {apply.isPending ? 'Submitting…' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
