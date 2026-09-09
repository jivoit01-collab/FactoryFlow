import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PipelineStatusBadge } from '@/modules/dashboards/dispatch-pipeline/components';
import { StatusBadge } from '@/modules/dashboards/dispatch-plans/components';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { formatDateTimeShort } from '@/shared/utils/format';

import {
  formatCompactCurrency,
  formatCompanyChip,
  formatCount,
  formatCurrency,
  formatDay,
  formatDecimal,
  formatWeight,
} from '../utils/format';
import { DetailSection, DetailTotals } from './DetailPrimitives';

/** "Raaj (EP1476)", or an empty string when the plan carries no user. */
function person(name: string, code: string): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return '';
  return code?.trim() ? `${trimmed} (${code.trim()})` : trimmed;
}

export interface BillDetailDialogProps {
  bill: DispatchBill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown when the bill was opened by drilling into a truck. */
  onBack?: () => void;
  backLabel?: string;
}

/**
 * Everything the board knows about one bill, read-only.
 *
 * The panels can only afford four lines a row, so this is where the rest of the
 * invoice lives — the SAP header, what is on it, the plan the dispatch team
 * filled in, and the transport actually booked. SAP's own transport snapshot is
 * kept in its own block rather than merged with the plan's: the two disagree
 * often enough that flattening them would hide which one a reader is looking at.
 *
 * Blocks with nothing in them are dropped rather than printed as a wall of
 * dashes, so a thin bill stays short.
 */
export function BillDetailDialog({
  bill,
  open,
  onOpenChange,
  onBack,
  backLabel = 'Back',
}: BillDetailDialogProps) {
  if (!bill) return null;

  const plan = bill.plan;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader className="pr-8">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="-ml-2 mb-1 h-7 w-fit px-2 text-xs text-muted-foreground"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              {backLabel}
            </Button>
          )}
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="tabular-nums">Bill #{bill.doc_num}</span>
            <StatusBadge status={plan.booking_status} />
            {plan.pipeline_status && <PipelineStatusBadge status={plan.pipeline_status} />}
            {bill.company_code && (
              <Badge variant="outline">{formatCompanyChip(bill.company_code)}</Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{bill.card_name || 'Unknown customer'}</p>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <DetailTotals
            items={[
              { label: 'Value', value: formatCurrency(bill.doc_total) },
              { label: 'Litres', value: `${formatDecimal(bill.total_litres)} L` },
              { label: 'Boxes', value: formatCount(bill.total_boxes) },
              { label: 'Weight', value: formatWeight(bill.total_weight) || '—' },
            ]}
          />

          <DetailSection
            title="Invoice"
            fields={[
              { label: 'Invoice no', value: bill.doc_num },
              { label: 'Invoice date', value: formatDay(bill.doc_date) },
              { label: 'Created', value: formatDay(bill.create_date) },
              { label: 'Branch', value: bill.branch_name },
              { label: 'Customer code', value: bill.card_code },
              { label: 'Customer GSTIN', value: bill.bp_gstin },
              { label: 'City / state', value: [bill.city, bill.state].filter(Boolean).join(', ') },
              { label: 'Ship to', value: bill.ship_to_address, wide: true },
            ]}
          />

          <DetailSection
            title="Contents"
            fields={[
              { label: 'Lines', value: bill.line_count ? formatCount(bill.line_count) : '' },
              { label: 'Quantity', value: formatDecimal(bill.total_quantity) },
              { label: 'Warehouses', value: bill.warehouses },
              { label: 'Base documents', value: bill.base_refs },
              { label: 'Items', value: bill.item_summary, wide: true },
            ]}
          />

          <DetailSection
            title="Dispatch plan"
            fields={[
              { label: 'Dispatch date', value: formatDay(plan.dispatch_date) },
              { label: 'Priority', value: plan.priority },
              { label: 'Place of supply', value: plan.place_of_supply },
              { label: 'Delivery location', value: plan.location },
              { label: 'Product variety', value: plan.product_variety },
              { label: 'Budget delivery point', value: plan.budget_delivery_point },
              { label: 'Effective month', value: plan.effective_month },
              { label: 'Service location', value: plan.service_location_name },
              { label: 'SAC code', value: plan.sac_code },
              { label: 'E-way bill', value: plan.eway_bill },
            ]}
          />

          <DetailSection
            title="Transport booked"
            hideWhenEmpty
            fields={[
              { label: 'Vehicle', value: plan.vehicle_no },
              { label: 'Transporter', value: plan.transporter_name },
              { label: 'Transporter GSTIN', value: plan.transporter_gstin },
              { label: 'Contact', value: plan.contact_person },
              { label: 'Mobile', value: plan.mobile_no },
              { label: 'Driver', value: plan.driver_name },
              { label: 'Driver mobile', value: plan.driver_mobile_no },
              { label: 'Driver licence', value: plan.driver_license_no },
              { label: 'Bilty no', value: plan.bilty_no },
              { label: 'Bilty date', value: formatDay(plan.bilty_date) },
              {
                label: 'Freight',
                value: plan.freight ? formatCompactCurrency(Number(plan.freight)) : '',
              },
              {
                label: 'Total freight',
                value: plan.total_freight ? formatCompactCurrency(Number(plan.total_freight)) : '',
              },
              { label: 'Kanta weight', value: formatWeight(plan.kanta_weight) },
              { label: 'Invoice weight', value: formatWeight(plan.invoice_weight) },
            ]}
          />

          <DetailSection
            title="SAP transport snapshot"
            hideWhenEmpty
            fields={[
              { label: 'Vehicle', value: bill.sap_vehicle_no },
              { label: 'GST vehicle', value: bill.gst_vehicle_no },
              { label: 'Transporter', value: bill.sap_transporter_name },
              { label: 'Dispatch date', value: formatDay(bill.sap_dispatch_date) },
              { label: 'Bilty no', value: bill.sap_bilty_no },
              { label: 'Bilty date', value: formatDay(bill.sap_bilty_date) },
              { label: 'LR number', value: bill.sap_lr_number },
              { label: 'E-way bill', value: bill.sap_eway_bill },
              { label: 'Transporter invoice', value: bill.sap_transporter_invoice },
            ]}
          />

          <DetailSection
            title="Remarks"
            hideWhenEmpty
            fields={[{ label: 'Remarks', value: plan.remarks, wide: true }]}
          />

          {/* Who touched the plan. `created_by` is the person the plan row was
              created by — for a bill that is on the board only because somebody
              filled in a dispatch date, that is who filled it. `updated_by` is
              whoever last saved anything, often a different person, so the two
              are labelled separately rather than merged into "changed by". */}
          <DetailSection
            title="Planning trail"
            hideWhenEmpty
            fields={[
              {
                label: 'Plan created by',
                value: person(plan.created_by_name, plan.created_by_code),
              },
              { label: 'Created on', value: formatDateTimeShort(plan.created_at) },
              {
                label: 'Last updated by',
                value: person(plan.updated_by_name, plan.updated_by_code),
              },
              { label: 'Last updated', value: formatDateTimeShort(plan.updated_at) },
            ]}
          />

          <div className="flex justify-end pb-1">
            <Button asChild variant="outline" size="sm">
              <Link to="/dispatch/plans">
                Open in Dispatch Plans
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
