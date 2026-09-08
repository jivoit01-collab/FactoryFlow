import { Droplets, FileText, Package } from 'lucide-react';

import { StatusBadge } from '@/modules/dashboards/dispatch-plans/components';
import type { DispatchBill, DispatchPlansMeta } from '@/modules/dashboards/dispatch-plans/types';

import { WAREHOUSE_CONTROL_PREVIEW_ROWS } from '../constants';
import { SECTION_ACCENT } from '../constants/warehouse-control.theme';
import { compactText, formatCompactCurrency, formatCount, formatDecimal } from '../utils/format';
import { ControlSection } from './ControlSection';
import { ControlEmpty, ControlError, ControlSkeletonRows } from './ControlStates';

export interface TodaysBillsPanelProps {
  bills: DispatchBill[];
  meta?: DispatchPlansMeta;
  loading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
}

/** One bill: identity and customer on the left, money on the right. */
function BillRow({ bill }: { bill: DispatchBill }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm font-semibold tabular-nums">#{bill.doc_num}</span>
          <StatusBadge status={bill.plan.booking_status} />
        </div>
        <p className="truncate text-sm">{compactText(bill.card_name)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {compactText(bill.city, 'No city')} · {formatDecimal(bill.total_litres)} L ·{' '}
          {formatCount(bill.total_boxes)} boxes
        </p>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums">
        {formatCompactCurrency(bill.doc_total)}
      </p>
    </li>
  );
}

/** A day total, shown as a small labelled figure under the header. */
function Total({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Droplets;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/** Every SAP invoice cut today, with the day's totals above them. */
export function TodaysBillsPanel({
  bills,
  meta,
  loading,
  isFetching,
  error,
  onRetry,
}: TodaysBillsPanelProps) {
  const visible = bills.slice(0, WAREHOUSE_CONTROL_PREVIEW_ROWS);
  const hidden = bills.length - visible.length;

  const metaLine = meta
    ? `${formatCount(meta.total_bills)} bills · ${formatCompactCurrency(meta.total_doc_value)}`
    : 'SAP invoices raised today';

  return (
    <ControlSection
      id="todays-bills"
      title="Today's Bills"
      description="SAP invoices raised today, with the day's running totals"
      meta={metaLine}
      icon={FileText}
      accent={SECTION_ACCENT.bills}
      isFetching={isFetching && !loading}
      action={{ label: 'Dispatch plans', to: '/dispatch/plans' }}
    >
      {error ? (
        <ControlError
          error={error}
          fallback="Today's bills could not be read from SAP."
          onRetry={onRetry}
        />
      ) : loading ? (
        <ControlSkeletonRows rows={4} />
      ) : !meta ? (
        <ControlEmpty message="Today's bills could not be read." />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Total
              icon={Droplets}
              value={`${formatDecimal(meta.total_litres)} L`}
              label="oil billed"
            />
            <Total
              icon={Package}
              value={formatCount(meta.total_boxes)}
              label="boxes to move"
            />
            <Total
              icon={FileText}
              value={formatCount(meta.pending_count)}
              label="still pending"
            />
          </div>

          {visible.length === 0 ? (
            <ControlEmpty message="No bills have been raised today yet." />
          ) : (
            <ul className="divide-y overflow-hidden rounded-lg border">
              {visible.map((bill) => (
                <BillRow key={`${bill.company_code ?? ''}-${bill.doc_entry}`} bill={bill} />
              ))}
            </ul>
          )}

          {hidden > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {formatCount(visible.length)} of {formatCount(bills.length)} bills — open
              Dispatch Plans for the rest.
            </p>
          )}
        </div>
      )}
    </ControlSection>
  );
}
