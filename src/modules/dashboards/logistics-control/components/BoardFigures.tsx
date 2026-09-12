import { Check, Loader2, Save } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useBoardSettings, useSaveBoardSettings } from '../api';
import type { BoardSettingsPayload } from '../types';

/** Every field this card edits, as the form holds them: strings, possibly empty. */
type Draft = {
  owned_vehicles: string;
  owned_vehicle_numbers: string;
  vehicles_out_of_service: string;
  labour_rate_per_day: string;
  warehouse_employees: string;
  warehouse_salary_monthly: string;
  dispatch_employees: string;
  dispatch_salary_monthly: string;
  transport_employees: string;
  transport_salary_monthly: string;
};

const SECTIONS = [
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'dispatch', label: 'Dispatch' },
  { key: 'transport', label: 'Transport' },
] as const;

/** Empty means unset, which is a different answer from zero. */
function toNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function Field({
  id,
  label,
  suffix,
  value,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  suffix?: string;
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
        {label}
        {suffix && <span className="ml-1 font-normal">{suffix}</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Not set"
        className={cn(
          'w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums outline-none transition-colors',
          'focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10',
          invalid && 'border-rose-500 focus:border-rose-500',
        )}
      />
    </div>
  );
}

/**
 * Owned vehicles and per-section staffing.
 *
 * All of it typed in because nothing holds it. `vehicle_management.Vehicle` has
 * no ownership field, and its rows are written by the gate forms — a log of
 * every truck that reached the barrier, not a fleet register. The section
 * staffing is worse: the two department masters this system runs on are
 * disjoint and neither carries "Warehouse", "Dispatch" or "Transportation", and
 * the employee endpoint withholds salary entirely without a salary grant.
 *
 * Salary is entered monthly because that is how it is agreed; the board shows
 * it per day, divided server-side so both salary lines on the board spread a
 * month the same way.
 *
 * Leaving a field empty is a real answer — the board then says the figure is
 * not configured rather than showing a zero nobody set.
 */
export function BoardFigures() {
  const settings = useBoardSettings();
  const save = useSaveBoardSettings();

  // Only what has been typed, or null while nothing has been. Same shape as the
  // warehouse card above: the fields fall through to the server until somebody
  // edits, so a refetch mid-edit cannot overwrite the form.
  const [draft, setDraft] = useState<Draft | null>(null);

  const server: Draft = {
    owned_vehicles: settings.data?.owned_vehicles?.toString() ?? '',
    owned_vehicle_numbers: settings.data?.owned_vehicle_numbers ?? '',
    vehicles_out_of_service: settings.data?.vehicles_out_of_service ?? '',
    labour_rate_per_day: settings.data?.labour_rate_per_day?.toString() ?? '',
    warehouse_employees: settings.data?.warehouse_employees?.toString() ?? '',
    warehouse_salary_monthly: settings.data?.warehouse_salary_monthly?.toString() ?? '',
    dispatch_employees: settings.data?.dispatch_employees?.toString() ?? '',
    dispatch_salary_monthly: settings.data?.dispatch_salary_monthly?.toString() ?? '',
    transport_employees: settings.data?.transport_employees?.toString() ?? '',
    transport_salary_monthly: settings.data?.transport_salary_monthly?.toString() ?? '',
  };

  const form = draft ?? server;
  const dirty = draft !== null;

  const edit = (patch: Partial<Draft>) => setDraft({ ...form, ...patch });

  // Only the numeric fields — the registration list is free text and would
  // otherwise be parsed as a number and dragged into this check.
  const negative = (
    [
      form.owned_vehicles,
      form.labour_rate_per_day,
      form.warehouse_employees,
      form.warehouse_salary_monthly,
      form.dispatch_employees,
      form.dispatch_salary_monthly,
      form.transport_employees,
      form.transport_salary_monthly,
    ] as const
  ).some((raw) => {
    const value = toNumber(raw);
    return value !== null && value < 0;
  });
  const canSave = dirty && !negative && !save.isPending;

  const handleSave = () => {
    const payload: BoardSettingsPayload = {
      owned_vehicles: toNumber(form.owned_vehicles),
      owned_vehicle_numbers: form.owned_vehicle_numbers,
      vehicles_out_of_service: form.vehicles_out_of_service,
      labour_rate_per_day: toNumber(form.labour_rate_per_day),
      warehouse_employees: toNumber(form.warehouse_employees),
      warehouse_salary_monthly: toNumber(form.warehouse_salary_monthly),
      dispatch_employees: toNumber(form.dispatch_employees),
      dispatch_salary_monthly: toNumber(form.dispatch_salary_monthly),
      transport_employees: toNumber(form.transport_employees),
      transport_salary_monthly: toNumber(form.transport_salary_monthly),
    };
    save.mutate(payload, { onSuccess: () => setDraft(null) });
  };

  if (settings.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading the board figures…
      </div>
    );
  }

  if (settings.error) {
    return (
      <p className="rounded-xl border bg-card p-6 text-sm text-rose-600 dark:text-rose-400">
        {getErrorMessage(settings.error, 'Could not read the board figures.')}
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold">Fleet and staffing</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Figures no system holds. Leave any of them empty and the board reports it as not
          configured.
        </p>
      </div>

      <div className="space-y-1.5">
        <Field
          id="owned-vehicles"
          label="Owned vehicles"
          value={form.owned_vehicles}
          onChange={(next) => edit({ owned_vehicles: next })}
          invalid={negative}
        />
        <p className="text-xs text-muted-foreground">
          A headline count, used when no registrations are listed below.
        </p>
      </div>

      <div className="space-y-1.5 border-t pt-4">
        <label
          htmlFor="owned-plates"
          className="block text-xs font-medium text-muted-foreground"
        >
          Owned vehicle registrations
          <span className="ml-1 font-normal">one per line</span>
        </label>
        <textarea
          id="owned-plates"
          rows={6}
          value={form.owned_vehicle_numbers}
          onChange={(event) => edit({ owned_vehicle_numbers: event.target.value })}
          placeholder="PB01AB1234"
          className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10"
        />
        <p className="text-xs text-muted-foreground">
          The vehicle master records no ownership, so this list is the fleet. Each plate
          is matched against today&rsquo;s gate arrivals to say whether the truck is
          working, has been out, or is free — spaces and dashes are ignored, so
          &ldquo;PB01 AB 1234&rdquo; and &ldquo;PB01AB1234&rdquo; are the same truck.
        </p>
      </div>

      <div className="space-y-1.5 border-t pt-4">
        <label
          htmlFor="off-road"
          className="block text-xs font-medium text-muted-foreground"
        >
          Out of service
          <span className="ml-1 font-normal">one per line</span>
        </label>
        <textarea
          id="off-road"
          rows={3}
          value={form.vehicles_out_of_service}
          onChange={(event) => edit({ vehicles_out_of_service: event.target.value })}
          placeholder="HR69E4548"
          className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10"
        />
        <p className="text-xs text-muted-foreground">
          Trucks that cannot work — damaged, in the workshop, sold. No feed records
          this, and a truck listed here shows as out of service even if a transfer is
          still open against it.
        </p>
      </div>

      <div className="space-y-1.5 border-t pt-4">
        <Field
          id="labour-rate"
          label="Labour rate"
          suffix="₹ / person / day"
          value={form.labour_rate_per_day}
          onChange={(next) => edit({ labour_rate_per_day: next })}
          invalid={negative}
        />
        <p className="text-xs text-muted-foreground">
          What one labourer costs for a day. The board multiplies this by the gate&rsquo;s
          own head count for each section. Leave empty and it falls back to the Cost
          Master rate — which is unseeded, so the cost reads as not configured.
        </p>
      </div>

      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Employees by section
        </p>

        {SECTIONS.map((section) => {
          const countKey = `${section.key}_employees` as keyof Draft;
          const salaryKey = `${section.key}_salary_monthly` as keyof Draft;
          const daily = settings.data?.[`${section.key}_salary_daily` as const];

          return (
            <div key={section.key} className="grid gap-3 sm:grid-cols-2">
              <Field
                id={`${section.key}-employees`}
                label={`${section.label} — employees`}
                value={form[countKey]}
                onChange={(next) => edit({ [countKey]: next } as Partial<Draft>)}
                invalid={negative}
              />
              <Field
                id={`${section.key}-salary`}
                label={`${section.label} — salary`}
                suffix="₹ / month"
                value={form[salaryKey]}
                onChange={(next) => edit({ [salaryKey]: next } as Partial<Draft>)}
                invalid={negative}
              />
              {daily != null && !dirty && (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Shows on the board as ₹{daily.toLocaleString('en-IN')} a day.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button onClick={handleSave} disabled={!canSave} size="sm">
          {save.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>

        {!dirty && save.isSuccess && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            Saved
          </span>
        )}

        {negative && (
          <span className="text-sm text-rose-600 dark:text-rose-400">
            Figures cannot be negative.
          </span>
        )}

        {save.error && (
          <span className="text-sm text-rose-600 dark:text-rose-400">
            {getErrorMessage(save.error, 'Could not save.')}
          </span>
        )}
      </div>

      {settings.data?.updated_at && (
        <p className="text-xs text-muted-foreground">
          Last changed {new Date(settings.data.updated_at).toLocaleString('en-IN')}
          {settings.data.updated_by_name && ` by ${settings.data.updated_by_name}`}.
        </p>
      )}
    </div>
  );
}
