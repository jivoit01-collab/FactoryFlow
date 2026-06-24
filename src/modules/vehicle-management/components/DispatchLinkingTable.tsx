import { Link2, Loader2, Lock } from 'lucide-react';

import { PipelineStatusBadge } from '@/modules/dashboards/dispatch-pipeline/components';
import { StatusBadge } from '@/modules/dashboards/dispatch-plans/components';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import { Button, Checkbox } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

interface DispatchLinkingTableProps {
  bills: DispatchBill[];
  isLoading: boolean;
  canEdit: boolean;
  selectedDocEntries: Set<number>;
  onToggleSelection: (bill: DispatchBill) => void;
  onLink: (bill: DispatchBill) => void;
}

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: fractionDigits,
  });
}

function hasQuantity(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function getDispatchLinkingRowClassName(bill: DispatchBill) {
  switch (bill.plan.booking_status) {
    case 'BOOKED':
      return 'bg-slate-50 hover:bg-slate-100/80';
    case 'DISPATCHED':
      return 'bg-emerald-50/75 hover:bg-emerald-100/80';
    case 'CANCELLED':
      return 'bg-red-50/75 hover:bg-red-100/80';
    default:
      return 'hover:bg-muted/50';
  }
}

export function DispatchLinkingTable({
  bills,
  isLoading,
  canEdit,
  selectedDocEntries,
  onToggleSelection,
  onLink,
}: DispatchLinkingTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading dispatch plans...
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border text-sm text-muted-foreground">
        No dispatch plans found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1380px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="w-10 px-4 py-3 text-left font-medium text-muted-foreground"></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dispatch</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bill</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Load</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">SAP Hints</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Linked Vehicle
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Vehicle Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Remarks</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => {
              const selected = selectedDocEntries.has(bill.doc_entry);
              const linkLocked = bill.plan.is_vehicle_link_locked;
              return (
                <tr
                  key={bill.doc_entry}
                  className={cn(
                    'border-b transition-colors',
                    getDispatchLinkingRowClassName(bill),
                    selected && 'shadow-[inset_4px_0_0_hsl(var(--primary))]',
                    !canEdit && 'hover:bg-inherit',
                  )}
                >
                  <td className="px-4 py-3 align-top">
                    <Checkbox
                      checked={selected}
                      disabled={!canEdit || linkLocked}
                      aria-label={`Select invoice ${bill.doc_num}`}
                      onCheckedChange={() => onToggleSelection(bill)}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{compactText(bill.plan.dispatch_date)}</div>
                    <div className="text-xs text-muted-foreground">
                      Priority {compactText(bill.plan.priority)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-mono text-xs font-semibold">{bill.doc_num}</div>
                    <div className="text-xs text-muted-foreground">
                      Inv {compactText(bill.doc_date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {compactText(bill.branch_name)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="max-w-[230px] truncate font-medium" title={bill.card_name}>
                      {compactText(bill.card_name)}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{bill.card_code}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="max-w-[200px] truncate" title={bill.ship_to_address}>
                      {compactText(bill.city)} {compactText(bill.state)}
                    </div>
                    <div
                      className="max-w-[200px] truncate text-xs text-muted-foreground"
                      title={bill.ship_to_address}
                    >
                      {compactText(bill.ship_to_address)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top tabular-nums">
                    <div>{formatNumber(bill.total_litres)} L</div>
                    <div className="text-xs text-muted-foreground">
                      {hasQuantity(bill.total_boxes)
                        ? `${formatNumber(bill.total_boxes)} boxes`
                        : 'Boxes not available'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(bill.total_weight, 3)} kg
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div
                      className="max-w-[190px] truncate font-medium"
                      title={bill.sap_transporter_name}
                    >
                      {compactText(bill.sap_transporter_name)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Vehicle {compactText(bill.sap_vehicle_no || bill.gst_vehicle_no)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bilty {compactText(bill.sap_bilty_no || bill.sap_lr_number)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">Vehicle {compactText(bill.plan.vehicle_no)}</div>
                    <div className="text-xs text-muted-foreground">
                      Bilty {compactText(bill.plan.bilty_no)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={bill.plan.booking_status} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <PipelineStatusBadge status={bill.plan.pipeline_status} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div
                      className="max-w-[220px] truncate text-xs text-muted-foreground"
                      title={bill.plan.remarks ?? undefined}
                    >
                      {compactText(bill.plan.remarks)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <Button
                      type="button"
                      variant={bill.plan.vehicle_id ? 'outline' : 'default'}
                      size="sm"
                      disabled={!canEdit || linkLocked}
                      title={
                        linkLocked
                          ? 'Empty vehicle gate-in is complete. To re-plan, complete an empty-vehicle-out for this vehicle first.'
                          : undefined
                      }
                      onClick={() => onLink(bill)}
                    >
                      {linkLocked ? (
                        <Lock className="mr-2 h-4 w-4" />
                      ) : (
                        <Link2 className="mr-2 h-4 w-4" />
                      )}
                      {linkLocked
                        ? 'Locked'
                        : selectedDocEntries.size > 1 && selected
                          ? 'Link Selected'
                          : bill.plan.vehicle_id
                            ? 'Edit Link'
                            : 'Link'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
