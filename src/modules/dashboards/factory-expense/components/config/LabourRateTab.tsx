import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Input,
  Label,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useLabourRates, useRetireLabourRate, useSaveLabourRate } from '../../api';
import type { DepartmentOption, RateShift } from '../../types';

const SHIFTS: { value: RateShift; label: string }[] = [
  { value: 'ANY', label: 'Any shift' },
  { value: 'DAY', label: 'Day' },
  { value: 'NIGHT', label: 'Night' },
];

/** Today as YYYY-MM-DD in local time — the default for a new rate. */
function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * What one labourer costs for one day.
 *
 * The board multiplies this by the head count the gate recorded, so an empty
 * table means the labour tile reads ₹0 with a warning rather than a number.
 *
 * Rates are added, never edited in place: a new row with a later start date
 * supersedes the old one, and the old one stays so that re-opening last month
 * still prices it at last month's rate.
 */
export function LabourRateTab({ departments }: { departments: DepartmentOption[] }) {
  const { data: rates = [], isLoading } = useLabourRates();
  const save = useSaveLabourRate();
  const retire = useRetireLabourRate();

  const [department, setDepartment] = useState('');
  const [shift, setShift] = useState<RateShift>('ANY');
  const [rate, setRate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today);

  const active = rates.filter((row) => row.is_active);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(rate);
    if (!rate || Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a rate of zero or more');
      return;
    }
    if (!effectiveFrom) {
      toast.error('Pick the date this rate starts from');
      return;
    }

    save.mutate(
      {
        payload: {
          department: department ? Number(department) : null,
          shift,
          rate_per_person_per_day: rate,
          effective_from: effectiveFrom,
          notes: '',
          is_active: true,
        },
      },
      {
        onSuccess: () => {
          toast.success('Rate saved — the board will use it from ' + effectiveFrom);
          setRate('');
        },
        onError: (error) =>
          toast.error(
            getErrorMessage(
              error,
              'That rate could not be saved. A rate for the same scope and start date may already exist.',
            ),
          ),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={submit}
        className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rate-department">Department</Label>
          <Select
            id="rate-department"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <SelectOption value="">All departments</SelectOption>
            {departments.map((option) => (
              <SelectOption key={option.id} value={String(option.id)}>
                {option.name}
              </SelectOption>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rate-shift">Shift</Label>
          <Select
            id="rate-shift"
            value={shift}
            onChange={(event) => setShift(event.target.value as RateShift)}
          >
            {SHIFTS.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rate-amount">Rate per person per day (₹)</Label>
          <Input
            id="rate-amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            placeholder="550"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rate-from">Effective from</Label>
          <Input
            id="rate-from"
            type="date"
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
          />
        </div>

        <Button type="submit" disabled={save.isPending} className="gap-2">
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add rate
        </Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Department</th>
              <th className="px-4 py-2.5 text-left font-medium">Shift</th>
              <th className="px-4 py-2.5 text-right font-medium">Rate / person / day</th>
              <th className="px-4 py-2.5 text-left font-medium">Effective from</th>
              <th className="w-px px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Loading rates…
                </td>
              </tr>
            )}
            {!isLoading && active.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No rate set yet. Until one is, the board shows labour headcount
                  without a cost.
                </td>
              </tr>
            )}
            {active.map((row) => (
              <tr key={row.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5">{row.department_name ?? 'All departments'}</td>
                <td className="px-4 py-2.5">{row.shift_display}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  ₹{Number(row.rate_per_person_per_day).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-2.5 tabular-nums">{row.effective_from}</td>
                <td className="px-4 py-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title="Retire this rate"
                    disabled={retire.isPending}
                    onClick={() =>
                      retire.mutate(row.id, {
                        onSuccess: () => toast.success('Rate retired'),
                        onError: (error) =>
                          toast.error(getErrorMessage(error, 'That rate could not be retired.')),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        The most specific rate wins: a row naming both a department and a shift beats
        one naming only a shift, which beats the all-departments row. Retiring a rate
        does not change what past days already cost.
      </p>
    </div>
  );
}
