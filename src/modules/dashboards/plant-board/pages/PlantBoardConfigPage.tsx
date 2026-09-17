import { ArrowLeft, Check, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  useSaveWarehouseSettings,
  useWarehouseSettings,
} from '../../logistics-control/api';
import {
  useAddPlantBoardDepartment,
  usePlantBoardSpace,
  usePlantBoardWorkforce,
  useRemovePlantBoardDepartment,
  useSavePlantBoardSpace,
  useSavePlantBoardWorkforce,
} from '../api';
import { PLANT_BOARD_STORES } from '../constants';
import type { WorkforceSetting } from '../types';

/** Local `YYYY-MM-DD` — never `toISOString()`, which shifts the day in IST. */
function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * When each packaging store was last physically counted.
 *
 * One field, because it is the one fact here that nothing can derive. A clean
 * stock count writes no movement row at all, so a date inferred from the
 * movement log would really mean "the last count that found a discrepancy" —
 * which would make a well-audited store look neglected and a neglected one look
 * fresh.
 *
 * Three stores rather than one, because the board's Store band covers BH-PM,
 * BH-BS and BH-PC together. They share the per-warehouse settings row the
 * Logistics board also writes, so a store configured on either screen is
 * configured on both.
 *
 * Empty is a valid answer, and a meaningful one: it makes the board say no
 * count is recorded rather than show a date nobody set.
 */
export default function PlantBoardConfigPage() {
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboards/plant-board">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to the board
              </Link>
            </Button>
          </div>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            Board settings
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            When each packaging store was last physically counted. Nothing can work this out
            on its own — a clean count leaves no trace in the movement log — so the board
            reads it from here, and says no count is recorded rather than showing a date
            nobody set.
          </p>
        </div>
      </header>

      <section>
        <h2 className="text-sm font-semibold tracking-tight">Last physical count</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          {PLANT_BOARD_STORES.map((warehouse) => (
            <StoreCard key={warehouse} warehouse={warehouse} />
          ))}
        </div>
      </section>

      <SpaceSection />

      <WorkforceSection />
    </div>
  );
}

/** A whole number, or null for a field the operator has cleared. */
function parseCount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

/** Rupees, or null. Kept separate from `parseCount` so it is not rounded. */
function parseMoney(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Which band a department's people show under, for the operator's benefit. */
const BAND_LABEL: Record<string, string> = {
  purchase: 'Purchase',
  store: 'Store',
  production: 'Production',
  shifting: 'Shifting',
};

interface NewDepartment {
  label: string;
  band: string;
  kind: 'employee' | 'labour';
  employees: string;
  salary: string;
}

/**
 * A department starts in Production and on the payroll.
 *
 * Not an empty band: a select that opens on nothing invites somebody to save
 * without choosing, and the band is the one field here with no sensible
 * "unset" — a department has to appear on some strip or it appears nowhere.
 */
const BLANK_DEPARTMENT: NewDepartment = {
  label: '',
  band: 'production',
  kind: 'employee',
  employees: '',
  salary: '',
};

/**
 * Head count and wage bill, per department.
 *
 * NOTHING IN THIS SYSTEM HOLDS EITHER FIGURE. The two department masters the
 * app runs on are disjoint and neither contains these six departments, and
 * salary is withheld by the employee endpoint from any login without a salary
 * grant — which a wall-board login is. So somebody types it here.
 *
 * THE WAGE BILL IS MONTHLY. That is how it is paid, so that is how it is
 * entered; the board divides it by the calendar days in the month to show the
 * daily run rate that sits beside the day's output. Entering a daily figure
 * here would be wrong by thirty.
 *
 * An empty field is a real answer and is saved as one: it makes the board draw
 * a rule rather than a zero, which is the difference between "nobody counted"
 * and "nobody works here".
 */
/**
 * The floor a single pallet stands on.
 *
 * NOTHING IN SAP CAN ANSWER THIS. Checked against all 878 packaging items in
 * Oil: `OITM` holds no volume, no dimensions, and a gross weight on 155 of
 * them. The stores are measured in square feet and their contents counted in
 * pieces, and SAP cannot join the two.
 *
 * The factory joins it in two measured steps. The first is already done: its
 * stacking sheet gives pieces per pallet PER ITEM, so a carton and a cap are
 * never treated as the same size. This field is the second and last step, and
 * it is here rather than in the sheet because it varies by site, not by
 * material.
 *
 * Clearing it is a real edit. It puts the tile back to reporting the floor and
 * the stock separately, which is the right state when nobody stands behind the
 * figure any more.
 */
function SpaceSection() {
  const space = usePlantBoardSpace();
  const save = useSavePlantBoardSpace();
  const [draft, setDraft] = useState<string | null>(null);

  const saved =
    space.data?.sqft_per_pallet == null ? '' : String(space.data.sqft_per_pallet);
  const factor = draft ?? saved;
  const dirty = draft !== null;

  const parsed = factor.trim() === '' ? null : Number(factor);
  const invalid = parsed !== null && (!Number.isFinite(parsed) || parsed <= 0);

  const floor = space.data?.floor_sqft ?? 0;
  const handleSave = () =>
    save.mutate(parsed, { onSuccess: () => setDraft(null) });

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">Stock space</h2>
        <p className="text-xs text-muted-foreground">
          SAP holds no size for a packaging item, so this is measured once.
        </p>
      </div>

      <div className="mt-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">
              Square feet per pallet
            </span>
            <input
              type="number"
              min={0}
              step="0.001"
              inputMode="decimal"
              aria-label="Square feet per pallet"
              value={factor}
              onChange={(event) => setDraft(event.target.value)}
              className={cn(
                'mt-1 w-40 rounded-lg border bg-background px-3 py-2 text-sm tabular-nums',
                invalid && 'border-destructive',
              )}
            />
            {invalid && (
              <span className="mt-1 block text-xs text-destructive">
                It has to be more than zero.
              </span>
            )}
          </label>

          <div className="text-xs text-muted-foreground">
            <p>
              Measured against{' '}
              <strong className="tabular-nums">{floor.toLocaleString('en-IN')}</strong> sq ft
              of floor:
            </p>
            <ul className="mt-1 space-y-0.5">
              {(space.data?.blocks ?? []).map((block) => (
                <li key={block.label}>
                  {block.label} — {block.sqft.toLocaleString('en-IN')} sq ft
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-3 max-w-2xl text-xs text-muted-foreground">
          Stock becomes pallets on the factory&rsquo;s own stacking sheet, item by item
          &mdash; 300 five-litre bottles to a pallet, 60,000 caps to a pallet. This is
          the last step: what one pallet stands on. Clear it and the board reports the
          floor and the stock side by side instead of saying how full the stores are,
          which is the honest reading when nobody stands behind the figure.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={!dirty || invalid || save.isPending}>
            {save.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Save
          </Button>
          {!dirty && save.isSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          {save.isError && (
            <span className="text-xs text-destructive">
              {getErrorMessage(save.error, 'The factor could not be saved.')}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function WorkforceSection() {
  const workforce = usePlantBoardWorkforce();
  const save = useSavePlantBoardWorkforce();

  // Keyed by department, holding only what has been typed. Same shape as the
  // store card above and for the same reason: a draft seeded from the server
  // has to guess when to overwrite the field, and gets it wrong mid-edit.
  const [draft, setDraft] = useState<Record<string, { employees?: string; salary?: string }>>(
    {},
  );

  // The row being added, kept apart from `draft` above: that one holds edits to
  // departments that exist, this one holds a department that does not yet.
  const add = useAddPlantBoardDepartment();
  const remove = useRemovePlantBoardDepartment();
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<NewDepartment>(BLANK_DEPARTMENT);

  const rows = workforce.data ?? [];
  const edited = Object.keys(draft);

  const valueOf = (row: WorkforceSetting, field: 'employees' | 'salary') => {
    const typed = draft[row.key]?.[field];
    if (typed !== undefined) return typed;
    const saved = field === 'employees' ? row.employees : row.salary_monthly;
    return saved === null ? '' : String(saved);
  };

  const setField = (key: string, field: 'employees' | 'salary', value: string) =>
    setDraft((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));

  const handleAdd = () => {
    add.mutate(
      {
        label: newRow.label.trim(),
        band: newRow.band,
        kind: newRow.kind,
        employees: parseCount(newRow.employees),
        salary_monthly: parseMoney(newRow.salary),
      },
      {
        onSuccess: () => {
          setNewRow(BLANK_DEPARTMENT);
          setAdding(false);
        },
      },
    );
  };

  const handleSave = () => {
    save.mutate(
      // Only what changed. The server reads a null as "nobody has counted this
      // any more", so sending untouched rows would rewrite them for no reason.
      edited.map((key) => {
        const row = rows.find((item) => item.key === key)!;
        return {
          key,
          employees: parseCount(valueOf(row, 'employees')),
          salary_monthly: parseMoney(valueOf(row, 'salary')),
        };
      }),
      { onSuccess: () => setDraft({}) },
    );
  };

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">People and wages</h2>
        <p className="text-xs text-muted-foreground">
          Salary is the bill for a <strong>month</strong>. The board shows it per day.
        </p>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Department</th>
              <th className="px-4 py-2 text-left font-medium">Shows under</th>
              <th className="px-4 py-2 text-right font-medium">No of employees</th>
              <th className="px-4 py-2 text-right font-medium">Salary (a month)</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{row.label}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {BAND_LABEL[row.band] ?? row.band}
                  {' · '}
                  {row.kind === 'employee' ? 'employees' : 'labour'}
                  {row.is_custom && (
                    <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                      added here
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    aria-label={`${row.label} employees`}
                    value={valueOf(row, 'employees')}
                    onChange={(event) => setField(row.key, 'employees', event.target.value)}
                    className="w-24 rounded-lg border bg-background px-2 py-1 text-right text-sm tabular-nums"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    aria-label={`${row.label} monthly salary`}
                    value={valueOf(row, 'salary')}
                    onChange={(event) => setField(row.key, 'salary', event.target.value)}
                    className="w-36 rounded-lg border bg-background px-2 py-1 text-right text-sm tabular-nums"
                  />
                </td>
                {/* Only a department added here can be removed. The six the
                    board was designed around are part of its layout and live in
                    server code, which refuses to delete one however this is
                    called — the missing button is the reminder, not the guard. */}
                <td className="px-2 py-2 text-right">
                  {row.is_custom && (
                    <button
                      type="button"
                      aria-label={`Remove ${row.label}`}
                      title={`Remove ${row.label}`}
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm(`Remove ${row.label} and its figures?`)) {
                          remove.mutate(row.key);
                        }
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {adding && (
              <tr className="border-b bg-muted/30 last:border-0">
                <td className="px-4 py-2">
                  <input
                    autoFocus
                    aria-label="New department name"
                    placeholder="Department name"
                    value={newRow.label}
                    onChange={(event) =>
                      setNewRow((current) => ({ ...current, label: event.target.value }))
                    }
                    className="w-full rounded-lg border bg-background px-2 py-1 text-sm"
                  />
                </td>
                {/* Band and kind are pickers, never free text: they decide which
                    strip these people appear on and which half of it they count
                    towards, so a typo would file the department somewhere
                    nobody looks rather than fail. */}
                <td className="px-4 py-2">
                  <div className="flex gap-1.5">
                    <select
                      aria-label="New department band"
                      value={newRow.band}
                      onChange={(event) =>
                        setNewRow((current) => ({ ...current, band: event.target.value }))
                      }
                      className="rounded-lg border bg-background px-2 py-1 text-xs"
                    >
                      {Object.entries(BAND_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="New department kind"
                      value={newRow.kind}
                      onChange={(event) =>
                        setNewRow((current) => ({
                          ...current,
                          kind: event.target.value as 'employee' | 'labour',
                        }))
                      }
                      className="rounded-lg border bg-background px-2 py-1 text-xs"
                    >
                      <option value="employee">employees</option>
                      <option value="labour">labour</option>
                    </select>
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    aria-label="New department employees"
                    value={newRow.employees}
                    onChange={(event) =>
                      setNewRow((current) => ({ ...current, employees: event.target.value }))
                    }
                    className="w-24 rounded-lg border bg-background px-2 py-1 text-right text-sm tabular-nums"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    aria-label="New department monthly salary"
                    value={newRow.salary}
                    onChange={(event) =>
                      setNewRow((current) => ({ ...current, salary: event.target.value }))
                    }
                    className="w-36 rounded-lg border bg-background px-2 py-1 text-right text-sm tabular-nums"
                  />
                </td>
                <td className="px-2 py-2" />
              </tr>
            )}
            {rows.length === 0 && !adding && (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                  {workforce.isLoading ? 'Loading departments…' : 'No departments configured.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {adding ? (
          <>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newRow.label.trim() || add.isPending}
            >
              {add.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              Add department
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNewRow(BLANK_DEPARTMENT);
                setAdding(false);
              }}
              disabled={add.isPending}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add department
          </Button>
        )}

        <Button
          size="sm"
          onClick={handleSave}
          disabled={edited.length === 0 || save.isPending}
        >
          {save.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          Save
        </Button>
        {edited.length === 0 && save.isSuccess && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
        {save.isError && (
          <span className="text-xs text-destructive">
            {getErrorMessage(save.error, 'The figures could not be saved.')}
          </span>
        )}
        {add.isError && (
          <span className="text-xs text-destructive">
            {getErrorMessage(add.error, 'The department could not be added.')}
          </span>
        )}
        {remove.isError && (
          <span className="text-xs text-destructive">
            {getErrorMessage(remove.error, 'The department could not be removed.')}
          </span>
        )}
      </div>
    </section>
  );
}

/**
 * One store's count date.
 *
 * The draft holds only what the operator has typed, or null while they have
 * typed nothing. Deliberately not a copy of the server's value seeded by an
 * effect: that shape has to guess when to overwrite the field and when to leave
 * it alone, and gets it wrong the moment a refetch lands mid-edit. Here the
 * field falls through to the server until somebody types, and saving drops back
 * to null so the form shows the saved truth rather than a stale echo of it.
 */
function StoreCard({ warehouse }: { warehouse: string }) {
  const settings = useWarehouseSettings(warehouse);
  const save = useSaveWarehouseSettings(warehouse);

  const [draft, setDraft] = useState<string | null>(null);

  const serverAudit = settings.data?.last_audit_date ?? '';
  const auditDate = draft ?? serverAudit;
  const dirty = draft !== null;

  // A count cannot have happened tomorrow. Caught here rather than server-side
  // only, so the operator sees it while the field is still under their cursor.
  const auditInFuture = auditDate !== '' && auditDate > localToday();
  const canSave = dirty && !auditInFuture && !save.isPending;

  const handleSave = () => {
    save.mutate(
      {
        // Sent back unchanged, not nulled. This screen no longer edits the
        // capacity, and a save that omitted it would silently wipe a figure
        // set on the Logistics board — the two write the same row.
        capacity_tonnes: settings.data?.capacity_tonnes ?? null,
        last_audit_date: auditDate.trim() === '' ? null : auditDate,
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold tracking-tight">{warehouse}</h2>
        {settings.isLoading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="mt-4">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Last physical count</span>
          <input
            type="date"
            max={localToday()}
            value={auditDate}
            onChange={(event) => setDraft(event.target.value)}
            className={cn(
              'mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums',
              auditInFuture && 'border-destructive',
            )}
          />
          {auditInFuture && (
            <span className="mt-1 block text-xs text-destructive">
              A count cannot have happened in the future.
            </span>
          )}
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={!canSave}>
          {save.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          Save
        </Button>
        {!dirty && save.isSuccess && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
        {save.isError && (
          <span className="text-xs text-destructive">
            {getErrorMessage(save.error, 'The date could not be saved.')}
          </span>
        )}
      </div>
    </section>
  );
}
