import { Check, Loader2, Save } from 'lucide-react';
import { useState } from 'react';

import { Button, Checkbox } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  useBoardSettings,
  useBoardWarehouseList,
  useSaveBoardSettings,
  useSaveBoardWarehouse,
} from '../api';
import { LOGISTICS_CONTROL_STOCK_ITEM_GROUPS } from '../constants';
import type { BoardWarehouse } from '../types';
import { companyLabel } from '../utils';

/** Local `YYYY-MM-DD` — never `toISOString()`, which shifts the day in IST. */
function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * How many unticked warehouses to offer before "show all".
 *
 * A company holds finished goods in thirty-odd warehouses, most of them a few
 * cases at a C&F agent or a return floor. The heaviest few are the ones worth
 * deciding about; the rest are one click away.
 */
const CANDIDATES_SHOWN = 8;

const inputClass =
  'w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums outline-none transition-colors focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10';

/**
 * One warehouse: its tick, and the two figures SAP does not hold.
 *
 * The tick saves the moment it is clicked — it is one decision, and a form
 * that needs a second click to mean it is a form that gets left half-saved.
 * Capacity and audit date are typed, so they wait for Save; the draft follows
 * the same rule as the rest of this screen and falls through to the server's
 * values until somebody types.
 */
function WarehouseRow({ row, companyCode }: { row: BoardWarehouse; companyCode: string }) {
  const save = useSaveBoardWarehouse(companyCode);
  const [draft, setDraft] = useState<{ capacity: string; auditDate: string } | null>(null);

  const capacity =
    draft?.capacity ?? (row.capacity_tonnes == null ? '' : String(row.capacity_tonnes));
  const auditDate = draft?.auditDate ?? row.last_audit_date ?? '';
  const edit = (patch: Partial<{ capacity: string; auditDate: string }>) =>
    setDraft({ capacity, auditDate, ...patch });

  const capacityNumber = capacity.trim() === '' ? null : Number(capacity);
  const capacityInvalid =
    capacityNumber !== null && (!Number.isFinite(capacityNumber) || capacityNumber <= 0);
  const auditInFuture = auditDate !== '' && auditDate > localToday();
  const canSave = draft !== null && !capacityInvalid && !auditInFuture && !save.isPending;

  const saveFigures = () =>
    save.mutate(
      {
        warehouse: row.warehouse,
        payload: {
          capacity_tonnes: capacityNumber,
          last_audit_date: auditDate.trim() === '' ? null : auditDate,
        },
      },
      { onSuccess: () => setDraft(null) },
    );

  const id = `${companyCode}-${row.warehouse}`;

  return (
    <li
      className={cn(
        'grid gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_8rem_10rem_auto] sm:items-center',
        row.on_board && 'bg-muted/40',
      )}
    >
      <Checkbox
        id={`${id}-tick`}
        checked={row.on_board}
        disabled={save.isPending}
        onCheckedChange={(checked) =>
          save.mutate({ warehouse: row.warehouse, payload: { on_board: checked } })
        }
        aria-label={`Count ${row.warehouse} on the board`}
      />

      <label htmlFor={`${id}-tick`} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium">
          {row.warehouse}
          {row.name && <span className="ml-1.5 font-normal text-muted-foreground">{row.name}</span>}
        </span>
        <span className="block text-xs tabular-nums text-muted-foreground">
          {row.tonnes === null
            ? 'Stock not read'
            : `${row.tonnes.toLocaleString('en-IN', { maximumFractionDigits: 1 })} T today`}
          {row.unweighed_items ? ` · ${row.unweighed_items} without a case weight` : ''}
        </span>
      </label>

      <div className="space-y-1">
        <label
          htmlFor={`${id}-capacity`}
          className="block text-xs text-muted-foreground sm:sr-only"
        >
          Capacity (tonnes)
        </label>
        <input
          id={`${id}-capacity`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={capacity}
          onChange={(event) => edit({ capacity: event.target.value })}
          placeholder="Capacity T"
          aria-invalid={capacityInvalid}
          className={cn(inputClass, capacityInvalid && 'border-rose-500 focus:border-rose-500')}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={`${id}-audit`} className="block text-xs text-muted-foreground sm:sr-only">
          Last audit date
        </label>
        <input
          id={`${id}-audit`}
          type="date"
          max={localToday()}
          value={auditDate}
          onChange={(event) => edit({ auditDate: event.target.value })}
          aria-invalid={auditInFuture}
          className={cn(inputClass, auditInFuture && 'border-rose-500 focus:border-rose-500')}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={saveFigures} disabled={!canSave} size="sm" variant="outline">
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="sr-only sm:not-sr-only sm:ml-1.5">Save</span>
        </Button>
      </div>

      {(capacityInvalid || auditInFuture || save.error) && (
        <p className="text-xs text-rose-600 dark:text-rose-400 sm:col-span-5">
          {capacityInvalid
            ? 'Capacity has to be greater than zero. Clear it if the warehouse has no rated figure.'
            : auditInFuture
              ? 'An audit cannot have happened in the future.'
              : getErrorMessage(save.error, 'Could not save.')}
        </p>
      )}
    </li>
  );
}

/**
 * Which of one company's warehouses the board counts.
 *
 * Every warehouse SAP holds finished goods in for this company, with its
 * tonnage today, ticked ones first. Stored per (company, warehouse), and read
 * with the header pinned to this company: Oil and Mart each have their own
 * BH-GR, and a tick against the wrong one would put the other's floor on the
 * wall.
 */
export function BoardWarehouses({ companyCode }: { companyCode: string }) {
  const list = useBoardWarehouseList(companyCode, LOGISTICS_CONTROL_STOCK_ITEM_GROUPS);
  const [showAll, setShowAll] = useState(false);

  const rows = list.data?.warehouses ?? [];
  const ticked = rows.filter((row) => row.on_board);
  const candidates = rows.filter((row) => !row.on_board);
  const shown = showAll ? candidates : candidates.slice(0, CANDIDATES_SHOWN);
  const label = companyLabel(companyCode);

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="space-y-0.5 border-b px-4 py-3">
        <h2 className="text-base font-semibold">{label} warehouses</h2>
        <p className="text-xs text-muted-foreground">
          Ticked warehouses are what the warehouse band counts for {label}. Capacity is what a
          warehouse is rated to hold — the board divides stock by it for &ldquo;% full&rdquo;, and
          leaves out a warehouse that has none. Leave either figure empty and the board says it is
          not configured.
        </p>
      </div>

      {list.isLoading ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading {label}&rsquo;s warehouses from SAP…
        </div>
      ) : list.error ? (
        <p className="p-4 text-sm text-rose-600 dark:text-rose-400">
          {getErrorMessage(list.error, `Could not read ${label}'s warehouses.`)}
        </p>
      ) : (
        <>
          {list.data?.stock_error && (
            <p className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {list.data.stock_error} Ticked warehouses are listed and can still be changed.
            </p>
          )}

          {rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              SAP holds no finished goods in any {label} warehouse.
            </p>
          ) : (
            <ul className="divide-y">
              {[...ticked, ...shown].map((row) => (
                <WarehouseRow key={row.warehouse} row={row} companyCode={companyCode} />
              ))}
            </ul>
          )}

          {candidates.length > CANDIDATES_SHOWN && (
            <div className="border-t px-4 py-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAll((open) => !open)}>
                {showAll
                  ? 'Show only the heaviest'
                  : `Show all ${candidates.length} unticked warehouses`}
              </Button>
            </div>
          )}

          {ticked.length === 0 && rows.length > 0 && (
            <p className="border-t px-4 py-2 text-xs text-muted-foreground">
              Nothing is ticked, so the board shows no stock for {label}.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Empty means unset, which is a different answer from zero. */
function toNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/**
 * The warehouse staff of a company other than the board's own.
 *
 * The board's fleet, salaries and labour rate are typed once, for the company
 * the board reads them from (see "Fleet and staffing" below). The warehouse
 * card is the exception: each company's half prints its own head count, so a
 * second company needs its warehouse staff typed against its own row.
 */
export function WarehouseStaffing({ companyCode }: { companyCode: string }) {
  const settings = useBoardSettings(true, companyCode);
  const save = useSaveBoardSettings(companyCode);
  const [draft, setDraft] = useState<{ employees: string; salary: string } | null>(null);

  const employees = draft?.employees ?? settings.data?.warehouse_employees?.toString() ?? '';
  const salary = draft?.salary ?? settings.data?.warehouse_salary_monthly?.toString() ?? '';
  const edit = (patch: Partial<{ employees: string; salary: string }>) =>
    setDraft({ employees, salary, ...patch });

  const negative = [employees, salary].some((raw) => {
    const value = toNumber(raw);
    return value !== null && value < 0;
  });
  const canSave = draft !== null && !negative && !save.isPending;
  const label = companyLabel(companyCode);
  const daily = settings.data?.warehouse_salary_daily;

  return (
    <section className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold">{label} warehouse staff</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Printed as {label}&rsquo;s half of the warehouse card&rsquo;s head count. Labour is the
          gate&rsquo;s own count, priced at the board&rsquo;s labour rate below.
        </p>
      </div>

      {settings.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading {label}&rsquo;s figures…
        </div>
      ) : settings.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {getErrorMessage(settings.error, `Could not read ${label}'s figures.`)}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor={`${companyCode}-wh-employees`}
                className="block text-xs font-medium text-muted-foreground"
              >
                Employees
              </label>
              <input
                id={`${companyCode}-wh-employees`}
                type="number"
                inputMode="numeric"
                min="0"
                value={employees}
                onChange={(event) => edit({ employees: event.target.value })}
                placeholder="Not set"
                className={cn(inputClass, negative && 'border-rose-500 focus:border-rose-500')}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`${companyCode}-wh-salary`}
                className="block text-xs font-medium text-muted-foreground"
              >
                Salary <span className="font-normal">₹ / month</span>
              </label>
              <input
                id={`${companyCode}-wh-salary`}
                type="number"
                inputMode="decimal"
                min="0"
                value={salary}
                onChange={(event) => edit({ salary: event.target.value })}
                placeholder="Not set"
                className={cn(inputClass, negative && 'border-rose-500 focus:border-rose-500')}
              />
            </div>
            {daily != null && draft === null && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Shows on the board as ₹{daily.toLocaleString('en-IN')} a day.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              disabled={!canSave}
              onClick={() =>
                save.mutate(
                  {
                    warehouse_employees: toNumber(employees),
                    warehouse_salary_monthly: toNumber(salary),
                  },
                  { onSuccess: () => setDraft(null) },
                )
              }
            >
              {save.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
            {draft === null && save.isSuccess && (
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
        </>
      )}
    </section>
  );
}
