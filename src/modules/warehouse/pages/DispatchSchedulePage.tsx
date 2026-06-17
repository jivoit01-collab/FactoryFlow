import { AlertTriangle, CalendarClock, PackageCheck, RefreshCw, Truck } from 'lucide-react';
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

import { useDispatchSchedule } from '../api';
import type { DispatchSchedulePlan, DispatchScheduleStatus } from '../types';

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

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useDispatchSchedule(statusFilter === 'all' ? undefined : { booking_status: statusFilter });

  const today = data?.meta.today ?? '';
  const groups = useMemo(() => buildGroups(data?.data ?? [], today), [data, today]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Dispatch Schedule"
        description="Dispatch plans scheduled to go out — today, tomorrow and the days ahead."
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
            <ScheduleGroupCard key={group.key} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleGroupCard({ group }: { group: ScheduleGroup }) {
  const toneStyles: Record<ScheduleGroup['tone'], string> = {
    overdue: 'border-red-200',
    today: 'border-emerald-300',
    tomorrow: 'border-sky-200',
    upcoming: '',
  };
  const totalLitres = group.plans.reduce((sum, plan) => sum + toNumber(plan.total_litres), 0);

  return (
    <Card className={cn('overflow-hidden', toneStyles[group.tone])}>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {group.tone === 'overdue' ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Truck className="h-5 w-5" />
            )}
            {group.label}
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalLitres > 0 ? (
              <span className="text-xs text-muted-foreground">{formatNumber(totalLitres)} L</span>
            ) : null}
            <Badge variant={group.tone === 'overdue' ? 'destructive' : 'secondary'}>
              {group.plans.length} plan{group.plans.length === 1 ? '' : 's'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="p-3 text-left font-medium">Invoice</th>
                <th className="p-3 text-left font-medium">Destination</th>
                <th className="p-3 text-left font-medium">Product</th>
                <th className="p-3 text-left font-medium">Vehicle</th>
                <th className="p-3 text-left font-medium">Transporter</th>
                <th className="p-3 text-right font-medium">Litres</th>
                <th className="p-3 text-right font-medium">Weight</th>
                <th className="p-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {group.plans.map((plan) => (
                <tr key={plan.id} className="border-b last:border-b-0">
                  <td className="p-3 font-medium">
                    {plan.sap_invoice_doc_num || plan.invoice_number || '-'}
                  </td>
                  <td className="p-3">{plan.place_of_supply || plan.budget_delivery_point || '-'}</td>
                  <td className="p-3">{plan.product_variety || '-'}</td>
                  <td className="p-3 font-mono text-xs">{plan.vehicle_no || '-'}</td>
                  <td className="p-3">{plan.transporter_name || '-'}</td>
                  <td className="p-3 text-right tabular-nums">{formatMaybeNumber(plan.total_litres)}</td>
                  <td className="p-3 text-right tabular-nums">
                    {formatMaybeNumber(plan.kanta_weight ?? plan.invoice_weight)}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={plan.booking_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
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

function toNumber(value?: string | null): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMaybeNumber(value?: string | null): string {
  const parsed = toNumber(value);
  return parsed > 0 ? formatNumber(parsed) : '-';
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
}
