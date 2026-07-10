import {
  CheckCircle2,
  FileText,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Truck,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import {
  type EmptyVehicleGateOutEntry,
  useEmptyVehicleEligibleEntries,
  useEmptyVehicleGateOutEntries,
} from '@/modules/gate/api';
import { DateRangePicker, GateStatusBadge } from '@/modules/gate/components';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';

const ENTRY_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: 'Raw Material',
  DAILY_NEED: 'Daily Need',
  MAINTENANCE: 'Maintenance',
  CONSTRUCTION: 'Construction',
  EMPTY_VEHICLE: 'Empty Vehicle',
  BST_IN: 'BST In',
  BST_RETURN: 'BST Return',
  JOB_WORK: 'Job Work',
};

function formatDateTime(date?: string | null, time?: string | null) {
  if (!date && !time) return '-';
  return [date, time ? time.slice(0, 5) : ''].filter(Boolean).join(' ');
}

function formatEntryTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatEntryType(value?: string | null) {
  if (!value) return '-';
  return ENTRY_TYPE_LABELS[value] || value.replaceAll('_', ' ');
}

export default function EmptyVehicleOutPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');

  const queryParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
    }),
    [dateRange.from, dateRange.to],
  );

  const {
    data: eligibleEntries = [],
    isLoading: isEligibleLoading,
    refetch: refetchEligible,
  } = useEmptyVehicleEligibleEntries({ ...queryParams, all_companies: 1 });
  const {
    data: entries = [],
    isLoading: isEntriesLoading,
    refetch: refetchEntries,
  } = useEmptyVehicleGateOutEntries(queryParams);

  const cancelledCount = entries.filter((entry) => entry.status === 'CANCELLED').length;
  const completedCount = entries.filter((entry) => entry.status === 'COMPLETED').length;
  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter((entry) => (
      [
        entry.entry_no,
        entry.vehicle_entry_no,
        entry.vehicle_entry_type,
        formatEntryType(entry.vehicle_entry_type),
        entry.vehicle_number,
        entry.driver_name,
        entry.driver_mobile,
        entry.gate_out_date,
        entry.out_time,
        entry.security_name,
        entry.status,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    ));
  }, [entries, searchTerm]);

  const handleRefresh = () => {
    refetchEligible();
    refetchEntries();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Empty Vehicle Out</h2>
          <p className="text-muted-foreground">
            Mark inward vehicles out when they leave without outbound goods
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(date) => {
              if (date && 'from' in date) {
                setDateRange(date);
              } else {
                setDateRange(undefined);
              }
            }}
          />
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/gate/empty-vehicle-out/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Truck className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">
                {isEligibleLoading ? '-' : eligibleEntries.length}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Awaiting Out</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{completedCount}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-violet-600" />
              <span className="text-2xl font-bold">{entries.length}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Total Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold">{cancelledCount}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Empty Vehicle Gate-Out Entries
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, vehicle, driver"
              className="pl-9"
            />
          </div>
        </div>
        {isEntriesLoading ? (
          <EmptyState text="Loading empty vehicle exits..." />
        ) : entries.length === 0 ? (
          <EmptyState text="No empty vehicle exits in this date range" />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No empty vehicle exits match this search" />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[1040px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Out Entry</th>
                    <th className="p-3 text-left text-sm font-medium">In Entry</th>
                    <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                    <th className="p-3 text-left text-sm font-medium">Driver</th>
                    <th className="p-3 text-left text-sm font-medium">In Type</th>
                    <th className="p-3 text-left text-sm font-medium">Gate Out</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                    <th className="p-3 text-left text-sm font-medium">Security</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function EntryRow({ entry }: { entry: EmptyVehicleGateOutEntry }) {
  const navigate = useNavigate();
  const isCancelled = entry.status === 'CANCELLED';

  return (
    <tr
      className={
        isCancelled
          ? 'cursor-pointer border-t opacity-70 transition-colors hover:bg-muted/50'
          : 'cursor-pointer border-t transition-colors hover:bg-muted/50'
      }
      onClick={() => navigate(`/gate/empty-vehicle-out/${entry.id}`)}
    >
      <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entry_no}</td>
      <td className="whitespace-nowrap p-3 text-sm">
        <div className="font-medium">{entry.vehicle_entry_no}</div>
        <div className="text-xs text-muted-foreground">
          {formatEntryTime(entry.vehicle_entry_time)}
        </div>
      </td>
      <td className="whitespace-nowrap p-3 text-sm">{entry.vehicle_number}</td>
      <td className="whitespace-nowrap p-3 text-sm">
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          {entry.driver_name}
        </span>
      </td>
      <td className="whitespace-nowrap p-3 text-sm">
        <Badge variant="outline">{formatEntryType(entry.vehicle_entry_type)}</Badge>
      </td>
      <td className="whitespace-nowrap p-3 text-sm">
        {formatDateTime(entry.gate_out_date, entry.out_time)}
      </td>
      <td className="whitespace-nowrap p-3 text-sm">
        <GateStatusBadge status={entry.status} />
      </td>
      <td className="whitespace-nowrap p-3 text-sm text-muted-foreground">
        {entry.security_name || '-'}
      </td>
    </tr>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
