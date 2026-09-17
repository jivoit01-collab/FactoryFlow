/**
 * Change one day's status, with a reason.
 *
 * The dialog always shows the machine's own reading at the top, because that is
 * what the correction is being made *against* — and it shows the punch detail
 * beside it, since "one punch at 09:09" is usually the whole explanation for why
 * a correction is needed.
 *
 * The reason is mandatory in both forms and the submit button stays disabled
 * until both are given. That is enforced on the server too; doing it here as
 * well is about telling the user why the button is dead, not about trusting the
 * client.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import { useAttendanceVocabulary, useOverrideStatus, useRevertStatus } from '../api';
import type {
  AttendanceStatusValue,
  DailyAttendanceRow,
  OverrideReasonCode,
} from '../api/attendance.api';
import { StatusBadge } from './StatusBadge';
import { formatMinutes, formatTime } from './statusBits';

interface Props {
  row: DailyAttendanceRow | null;
  onClose: () => void;
}

/**
 * The wrapper exists only to key the form on the row.
 *
 * Remounting on a new row is what resets the fields, rather than an effect that
 * copies props into state — that version re-rendered twice on every open and,
 * worse, would have overwritten half-typed input the moment the row refetched.
 */
export function OverrideDialog({ row, onClose }: Props) {
  if (!row) return null;
  return <OverrideForm key={row.id} row={row} onClose={onClose} />;
}

function OverrideForm({ row, onClose }: { row: DailyAttendanceRow; onClose: () => void }) {
  const { data: vocabulary } = useAttendanceVocabulary();
  const override = useOverrideStatus();
  const revert = useRevertStatus();

  // Seeded with what stands, so a correction of a correction starts from the
  // current answer rather than from the machine's.
  const [status, setStatus] = useState<AttendanceStatusValue | ''>(row.effective_status);
  const [reasonCode, setReasonCode] = useState<OverrideReasonCode | ''>(
    row.override_reason_code || '',
  );
  const [reason, setReason] = useState(row.override_reason || '');

  const canSubmit = Boolean(status) && Boolean(reasonCode) && reason.trim().length >= 3;
  const busy = override.isPending || revert.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await override.mutateAsync({
        id: row.id,
        payload: {
          status: status as AttendanceStatusValue,
          reason_code: reasonCode as OverrideReasonCode,
          reason: reason.trim(),
        },
      });
      toast.success(`${row.employee_name} marked ${status.replace('_', ' ').toLowerCase()}.`);
      onClose();
    } catch {
      // The API client raises its own toast for the failure.
    }
  };

  const handleRevert = async () => {
    try {
      await revert.mutateAsync({ id: row.id, reason: reason.trim() });
      toast.success('Reverted to the punch machine reading.');
      onClose();
    } catch {
      /* handled by the API client */
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change attendance status</DialogTitle>
          <DialogDescription>
            {row.employee_name} ({row.employee_code}) — {row.date}
          </DialogDescription>
        </DialogHeader>

        {/* What the machine recorded. The thing being argued with. */}
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Punch machine recorded</span>
            <StatusBadge status={row.machine_status} label={row.machine_status_display} />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <span>In: {formatTime(row.machine_first_punch)}</span>
            <span>Out: {formatTime(row.machine_last_punch)}</span>
            <span>
              {row.machine_punch_count} punch{row.machine_punch_count === 1 ? '' : 'es'} ·{' '}
              {formatMinutes(row.machine_worked_minutes)}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="override-status">New status</Label>
            <NativeSelect
              id="override-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as AttendanceStatusValue)}
            >
              <SelectOption value="">Select a status…</SelectOption>
              {vocabulary?.statuses.map((item) => (
                <SelectOption key={item.value} value={item.value}>
                  {item.label}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label htmlFor="override-reason-code">Reason</Label>
            <NativeSelect
              id="override-reason-code"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value as OverrideReasonCode)}
            >
              <SelectOption value="">Select a reason…</SelectOption>
              {vocabulary?.reason_codes.map((item) => (
                <SelectOption key={item.value} value={item.value}>
                  {item.label}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label htmlFor="override-note">What happened?</Label>
            <Textarea
              id="override-note"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="e.g. Forgot to punch out; supervisor confirms he worked the full shift."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Required. This is what payroll and any later dispute will read.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {row.is_overridden ? (
            <Button variant="outline" onClick={handleRevert} disabled={busy}>
              Revert to machine
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || busy}>
              {busy ? 'Saving…' : 'Save change'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
