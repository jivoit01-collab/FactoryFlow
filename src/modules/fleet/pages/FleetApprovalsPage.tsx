import { Check, ClipboardCheck, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { EmptyPanel, PageHeader, PageSection } from '@/shared/components/page';
import { Button, Input } from '@/shared/components/ui';

import type { ServiceEntry } from '../api';
import { useDecideServiceEntry, useFleetOptions, usePendingApprovals } from '../api';
import { money, shortDate } from '../utils/format';

/**
 * The workshop bills waiting to be passed, oldest first.
 *
 * Fuel is deliberately absent: a filling counts the moment it is recorded, so
 * there is nothing to approve. A rejection has to say why — a bill sent back
 * without a reason is one the clerk cannot act on, which the server enforces
 * and this page asks for up front.
 */
export default function FleetApprovalsPage() {
  const { data: options } = useFleetOptions();
  const { data, isLoading } = usePendingApprovals();
  const decideService = useDecideServiceEntry();

  /** The id of the bill whose "why" box is open, if any. */
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const canApprove = options?.can_approve_expense ?? false;
  const service = data?.service ?? [];
  const nothing = !service.length;

  const decide = async (
    id: number,
    approval_status: 'APPROVED' | 'REJECTED',
    rejection_reason?: string,
  ) => {
    try {
      await decideService.mutateAsync({ id, approval_status, rejection_reason });
      toast.success(approval_status === 'APPROVED' ? 'Approved' : 'Sent back');
      setRejecting(null);
      setReason('');
    } catch {
      toast.error('Could not save that decision');
    }
  };

  const Row = ({
    id,
    title,
    lines,
    amount,
    enteredBy,
  }: {
    id: number;
    title: string;
    lines: string[];
    amount: string;
    enteredBy: string | null;
  }) => {
    const open = rejecting === id;
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{title}</p>
            {lines.map((line) => (
              <p key={line} className="text-sm text-muted-foreground">
                {line}
              </p>
            ))}
            {enteredBy && (
              <p className="mt-1 text-xs text-muted-foreground">Entered by {enteredBy}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tabular-nums">{money(amount)}</span>
            {canApprove && (
              <div className="flex gap-1.5">
                <Button size="sm" onClick={() => decide(id, 'APPROVED')}>
                  <Check className="mr-1.5 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRejecting(open ? null : id);
                    setReason('');
                  }}
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Send back
                </Button>
              </div>
            )}
          </div>
        </div>

        {open && (
          <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
            <Input
              autoFocus
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is it going back? The clerk sees this."
              className="min-w-[240px] flex-1"
            />
            <Button
              variant="destructive"
              disabled={!reason.trim()}
              onClick={() => decide(id, 'REJECTED', reason.trim())}
            >
              Send back
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Approvals"
        description="Workshop bills waiting to be passed. Fuel needs no approval."
        icon={ClipboardCheck}
        accent="amber"
        backTo="/fleet"
        backLabel="Company Vehicles"
      />

      {!canApprove && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          You can see what is waiting, but passing a bill needs the approve right.
        </p>
      )}

      {nothing ? (
        <EmptyPanel
          message={isLoading ? 'Loading…' : 'Nothing waiting'}
          hint="Every workshop bill has been decided."
          loading={isLoading}
        />
      ) : (
        <PageSection title="Service" description={`${service.length} bill(s)`} icon={Wrench}>
          <div className="space-y-2">
            {service.map((entry: ServiceEntry) => (
              <Row
                key={entry.id}
                id={entry.id}
                title={`${entry.vehicle_number}${entry.vehicle_nickname ? ` · ${entry.vehicle_nickname}` : ''}`}
                lines={[
                  `${shortDate(entry.entry_date)} · ${entry.kind_label}${entry.workshop_name ? ` · ${entry.workshop_name}` : ''}`,
                  entry.description || '',
                ].filter(Boolean)}
                amount={entry.total_amount}
                enteredBy={entry.entered_by_name}
              />
            ))}
          </div>
        </PageSection>
      )}
    </div>
  );
}
