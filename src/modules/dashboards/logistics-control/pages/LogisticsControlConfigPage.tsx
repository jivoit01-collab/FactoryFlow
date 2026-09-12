import { ArrowLeft, Check, Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useSaveWarehouseSettings, useWarehouseSettings } from '../api';
import { BoardFigures } from '../components';
import { LOGISTICS_CONTROL_WAREHOUSE } from '../constants';

/** Local `YYYY-MM-DD` — never `toISOString()`, which shifts the day in IST. */
function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * The two warehouse facts SAP does not hold.
 *
 * Both are typed in because neither is derivable. There is no tonnage capacity
 * anywhere in SAP, and WMS knows only pallet slots — a different question, since
 * a half-empty pallet still occupies a whole slot. And a clean WMS cycle count
 * writes no movement row at all, so an audit date inferred from the movement log
 * would really mean "the last count that found a discrepancy".
 *
 * Empty is a valid answer for both, and a meaningful one: it makes the board say
 * the figure is not configured rather than showing a number nobody set.
 */
export function LogisticsControlConfigPage() {
  const warehouse = LOGISTICS_CONTROL_WAREHOUSE;
  const settings = useWarehouseSettings(warehouse);
  const save = useSaveWarehouseSettings(warehouse);

  /**
   * Only what the operator has typed, or null while they have typed nothing.
   *
   * Deliberately not a copy of the server's values seeded by an effect: that
   * shape has to guess when to overwrite the form and when to leave it alone,
   * and gets it wrong the moment a refetch lands mid-edit. Here the fields fall
   * through to the server until somebody types, and saving drops back to null so
   * the form shows the saved truth rather than a stale echo of it.
   */
  const [draft, setDraft] = useState<{ capacity: string; auditDate: string } | null>(null);

  const serverCapacity =
    settings.data?.capacity_tonnes == null ? '' : String(settings.data.capacity_tonnes);
  const serverAudit = settings.data?.last_audit_date ?? '';

  const capacity = draft?.capacity ?? serverCapacity;
  const auditDate = draft?.auditDate ?? serverAudit;
  const dirty = draft !== null;

  const edit = (patch: Partial<{ capacity: string; auditDate: string }>) =>
    setDraft({ capacity, auditDate, ...patch });

  const capacityNumber = capacity.trim() === '' ? null : Number(capacity);
  const capacityInvalid =
    capacityNumber !== null && (!Number.isFinite(capacityNumber) || capacityNumber <= 0);
  const auditInFuture = auditDate !== '' && auditDate > localToday();
  const canSave = dirty && !capacityInvalid && !auditInFuture && !save.isPending;

  const handleSave = () => {
    save.mutate(
      {
        capacity_tonnes: capacityNumber,
        last_audit_date: auditDate.trim() === '' ? null : auditDate,
      },
      // Back to showing the server's values rather than an echo of the form.
      { onSuccess: () => setDraft(null) },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <header className="space-y-2">
        <Link
          to="/dashboards/logistics-control"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to the board
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Board settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Warehouse {warehouse}. Both figures come from you — SAP holds neither.
          </p>
        </div>
      </header>

      {settings.isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading the current settings…
        </div>
      ) : settings.error ? (
        <p className="rounded-xl border bg-card p-6 text-sm text-rose-600 dark:text-rose-400">
          {getErrorMessage(settings.error, 'Could not read the current settings.')}
        </p>
      ) : (
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          {/* ------------------------------------------------------ capacity */}
          <div className="space-y-1.5">
            <label htmlFor="capacity" className="block text-sm font-medium">
              Total capacity
              <span className="ml-1.5 font-normal text-muted-foreground">tonnes</span>
            </label>
            <input
              id="capacity"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={capacity}
              onChange={(event) => {
                edit({ capacity: event.target.value });
              }}
              placeholder="Not configured"
              className={cn(
                'w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums outline-none transition-colors',
                'focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10',
                capacityInvalid && 'border-rose-500 focus:border-rose-500',
              )}
            />
            <p
              className={cn(
                'text-xs',
                capacityInvalid
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-muted-foreground',
              )}
            >
              {capacityInvalid
                ? 'Capacity has to be greater than zero. Clear the field if the warehouse has no rated figure.'
                : 'What the warehouse is rated to hold. The board divides stock on hand by this to show how full it is. Leave empty and it reports space as not configured rather than guessing.'}
            </p>
          </div>

          {/* --------------------------------------------------- audit date */}
          <div className="space-y-1.5 border-t pt-4">
            <label htmlFor="audit" className="block text-sm font-medium">
              Last audit date
            </label>
            <input
              id="audit"
              type="date"
              max={localToday()}
              value={auditDate}
              onChange={(event) => {
                edit({ auditDate: event.target.value });
              }}
              className={cn(
                'w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors',
                'focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10',
                auditInFuture && 'border-rose-500 focus:border-rose-500',
              )}
            />
            <p
              className={cn(
                'text-xs',
                auditInFuture ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
              )}
            >
              {auditInFuture
                ? 'An audit cannot have happened in the future.'
                : 'When stock here was last physically verified. Typed in because a clean cycle count leaves no record — a date read from the movement log would only ever mean the last count that found a discrepancy.'}
            </p>
          </div>

          {/* -------------------------------------------------------- actions */}
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
      )}

      <BoardFigures />
    </div>
  );
}

export default LogisticsControlConfigPage;
