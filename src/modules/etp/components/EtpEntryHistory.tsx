/**
 * One entry's edit history, shown under its own form.
 *
 * A treatment-plant register stays editable — a correction often only surfaces
 * at the month-end review — so instead of locking an entry after N days the
 * module keeps every version attributable. Sitting inside the entry being edited
 * (rather than in one list for the whole month) it is obvious *which* day a
 * change belongs to: this is the history of the row on screen.
 *
 * Each line is the summary; expanding it shows the value the field held before.
 */

import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/shared/components/ui';

import { useEtpChangeLog } from '../api';
import {
  CHANGE_ACTION_LABELS,
  type ChangeAction,
  type RegisterChangeLogRow,
  type RegisterKey,
} from '../types';

const ACTION_VARIANT: Record<ChangeAction, 'secondary' | 'destructive' | 'outline'> = {
  CREATED: 'outline',
  UPDATED: 'secondary',
  VERIFIED: 'secondary',
  DELETED: 'destructive',
};

/** Turn `inlet_final` into `inlet final` for the details list. */
function fieldLabel(field: string) {
  return field.replace(/_/g, ' ');
}

function value(raw: string | number | boolean | null) {
  if (raw === null || raw === '' || raw === undefined) return '—';
  if (typeof raw === 'boolean') return raw ? 'yes' : 'no';
  return String(raw);
}

/** "2026-08-25T14:36:11Z" → "25-08-2026 14:36", the way the registers read. */
function stamp(iso: string) {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return iso;
  const date = `${String(when.getDate()).padStart(2, '0')}-${String(when.getMonth() + 1).padStart(
    2,
    '0',
  )}-${when.getFullYear()}`;
  const time = `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(
    2,
    '0',
  )}`;
  return `${date} ${time}`;
}

function HistoryLine({ row }: { row: RegisterChangeLogRow }) {
  const [open, setOpen] = useState(false);
  const fields = Object.entries(row.changes ?? {});
  const expandable = fields.length > 0;

  return (
    <li className="border-t py-1.5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span className="whitespace-nowrap text-muted-foreground">{stamp(row.changed_at)}</span>
        <Badge variant={ACTION_VARIANT[row.action]}>
          {CHANGE_ACTION_LABELS[row.action] ?? row.action_display}
        </Badge>
        {expandable ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex items-start gap-1 text-left hover:underline"
          >
            {open ? (
              <ChevronDown className="mt-0.5 h-3 w-3 shrink-0" />
            ) : (
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />
            )}
            <span>{row.summary}</span>
          </button>
        ) : (
          <span>{row.summary}</span>
        )}
        <span className="ml-auto whitespace-nowrap text-muted-foreground">
          by {row.changed_by_name || 'system'}
        </span>
      </div>

      {open && (
        <table className="mt-1 text-xs">
          <tbody>
            {fields.map(([field, change]) => (
              <tr key={field}>
                <td className="py-0.5 pr-4 font-medium">{fieldLabel(field)}</td>
                <td className="py-0.5 pr-2 text-muted-foreground line-through">
                  {value(change.from)}
                </td>
                <td className="py-0.5 pr-2">→</td>
                <td className="py-0.5 font-medium">{value(change.to)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </li>
  );
}

export function EtpEntryHistory({
  register,
  objectId,
  limit = 20,
}: {
  register: RegisterKey;
  /** The entry whose history this is. */
  objectId: number;
  limit?: number;
}) {
  const { data: rows = [], isLoading } = useEtpChangeLog({
    register,
    object_id: objectId,
    limit,
  });

  return (
    <section className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <History className="h-4 w-4" /> Edit history
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        This entry stays editable — every change to it is recorded here with the value it held
        before.
      </p>

      {isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">Loading history…</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No changes recorded for this entry yet.
        </p>
      ) : (
        <ul className="mt-2">
          {rows.map((row) => (
            <HistoryLine key={row.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}
