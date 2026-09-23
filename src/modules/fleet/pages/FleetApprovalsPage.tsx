import { Check, ClipboardCheck, Fuel, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { EmptyPanel, PageHeader, PageSection } from '@/shared/components/page';
import { Button, Input } from '@/shared/components/ui';

import type { FuelEntry, ServiceEntry } from '../api';
import {
  useDecideFuelEntry,
  useDecideServiceEntry,
  useFleetOptions,
  usePendingApprovals,
} from '../api';
import { km, money, quantity, shortDate } from '../utils/format';

/**
 * One queue for both registers.
 *
 * An approver does not think in terms of which table a bill came from, so the
 * fuel slips and the workshop bills are shown together, oldest first. A
 * rejection has to say why: a bill sent back without a reason is one the clerk
 * cannot act on, which the server enforces and this page asks for up front.
 */
export default function FleetApprovalsPage() {
  const { data: options } = useFleetOptions();
  const { data, isLoading } = usePendingApprovals();
  const decideFuel = useDecideFuelEntry();
  const decideService = useDecideServiceEntry();

  /** The row whose reject box is open, as `fuel:12` or `service:3`. */
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const canApprove = options?.can_approve_expense ?? false;
  const fuel = data?.fuel ?? [];
  const service = data?.service ?? [];
  const nothing = !fuel.length && !service.length;

  const decide = async (
    kind: 'fuel' | 'service',
    id: number,
    approval_status: 'APPROVED' | 'REJECTED',
    rejection_reason?: string,
  ) => {
    try {
      const mutation = kind === 'fuel' ? decideFuel : decideService;
      await mutation.mutateAsync({ id, approval_status, rejection_reason });
      toast.success(approval_status === 'APPROVED' ? 'Approved' : 'Sent back');
      setRejecting(null);
      setReason('');
    } catch {
      toast.error('Could not save that decision');
    }
  };

  const Row = ({
    kind,
    id,
    title,
    lines,
    amount,
    enteredBy,
  }: {
    kind: 'fuel' | 'service';
    id: number;
    title: string;
    lines: string[];
    amount: string;
    enteredBy: string | null;
  }) => {
    const key = `${kind}:${id}`;
    const open = rejecting === key;
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
                <Button size="sm" onClick={() => decide(kind, id, 'APPROVED')}>
                  <Check className="mr-1.5 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRejecting(open ? null : key);
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
              onClick={() => decide(kind, id, 'REJECTED', reason.trim())}
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
        description="Bills waiting to be passed. Nothing here counts as spend yet."
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
          hint="Every fuel and service bill has been decided."
          loading={isLoading}
        />
      ) : (
        <>
          {fuel.length > 0 && (
            <PageSection title="Fuel" description={`${fuel.length} filling(s)`} icon={Fuel}>
              <div className="space-y-2">
                {fuel.map((entry: FuelEntry) => (
                  <Row
                    key={entry.id}
                    kind="fuel"
                    id={entry.id}
                    title={`${entry.vehicle_number}${entry.vehicle_nickname ? ` · ${entry.vehicle_nickname}` : ''}`}
                    lines={[
                      `${shortDate(entry.entry_date)} · ${quantity(entry.quantity, entry.unit)} · ${km(entry.odometer)}`,
                      [entry.station_name, entry.bill_number && `Bill ${entry.bill_number}`]
                        .filter(Boolean)
                        .join(' · ') || entry.fuel_type_label,
                    ]}
                    amount={entry.amount}
                    enteredBy={entry.entered_by_name}
                  />
                ))}
              </div>
            </PageSection>
          )}

          {service.length > 0 && (
            <PageSection title="Service" description={`${service.length} bill(s)`} icon={Wrench}>
              <div className="space-y-2">
                {service.map((entry: ServiceEntry) => (
                  <Row
                    key={entry.id}
                    kind="service"
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
        </>
      )}
    </div>
  );
}
