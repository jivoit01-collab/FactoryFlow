import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Loader2,
  PackageCheck,
  RefreshCw,
  Truck,
  Warehouse,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useDispatchSchedule, useDispatchScheduleItems } from '../api';
import type { DispatchSchedulePlan, DispatchScheduleStatus } from '../types';

const SCHEDULE_COLUMN_COUNT = 9;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'DISPATCHED', label: 'Dispatched' },
];

const STATUS_STYLES: Record<DispatchScheduleStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  BOOKED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

interface ScheduleGroup {
  key: string;
  label: string;
  tone: 'overdue' | 'today' | 'tomorrow' | 'upcoming';
  plans: DispatchSchedulePlan[];
}

export default function DispatchSchedulePage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, isFetching, isError, refetch } = useDispatchSchedule(
    statusFilter === 'all' ? undefined : { booking_status: statusFilter },
  );

  const today = data?.meta.today ?? '';
  const sapAvailable = data?.meta.sap_available ?? true;
  const groups = useMemo(() => buildGroups(data?.data ?? [], today), [data, today]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Dispatch Schedule"
        description="What is going out today, tomorrow and the days ahead — and the items to issue to the dock."
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => void refetch()}
          disabled={isFetching}
          title="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </Button>
      </DashboardHeader>

      {!isLoading && !isError && !sapAvailable ? (
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            SAP is currently offline, so item and warehouse details are unavailable. The schedule and
            invoice details below are still accurate; try refreshing to load the items.
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading dispatch schedule...
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="font-medium text-foreground">Unable to load the dispatch schedule.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
            <CalendarClock className="h-8 w-8 text-muted-foreground/60" />
            <p className="font-medium text-foreground">No scheduled dispatches.</p>
            <p>No dispatch plans have a dispatch date set for this period.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <ScheduleGroupCard key={group.key} group={group} sapAvailable={sapAvailable} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleGroupCard({
  group,
  sapAvailable,
}: {
  group: ScheduleGroup;
  sapAvailable: boolean;
}) {
  const toneStyles: Record<ScheduleGroup['tone'], string> = {
    overdue: 'border-red-200',
    today: 'border-emerald-300',
    tomorrow: 'border-sky-200',
    upcoming: '',
  };
  const totalBoxes = group.plans.reduce((sum, plan) => sum + (plan.total_boxes ?? 0), 0);

  return (
    <Card className={cn('overflow-hidden', toneStyles[group.tone])}>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {group.tone === 'overdue' ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <CalendarClock className="h-5 w-5" />
            )}
            {group.label}
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalBoxes > 0 ? (
              <span className="text-xs text-muted-foreground">{formatNumber(totalBoxes)} boxes</span>
            ) : null}
            <Badge variant={group.tone === 'overdue' ? 'destructive' : 'secondary'}>
              {group.plans.length} plan{group.plans.length === 1 ? '' : 's'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="w-8 p-3" />
                <th className="p-3 text-left font-medium">Dispatch Date</th>
                <th className="p-3 text-left font-medium">Invoice</th>
                <th className="p-3 text-left font-medium">Destination</th>
                <th className="p-3 text-left font-medium">Items to Issue</th>
                <th className="p-3 text-left font-medium">Warehouse</th>
                <th className="p-3 text-right font-medium">Boxes</th>
                <th className="p-3 text-right font-medium">Weight</th>
                <th className="p-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {group.plans.map((plan) => (
                <ScheduleRow key={plan.id} plan={plan} sapAvailable={sapAvailable} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleRow({
  plan,
  sapAvailable,
}: {
  plan: DispatchSchedulePlan;
  sapAvailable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const docEntry = plan.sap_invoice_doc_entry;
  const canExpand = sapAvailable && !!docEntry;
  const {
    data: items,
    isLoading: itemsLoading,
    isError: itemsError,
  } = useDispatchScheduleItems(docEntry, open && canExpand);

  const weight = plan.sap_total_weight || toNumber(plan.invoice_weight);
  const vehicleLine = [plan.vehicle_no, plan.transporter_name].filter(Boolean).join(' · ');

  return (
    <>
      <tr
        className={cn('border-b last:border-b-0', canExpand && 'cursor-pointer hover:bg-muted/40')}
        onClick={canExpand ? () => setOpen((value) => !value) : undefined}
      >
        <td className="p-3 align-top text-muted-foreground">
          {canExpand ? (
            open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : null}
        </td>
        <td className="p-3 align-top whitespace-nowrap font-medium">
          {plan.dispatch_date ? formatDateLabel(plan.dispatch_date) : '-'}
        </td>
        <td className="p-3 align-top">
          <div className="font-medium">{plan.sap_invoice_doc_num || plan.invoice_number || '-'}</div>
          {vehicleLine ? (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Truck className="h-3 w-3" />
              {vehicleLine}
            </div>
          ) : null}
        </td>
        <td className="p-3 align-top">{plan.place_of_supply || plan.budget_delivery_point || '-'}</td>
        <td className="p-3 align-top">
          {plan.item_summary ? (
            <span className="line-clamp-2 max-w-[320px]">{plan.item_summary}</span>
          ) : plan.line_count ? (
            <span className="text-muted-foreground">{plan.line_count} item lines</span>
          ) : (
            <span className="text-muted-foreground">{sapAvailable ? '-' : 'SAP offline'}</span>
          )}
        </td>
        <td className="p-3 align-top">
          {plan.warehouses ? (
            <span className="inline-flex items-center gap-1">
              <Warehouse className="h-3 w-3 text-muted-foreground" />
              {plan.warehouses}
            </span>
          ) : (
            '-'
          )}
        </td>
        <td className="p-3 text-right align-top tabular-nums">
          {plan.total_boxes ? formatNumber(plan.total_boxes) : '-'}
        </td>
        <td className="p-3 text-right align-top tabular-nums">{weight > 0 ? formatKg(weight) : '-'}</td>
        <td className="p-3 align-top">
          <StatusBadge status={plan.booking_status} />
        </td>
      </tr>
      {open && canExpand ? (
        <tr className="border-b last:border-b-0 bg-muted/20">
          <td colSpan={SCHEDULE_COLUMN_COUNT} className="p-3">
            {itemsLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading items from SAP...
              </div>
            ) : itemsError ? (
              <p className="py-3 text-sm text-amber-700">
                Could not load items for this invoice. SAP may be busy — try again shortly.
              </p>
            ) : !items || items.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No item lines found for this invoice.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border bg-background">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="p-2 text-left font-medium">Item Code</th>
                      <th className="p-2 text-left font-medium">Item</th>
                      <th className="p-2 text-right font-medium">Qty</th>
                      <th className="p-2 text-left font-medium">Warehouse</th>
                      <th className="p-2 text-right font-medium">Boxes</th>
                      <th className="p-2 text-right font-medium">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={`${item.line_num}-${item.item_code}`} className="border-b last:border-b-0">
                        <td className="p-2 font-mono text-xs font-medium">{item.item_code || '-'}</td>
                        <td className="p-2">
                          <span className="line-clamp-1 max-w-[260px]">{item.item_name || '-'}</span>
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          {[formatNumber(item.quantity), item.uom].filter(Boolean).join(' ')}
                        </td>
                        <td className="p-2">{item.warehouse_code || '-'}</td>
                        <td className="p-2 text-right tabular-nums">
                          {item.total_boxes > 0 ? formatNumber(item.total_boxes) : '-'}
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          {item.total_weight > 0 ? formatKg(item.total_weight) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function StatusBadge({ status }: { status: DispatchScheduleStatus }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
      )}
    >
      {status === 'DISPATCHED' ? <PackageCheck className="h-3 w-3" /> : null}
      {label}
    </span>
  );
}

function buildGroups(plans: DispatchSchedulePlan[], today: string): ScheduleGroup[] {
  if (!plans.length) return [];
  const tomorrow = today ? addDays(today, 1) : '';

  const overdue: DispatchSchedulePlan[] = [];
  const byDate = new Map<string, DispatchSchedulePlan[]>();

  for (const plan of plans) {
    const date = plan.dispatch_date;
    if (!date) continue;
    if (today && date < today) {
      overdue.push(plan);
      continue;
    }
    const bucket = byDate.get(date) ?? [];
    bucket.push(plan);
    byDate.set(date, bucket);
  }

  const groups: ScheduleGroup[] = [];
  if (overdue.length) {
    groups.push({ key: 'overdue', label: 'Overdue', tone: 'overdue', plans: overdue });
  }

  for (const date of Array.from(byDate.keys()).sort()) {
    let label = formatDateLabel(date);
    let tone: ScheduleGroup['tone'] = 'upcoming';
    if (date === today) {
      label = `Today · ${formatDateLabel(date)}`;
      tone = 'today';
    } else if (date === tomorrow) {
      label = `Tomorrow · ${formatDateLabel(date)}`;
      tone = 'tomorrow';
    }
    groups.push({ key: date, label, tone, plans: byDate.get(date)! });
  }

  return groups;
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const ms = Date.UTC(year, month - 1, day) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function formatDateLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function toNumber(value?: string | number | null): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatKg(value: number): string {
  return `${formatNumber(value)} kg`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
}
