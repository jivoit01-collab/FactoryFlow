import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Input,
  Label,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useDepartmentSalaries,
  useRetireDepartmentSalary,
  useSaveDepartmentSalary,
} from '../../api';
import type { DepartmentOption } from '../../types';

/** First of the current month, as YYYY-MM-DD. */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function monthLabel(iso: string): string {
  const parsed = new Date(`${iso.slice(0, 7)}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * The salary bill, department by department, month by month.
 *
 * FactoryFlow has no payroll, so this is typed in rather than derived. The
 * board spreads whatever is entered evenly across the month's days, which is
 * why the figure asked for is the whole month rather than a daily one — an
 * admin knows the monthly bill, not what it works out to per day.
 *
 * Headcount is optional and only drives the cost-per-employee line. Left at
 * zero, that line is hidden rather than shown as a division by nothing.
 */
export function SalaryTab({ departments }: { departments: DepartmentOption[] }) {
  const [month, setMonth] = useState(currentMonth);
  const { data: rows = [], isLoading } = useDepartmentSalaries(month);
  const save = useSaveDepartmentSalary();
  const retire = useRetireDepartmentSalary();

  const [department, setDepartment] = useState('');
  const [employees, setEmployees] = useState('');
  const [amount, setAmount] = useState('');

  const active = rows.filter((row) => row.is_active);
  const total = useMemo(
    () => active.reduce((sum, row) => sum + Number(row.monthly_amount), 0),
    [active],
  );
  const headcount = useMemo(
    () => active.reduce((sum, row) => sum + row.employee_count, 0),
    [active],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!department) {
      toast.error('Pick a department');
      return;
    }
    const monthly = Number(amount);
    if (!amount || Number.isNaN(monthly) || monthly < 0) {
      toast.error('Enter the monthly salary amount');
      return;
    }

    const existing = active.find((row) => row.department === Number(department));

    save.mutate(
      {
        id: existing?.id,
        payload: {
          department: Number(department),
          month,
          employee_count: employees ? Number(employees) : 0,
          monthly_amount: amount,
          notes: '',
          is_active: true,
        },
      },
      {
        onSuccess: () => {
          toast.success(existing ? 'Department salary updated' : 'Department salary added');
          setAmount('');
          setEmployees('');
        },
        onError: (error) =>
          toast.error(getErrorMessage(error, 'That salary row could not be saved.')),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-month">Month</Label>
          <Input
            id="salary-month"
            type="month"
            value={month.slice(0, 7)}
            onChange={(event) => setMonth(`${event.target.value}-01`)}
            className="w-48"
          />
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {monthLabel(month)} total
          </div>
          <div className="text-lg font-bold tabular-nums">
            ₹{total.toLocaleString('en-IN')}
            {headcount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {headcount} employees
              </span>
            )}
          </div>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-department">Department</Label>
          <Select
            id="salary-department"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <SelectOption value="">Select…</SelectOption>
            {departments.map((option) => (
              <SelectOption key={option.id} value={String(option.id)}>
                {option.name}
              </SelectOption>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-employees">Employees (optional)</Label>
          <Input
            id="salary-employees"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={employees}
            onChange={(event) => setEmployees(event.target.value)}
            placeholder="24"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-amount">Monthly salary (₹)</Label>
          <Input
            id="salary-amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="720000"
          />
        </div>

        <Button type="submit" disabled={save.isPending} className="gap-2">
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Save department
        </Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Department</th>
              <th className="px-4 py-2.5 text-right font-medium">Employees</th>
              <th className="px-4 py-2.5 text-right font-medium">Monthly</th>
              <th className="px-4 py-2.5 text-right font-medium">Per employee</th>
              <th className="px-4 py-2.5 text-right font-medium">Per day</th>
              <th className="w-px px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && active.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nothing set for {monthLabel(month)}. The board&rsquo;s salary tile will
                  say so rather than show zero.
                </td>
              </tr>
            )}
            {active.map((row) => {
              const days = new Date(
                Number(month.slice(0, 4)),
                Number(month.slice(5, 7)),
                0,
              ).getDate();
              return (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5">{row.department_name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.employee_count || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    ₹{Number(row.monthly_amount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {row.per_employee ? `₹${row.per_employee.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    ₹
                    {Math.round(Number(row.monthly_amount) / days).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      title="Remove from this month"
                      disabled={retire.isPending}
                      onClick={() =>
                        retire.mutate(row.id, {
                          onSuccess: () => toast.success('Removed from this month'),
                          onError: (error) =>
                            toast.error(getErrorMessage(error, 'That row could not be removed.')),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        Saving a department that already has a row for this month replaces it. Each
        month is set separately, so last month&rsquo;s figures stay as they were.
      </p>
    </div>
  );
}
