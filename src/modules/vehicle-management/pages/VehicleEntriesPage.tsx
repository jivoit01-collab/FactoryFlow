import { useQuery } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { ClipboardList, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ENTRY_TYPES } from '@/config/constants';
import { vehicleEntryApi } from '@/modules/gate/api/vehicle/vehicleEntry.api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';

const VEHICLE_ENTRY_TYPE_OPTIONS = [
  { value: ENTRY_TYPES.RAW_MATERIAL, label: 'Raw Material' },
  { value: ENTRY_TYPES.CONSTRUCTION, label: 'Construction' },
  { value: ENTRY_TYPES.DAILY_NEED, label: 'Daily Needs' },
  { value: ENTRY_TYPES.MAINTENANCE, label: 'Maintenance' },
  { value: ENTRY_TYPES.SALES_DISPATCH, label: 'Docking' },
] as const;

type VehicleEntryType = (typeof VEHICLE_ENTRY_TYPE_OPTIONS)[number]['value'];
type EntryTypeFilter = 'ALL' | VehicleEntryType;

function toDateInputValue(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

export default function VehicleEntriesPage() {
  const [fromDate, setFromDate] = useState(() => toDateInputValue(addDays(new Date(), -30)));
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()));
  const [entryType, setEntryType] = useState<EntryTypeFilter>('ALL');
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const entryTypesToFetch = useMemo(
    () =>
      entryType === 'ALL' ? VEHICLE_ENTRY_TYPE_OPTIONS.map((option) => option.value) : [entryType],
    [entryType],
  );

  const {
    data: entries = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['vehicleManagementVehicleEntries', fromDate, toDate, entryType, status],
    queryFn: async () => {
      const results = await Promise.allSettled(
        entryTypesToFetch.map((type) =>
          vehicleEntryApi.getList({
            from_date: fromDate,
            to_date: toDate,
            entry_type: type,
            status: status || undefined,
          }),
        ),
      );

      const fulfilledEntries = results.flatMap((result) =>
        result.status === 'fulfilled' ? result.value : [],
      );
      const failedResult = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );

      if (failedResult && fulfilledEntries.length === 0) {
        throw failedResult.reason;
      }

      return fulfilledEntries.sort((a, b) =>
        compactText(b.entry_time, '').localeCompare(compactText(a.entry_time, '')),
      );
    },
  });

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter((entry) =>
      [
        entry.entry_no,
        entry.status,
        entry.entry_type,
        entry.vehicle?.vehicle_number,
        entry.driver?.name,
        entry.remarks,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [entries, searchTerm]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Vehicle Entries">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex w-full flex-col gap-1.5 sm:w-auto">
          <Label htmlFor="vehicle-entry-from" className="text-xs">
            From
          </Label>
          <Input
            id="vehicle-entry-from"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-auto">
          <Label htmlFor="vehicle-entry-to" className="text-xs">
            To
          </Label>
          <Input
            id="vehicle-entry-to"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-auto">
          <Label htmlFor="vehicle-entry-type" className="text-xs">
            Type
          </Label>
          <NativeSelect
            id="vehicle-entry-type"
            value={entryType}
            onChange={(event) => setEntryType(event.target.value as EntryTypeFilter)}
            className="w-full sm:w-40"
          >
            <SelectOption value="ALL">All</SelectOption>
            {VEHICLE_ENTRY_TYPE_OPTIONS.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-auto">
          <Label htmlFor="vehicle-entry-status" className="text-xs">
            Status
          </Label>
          <NativeSelect
            id="vehicle-entry-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full sm:w-40"
          >
            <SelectOption value="">All</SelectOption>
            <SelectOption value="DRAFT">Draft</SelectOption>
            <SelectOption value="IN_PROGRESS">In Progress</SelectOption>
            <SelectOption value="COMPLETED">Completed</SelectOption>
            <SelectOption value="CANCELLED">Cancelled</SelectOption>
          </NativeSelect>
        </div>
        <div className="relative min-w-0 flex-1 basis-full sm:min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search entry, vehicle, driver"
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entry</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Driver</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entry Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto mb-2 h-5 w-5" />
                  No vehicle entries found.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td className="px-4 py-3">
                    <div className="font-medium">{entry.entry_no}</div>
                    <div className="text-xs text-muted-foreground">
                      {compactText(entry.remarks)}
                    </div>
                  </td>
                  <td className="px-4 py-3">{compactText(entry.vehicle?.vehicle_number)}</td>
                  <td className="px-4 py-3">{compactText(entry.driver?.name)}</td>
                  <td className="px-4 py-3">{compactText(entry.entry_type)}</td>
                  <td className="px-4 py-3">{compactText(entry.status)}</td>
                  <td className="px-4 py-3">{compactText(entry.entry_time)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
