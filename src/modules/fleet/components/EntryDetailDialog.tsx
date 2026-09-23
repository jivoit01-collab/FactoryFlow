import { FileText, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { StatusPill } from '@/shared/components/page';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import type { ApprovalStatusCode, FuelEntry, ServiceEntry } from '../api';
import { useOpenAttachment } from '../api';
import { km, money, quantity, rupees, shortDate } from '../utils/format';

/** One entry, whichever register it came from. */
export type EntryDetail =
  | { kind: 'fuel'; entry: FuelEntry }
  | { kind: 'service'; entry: ServiceEntry };

function approvalTone(status: ApprovalStatusCode) {
  if (status === 'APPROVED') return 'done' as const;
  if (status === 'REJECTED') return 'blocked' as const;
  return 'warn' as const;
}

/** One labelled line. Anything empty is dropped rather than shown as a dash. */
function Line({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '' || value === '—') return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <dl className="divide-y rounded-lg border px-3">{children}</dl>
    </section>
  );
}

/**
 * Everything recorded against one filling or one workshop bill.
 *
 * The tables show what a row can carry without becoming unreadable; this is
 * where the rest lives — the pump, the bill number, who filled it, and the
 * photo of the slip itself. A workshop bill also shows who passed it and why
 * it was sent back; a filling has no approval, so it shows neither.
 */
export function EntryDetailDialog({
  open,
  onOpenChange,
  detail,
  canEdit,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: EntryDetail | null;
  /** A filling is always editable; a workshop bill only until it is passed. */
  canEdit?: boolean;
  onEdit?: (detail: EntryDetail) => void;
}) {
  const openAttachment = useOpenAttachment();
  if (!detail) return null;

  const { kind, entry } = detail;
  const isFuel = kind === 'fuel';
  const billPhotoUrl = entry.bill_photo_url;
  const editable =
    canEdit && (isFuel || (entry as ServiceEntry).approval_status !== 'APPROVED');

  const openBill = () =>
    openAttachment.mutate(
      { kind, id: entry.id },
      { onError: () => toast.error('That bill could not be opened.') },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {entry.vehicle_number}
            {entry.vehicle_nickname && (
              <span className="text-sm font-normal text-muted-foreground">
                {entry.vehicle_nickname}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {isFuel ? 'Filling' : (entry as ServiceEntry).kind_label} on{' '}
            {shortDate(entry.entry_date)}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
            {/* Only a workshop bill has an approval to show. */}
            {isFuel ? (
              <span className="text-sm text-muted-foreground">
                {shortDate(entry.entry_date)}
              </span>
            ) : (
              <StatusPill tone={approvalTone((entry as ServiceEntry).approval_status)} dot>
                {(entry as ServiceEntry).approval_status_label}
              </StatusPill>
            )}
            <span className="text-xl font-semibold tabular-nums">
              {money(isFuel ? (entry as FuelEntry).amount : (entry as ServiceEntry).total_amount)}
            </span>
          </div>

          {!isFuel && (entry as ServiceEntry).rejection_reason && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Sent back: {(entry as ServiceEntry).rejection_reason}
            </p>
          )}

          {isFuel ? (
            <>
              <Section title="The filling">
                <Line label="Fuel" value={(entry as FuelEntry).fuel_type_label} />
                <Line label="Meter reading" value={km((entry as FuelEntry).odometer)} />
                <Line
                  label="Quantity"
                  value={quantity((entry as FuelEntry).quantity, (entry as FuelEntry).unit)}
                />
                <Line label="Rate" value={rupees((entry as FuelEntry).rate)} />
                <Line label="Amount" value={money((entry as FuelEntry).amount)} />
                <Line
                  label="Tank"
                  value={(entry as FuelEntry).is_tank_full ? 'Filled full' : 'Part fill'}
                />
              </Section>

              <Section title="What it worked out to">
                <Line label="Run since last fill" value={km((entry as FuelEntry).distance_km)} />
                <Line
                  label="Mileage"
                  value={
                    (entry as FuelEntry).mileage
                      ? `${(entry as FuelEntry).mileage} ${(entry as FuelEntry).mileage_unit}`
                      : 'Not measurable — needs two full tanks'
                  }
                />
              </Section>

              <Section title="The bill">
                <Line label="Pump / station" value={(entry as FuelEntry).station_name} />
                <Line label="Bill number" value={(entry as FuelEntry).bill_number} />
                <Line label="Paid by" value={(entry as FuelEntry).payment_mode_label} />
                <Line label="Filled by" value={(entry as FuelEntry).filled_by} />
              </Section>
            </>
          ) : (
            <>
              <Section title="The work">
                <Line label="Type" value={(entry as ServiceEntry).kind_label} />
                <Line label="Workshop" value={(entry as ServiceEntry).workshop_name} />
                <Line label="What was done" value={(entry as ServiceEntry).description} />
                <Line label="Meter reading" value={km((entry as ServiceEntry).odometer)} />
                <Line label="Days off the road" value={(entry as ServiceEntry).down_days} />
              </Section>

              <Section title="The bill">
                <Line label="Parts" value={money((entry as ServiceEntry).parts_amount)} />
                <Line label="Labour" value={money((entry as ServiceEntry).labour_amount)} />
                <Line label="Total" value={money((entry as ServiceEntry).total_amount)} />
                <Line label="Bill number" value={(entry as ServiceEntry).bill_number} />
                <Line label="Paid by" value={(entry as ServiceEntry).payment_mode_label} />
              </Section>

              <Section title="Next service">
                <Line label="Due on" value={shortDate((entry as ServiceEntry).next_service_date)} />
                <Line label="Or at" value={km((entry as ServiceEntry).next_service_odometer)} />
              </Section>
            </>
          )}

          <Section title="Trail">
            <Line label="Entered by" value={entry.entered_by_name} />
            {!isFuel && (
              <Line
                label={
                  (entry as ServiceEntry).approval_status === 'REJECTED'
                    ? 'Sent back by'
                    : 'Approved by'
                }
                value={(entry as ServiceEntry).approved_by_name}
              />
            )}
            <Line label="Remarks" value={entry.remarks} />
            {isFuel && (
              <Line label="Note on the meter" value={(entry as FuelEntry).odometer_note} />
            )}
          </Section>

          {billPhotoUrl && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={openBill}
              disabled={openAttachment.isPending}
            >
              <FileText className="mr-2 h-4 w-4" />
              {openAttachment.isPending ? 'Opening…' : 'Open the bill'}
            </Button>
          )}
        </DialogBody>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {editable && onEdit && (
            <Button type="button" onClick={() => onEdit(detail)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
