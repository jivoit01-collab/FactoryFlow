/**
 * Hiring somebody, and editing their details.
 *
 * One dialog for both, because the fields are the same — but what it *offers*
 * differs, and the difference is deliberate:
 *
 * **On hire** it asks for the reporting manager and, if the user may enter
 * salaries, the joining salary. Placing a new joiner under their manager is
 * part of hiring them, and a starting salary they will actually be paid is
 * worth capturing in the same sitting.
 *
 * **On edit** both are absent. Changing an existing employee's manager moves
 * their whole team and needs a reason, so it lives on its own dialog; and salary
 * is append-only, so "editing" one is not a thing this module allows. Letting
 * either ride along on a details edit is how a directory ends up with a manager
 * change nobody recorded.
 *
 * The salary block only appears for somebody who may create salary records, and
 * it says whether what they enter will be in force immediately or will wait for
 * an approver — so nobody types a number expecting it to be paid when it will
 * not be.
 *
 * Two fields only exist on **edit**, for the same reason: a photo has to travel
 * as multipart, which cannot carry the nested joining salary a *hire* can. So
 * the photo and the linked login are set against somebody who already exists.
 * The login link is worth finding: it is what makes "your own salary" mean
 * anything, and without it an employee cannot read their own figure however
 * many permissions they hold.
 */
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
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
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useCreateEmployee, useUpdateEmployee } from '../api';
import type {
  Department,
  Designation,
  EmployeeBrief,
  EmployeeDetail,
  EmployeeMeta,
  EmployeePayload,
} from '../types';

interface FormState {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  joining_date: string;
  job_title: string;
  location: string;
  department: string;
  designation: string;
  reporting_manager: string;
  employment_status: string;
  user: string;
  basic_salary: string;
  allowances: string;
  bonuses: string;
  salary_effective_from: string;
  salary_notes: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    employee_code: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    joining_date: today(),
    job_title: '',
    location: '',
    department: '',
    designation: '',
    reporting_manager: '',
    employment_status: 'ACTIVE',
    user: '',
    basic_salary: '',
    allowances: '',
    bonuses: '',
    salary_effective_from: today(),
    salary_notes: '',
  };
}

function formFrom(employee: EmployeeDetail): FormState {
  return {
    ...emptyForm(),
    employee_code: employee.employee_code,
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    phone: employee.phone,
    date_of_birth: employee.date_of_birth ?? '',
    joining_date: employee.joining_date,
    job_title: employee.job_title,
    location: employee.location,
    department: employee.department ? String(employee.department) : '',
    designation: employee.designation ? String(employee.designation) : '',
    employment_status: employee.employment_status,
    user: employee.user ? String(employee.user) : '',
  };
}

export interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent = hiring somebody new. */
  employee?: EmployeeDetail;
  meta: EmployeeMeta | undefined;
  /** Pre-select a manager — used by "Add a report" on the chart. */
  defaultManagerId?: number | null;
  onSaved?: (employee: EmployeeDetail) => void;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  meta,
  defaultManagerId,
  onSaved,
}: EmployeeFormDialogProps) {
  const isEdit = !!employee;
  // Seeded once, on mount. The caller renders this dialog only while it is
  // open, so opening it is a fresh mount and the seed runs again — no effect
  // syncing fields back to props, which is the cascading-render pattern React
  // warns about.
  const [form, setForm] = useState<FormState>(() =>
    employee
      ? formFrom(employee)
      : { ...emptyForm(), reporting_manager: defaultManagerId ? String(defaultManagerId) : '' },
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const create = useCreateEmployee();
  const update = useUpdateEmployee(employee?.id ?? 0);
  const saving = create.isPending || update.isPending;

  const canEnterSalary = !!meta?.permissions.salary.create;
  const approvesOwnEntry = !!meta?.permissions.salary.approve;
  // The logins on offer: the unclaimed ones, plus whichever this employee
  // already holds — editing somebody must not silently drop their link.
  const logins = [
    ...(meta?.assignable_users ?? []),
    ...(employee?.user_detail && !meta?.assignable_users.some((u) => u.id === employee.user)
      ? [employee.user_detail]
      : []),
  ];
  const departments: Department[] = meta?.departments ?? [];
  const designations: Designation[] = meta?.designations ?? [];
  const managers: EmployeeBrief[] = meta?.managers ?? [];

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function submit() {
    if (!form.employee_code.trim() || !form.first_name.trim()) {
      toast.error('An employee code and a first name are the minimum.');
      return;
    }

    const base = {
      employee_code: form.employee_code.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      date_of_birth: form.date_of_birth || null,
      joining_date: form.joining_date,
      job_title: form.job_title.trim(),
      location: form.location.trim(),
    };

    if (isEdit) {
      // The login is part of the edit, and a blank choice clears it — a real
      // thing to want when somebody leaves and their account is reassigned.
      const edit = {
        ...base,
        user: form.user ? Number(form.user) : null,
        ...(photo ? { photo } : {}),
      };
      update.mutate(edit, {
        onSuccess: (saved) => {
          toast.success(`${saved.full_name} updated.`);
          onSaved?.(saved);
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nothing was saved.')),
      });
      return;
    }

    const payload: EmployeePayload = {
      ...base,
      employment_status: form.employment_status as EmployeePayload['employment_status'],
      department: form.department ? Number(form.department) : null,
      designation: form.designation ? Number(form.designation) : null,
      reporting_manager: form.reporting_manager ? Number(form.reporting_manager) : null,
    };

    if (canEnterSalary && form.basic_salary.trim()) {
      payload.initial_salary = {
        basic_salary: form.basic_salary,
        allowances: form.allowances || '0',
        bonuses: form.bonuses || '0',
        effective_from: form.salary_effective_from || form.joining_date,
        reason: 'Joining salary',
        notes: form.salary_notes,
      };
    }

    create.mutate(payload, {
      onSuccess: (saved) => {
        toast.success(`${saved.full_name} added as ${saved.employee_code}.`);
        onSaved?.(saved);
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error, 'The employee was not added.')),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${employee?.full_name}` : 'Add an employee'}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="employee-code">
                Employee code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="employee-code"
                value={form.employee_code}
                onChange={(event) => set('employee_code', event.target.value)}
                placeholder="EMP001"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="employee-first-name">
                First name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="employee-first-name"
                value={form.first_name}
                onChange={(event) => set('first_name', event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="employee-last-name">Last name</Label>
              <Input
                id="employee-last-name"
                value={form.last_name}
                onChange={(event) => set('last_name', event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="employee-email">Email</Label>
              <Input
                id="employee-email"
                type="email"
                value={form.email}
                onChange={(event) => set('email', event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="employee-phone">Phone</Label>
              <Input
                id="employee-phone"
                value={form.phone}
                onChange={(event) => set('phone', event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="employee-location">Location</Label>
              <Input
                id="employee-location"
                value={form.location}
                onChange={(event) => set('location', event.target.value)}
                placeholder="Head Office"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="employee-dob">Date of birth</Label>
              <Input
                id="employee-dob"
                type="date"
                value={form.date_of_birth}
                onChange={(event) => set('date_of_birth', event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="employee-joining">Joining date</Label>
              <Input
                id="employee-joining"
                type="date"
                value={form.joining_date}
                onChange={(event) => set('joining_date', event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="employee-job-title">Job title</Label>
              <Input
                id="employee-job-title"
                value={form.job_title}
                onChange={(event) => set('job_title', event.target.value)}
                placeholder="Engineering Manager"
                className="mt-1"
              />
            </div>
          </section>

          {!isEdit && (
            <section className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="employee-department">Department</Label>
                <NativeSelect
                  id="employee-department"
                  className="mt-1"
                  value={form.department}
                  onChange={(event) => set('department', event.target.value)}
                >
                  <SelectOption value="">Unassigned</SelectOption>
                  {departments.map((department) => (
                    <SelectOption key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="employee-designation">Designation</Label>
                <NativeSelect
                  id="employee-designation"
                  className="mt-1"
                  value={form.designation}
                  onChange={(event) => set('designation', event.target.value)}
                >
                  <SelectOption value="">Unassigned</SelectOption>
                  {designations.map((designation) => (
                    <SelectOption key={designation.id} value={String(designation.id)}>
                      {designation.name}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="employee-manager">Reports to</Label>
                <NativeSelect
                  id="employee-manager"
                  className="mt-1"
                  value={form.reporting_manager}
                  onChange={(event) => set('reporting_manager', event.target.value)}
                >
                  <SelectOption value="">Nobody — top level</SelectOption>
                  {managers.map((manager) => (
                    <SelectOption key={manager.id} value={String(manager.id)}>
                      {manager.full_name} · {manager.job_title || manager.designation_name || '—'}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="employee-status">Employment status</Label>
                <NativeSelect
                  id="employee-status"
                  className="mt-1"
                  value={form.employment_status}
                  onChange={(event) => set('employment_status', event.target.value)}
                >
                  {(meta?.employment_statuses ?? []).map((status) => (
                    <SelectOption key={status.value} value={status.value}>
                      {status.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>
            </section>
          )}

          {!isEdit && canEnterSalary && (
            <section className="rounded-lg border bg-muted/20 p-3">
              <h4 className="text-sm font-semibold">Joining salary</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Optional. Amounts are annual.{' '}
                {approvesOwnEntry
                  ? 'It will be in force immediately, since you can approve salary revisions.'
                  : 'It will wait for somebody with approval rights before it counts as their salary.'}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="employee-basic">Basic</Label>
                  <Input
                    id="employee-basic"
                    type="number"
                    inputMode="numeric"
                    value={form.basic_salary}
                    onChange={(event) => set('basic_salary', event.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="employee-allowances">Allowances</Label>
                  <Input
                    id="employee-allowances"
                    type="number"
                    inputMode="numeric"
                    value={form.allowances}
                    onChange={(event) => set('allowances', event.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="employee-bonuses">Bonuses</Label>
                  <Input
                    id="employee-bonuses"
                    type="number"
                    inputMode="numeric"
                    value={form.bonuses}
                    onChange={(event) => set('bonuses', event.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="employee-salary-from">Effective from</Label>
                  <Input
                    id="employee-salary-from"
                    type="date"
                    value={form.salary_effective_from}
                    onChange={(event) => set('salary_effective_from', event.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor="employee-salary-notes">Notes</Label>
                <Textarea
                  id="employee-salary-notes"
                  rows={2}
                  value={form.salary_notes}
                  onChange={(event) => set('salary_notes', event.target.value)}
                  className="mt-1"
                  placeholder="Anything payroll should know about this package."
                />
              </div>
            </section>
          )}

          {isEdit && (
            <section className="grid gap-3 border-t pt-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="employee-login">Linked login</Label>
                <NativeSelect
                  id="employee-login"
                  className="mt-1"
                  value={form.user}
                  onChange={(event) => set('user', event.target.value)}
                >
                  <SelectOption value="">Not linked to an app account</SelectOption>
                  {logins.map((login) => (
                    <SelectOption key={login.id} value={String(login.id)}>
                      {login.full_name} · {login.email}
                    </SelectOption>
                  ))}
                </NativeSelect>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Which app account is this person. Without it they cannot see their own
                  salary, however many permissions they hold.
                </p>
              </div>
              <div>
                <Label htmlFor="employee-photo">Profile photo</Label>
                <Input
                  id="employee-photo"
                  type="file"
                  accept="image/*"
                  className="mt-1"
                  onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {employee?.photo
                    ? 'Replaces the current photo. The org chart falls back to initials without one.'
                    : 'The org chart falls back to initials without one.'}
                </p>
              </div>
            </section>
          )}

          {isEdit && (
            <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              Manager, department, designation, status and salary are changed from the
              employee&apos;s own page — each of those is recorded with its reason, and moving a
              manager carries their team.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Add employee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
