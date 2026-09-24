/**
 * Every change ever made to one day's status.
 *
 * Read-only, and it always ends with the machine's original reading so the
 * chain is complete: the log says what each person changed it to, and the last
 * line says what it was before anybody touched it.
 */
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import { useOverrideHistory } from '../api';
import type { DailyAttendanceRow } from '../api/attendance.api';
import { StatusBadge } from './StatusBadge';

export function HistoryDialog({
  row,
  onClose,
}: {
  row: DailyAttendanceRow | null;
  onClose: () => void;
}) {
  const { data: entries = [], isLoading } = useOverrideHistory(row?.id ?? null);

  if (!row) return null;

  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Change history</DialogTitle>
          <DialogDescription>
            {row.employee_name} ({row.employee_code}) — {row.date}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No changes — this day is exactly as the machine recorded it.
            </p>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{entry.action_display}</Badge>
                <StatusBadge status={entry.from_status} muted />
                <span className="text-muted-foreground">→</span>
                <StatusBadge status={entry.to_status} />
              </div>
              {entry.reason_code_display && (
                <p className="mt-2 text-xs font-medium">{entry.reason_code_display}</p>
              )}
              {entry.reason && <p className="text-sm text-muted-foreground">{entry.reason}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {entry.performed_by_name ?? 'Unknown'} ·{' '}
                {new Date(entry.performed_at).toLocaleString()}
              </p>
            </div>
          ))}

          {/* The bottom of the chain: what the machine itself said. */}
          <div className="rounded-md border border-dashed bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Punching machine recorded</span>
              <StatusBadge status={row.machine_status} label={row.machine_status_display} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
