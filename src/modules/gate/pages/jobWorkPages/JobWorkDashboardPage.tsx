import { CheckCircle2, Clock, Factory, FileText, Plus, RefreshCw, Search, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_TYPES } from '@/config/constants';
import { useGlobalDateRange } from '@/core/store/hooks';
import {
  type JobWorkGateInEntry,
  useEmptyVehicleEligibleEntries,
  useEmptyVehicleGateOutEntries,
  useJobWorkGateInEntries,
} from '@/modules/gate/api';
import { DateRangePicker, EmptyVehicleOutButton, GateStatusBadge } from '@/modules/gate/components';
import { getLastStep } from '@/modules/gate/hooks';
import { getJobWorkDisplayStatus, hasLinkedJobWorkProductionOrder } from '@/modules/gate/utils';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';

function formatDateTime(date?: string, time?: string) {
  if (!date && !time) return '-';
  return [date, time ? time.slice(0, 5) : ''].filter(Boolean).join(' ');
}

function formatProductionStatus(status?: string | null) {
  const labels: Record<string, string> = {
    P: 'Planned',
    R: 'Released',
    L: 'Closed',
    C: 'Cancelled',
  };
  return labels[String(status || '')] || status || '-';
}

function getJobWorkResumePath(entry: JobWorkGateInEntry) {
  const vehicleEntryId = entry.vehicle_entry;

  if (entry.status === 'COMPLETED') {
    return `/gate/job-work/new?entryId=${vehicleEntryId}`;
  }

  const lastStep = getLastStep(vehicleEntryId);

  switch (lastStep) {
    case 'review':
      return `/gate/job-work/new/review?entryId=${vehicleEntryId}`;
    case 'attachments':
      return `/gate/job-work/new/attachments?entryId=${vehicleEntryId}`;
    case 'step2':
      return `/gate/job-work/new/step2?entryId=${vehicleEntryId}`;
    default:
      return `/gate/job-work/new?entryId=${vehicleEntryId}`;
  }
}

export default function JobWorkDashboardPage() {
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
    data: entries = [],
    isLoading,
    refetch,
  } = useJobWorkGateInEntries(queryParams);

  // Empty-vehicle-out overlay: which job-work vehicles can leave empty (by vehicle-entry
  // id), and the exit time for those already out.
  const { data: eligibleEntries = [] } = useEmptyVehicleEligibleEntries({
    entry_type: ENTRY_TYPES.JOB_WORK,
  });
  const { data: emptyOuts = [] } = useEmptyVehicleGateOutEntries({
    entry_type: ENTRY_TYPES.JOB_WORK,
    from_date: dateRange.from,
    to_date: dateRange.to,
  });
  const eligibleByEntryId = useMemo(
    () => new Map(eligibleEntries.map((eligible) => [eligible.id, eligible])),
    [eligibleEntries],
  );
  const outByEntryId = useMemo(
    () => new Map(emptyOuts.map((out) => [out.vehicle_entry, out])),
    [emptyOuts],
  );

  const pendingCount = entries.filter((entry) => getJobWorkDisplayStatus(entry) === 'PENDING').length;
  const completedCount = entries.filter((entry) => getJobWorkDisplayStatus(entry) === 'COMPLETED').length;
  const productionLinkedCount = entries.filter(hasLinkedJobWorkProductionOrder).length;
  const cancelledCount = entries.filter((entry) => entry.status === 'CANCELLED').length;
  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter((entry) => (
      [
        entry.entry_no,
        entry.vehicle_number,
        entry.driver_name,
        entry.production_order_doc_num,
        entry.production_item_code,
        entry.production_item_name,
        entry.production_warehouse,
        entry.production_status,
        entry.sap_doc_num,
        entry.gate_in_date,
        entry.in_time,
        entry.status,
        getJobWorkDisplayStatus(entry),
        hasLinkedJobWorkProductionOrder(entry) ? 'Production linked' : 'Pending link',
      ].some((value) => String(value || '').toLowerCase().includes(query))
    ));
  }, [entries, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Job Work</h2>
          <p className="text-muted-foreground">
            Record oil refining vehicle movement and link the SAP production order later
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
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/gate/job-work/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{pendingCount}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Pending</p>
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
              <Factory className="h-5 w-5 text-violet-600" />
              <span className="text-2xl font-bold">{productionLinkedCount}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Production Linked</p>
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
            <Factory className="h-4 w-4" />
            Job Work Gate-In Entries
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, vehicle, driver, production order"
              className="pl-9"
            />
          </div>
        </div>
        {isLoading ? (
          <EmptyState text="Loading job work entries..." />
        ) : entries.length === 0 ? (
          <EmptyState text="No job work entries in this date range" />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No job work entries match this search" />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[1180px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Entry No.</th>
                    <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                    <th className="p-3 text-left text-sm font-medium">Driver</th>
                    <th className="p-3 text-left text-sm font-medium">Production Order</th>
                    <th className="p-3 text-left text-sm font-medium">Item</th>
                    <th className="p-3 text-left text-sm font-medium">Gate In</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                    <th className="p-3 text-left text-sm font-medium">Empty Out</th>
                    <th className="p-3 text-left text-sm font-medium">Components</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const isCancelled = entry.status === 'CANCELLED';
                    const displayStatus = getJobWorkDisplayStatus(entry);
                    return (
                      <tr
                        key={entry.id}
                        className={
                          isCancelled
                            ? 'border-t opacity-70'
                            : 'cursor-pointer border-t transition-colors hover:bg-muted/50'
                        }
                        onClick={() => {
                          if (!isCancelled) {
                            navigate(getJobWorkResumePath(entry));
                          }
                        }}
                      >
                        <td className="whitespace-nowrap p-3 text-sm font-medium">
                          {entry.entry_no}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">{entry.vehicle_number}</td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {entry.driver_name}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          <div className="font-medium">
                            {entry.production_order_doc_num
                              ? `PO ${entry.production_order_doc_num}`
                              : 'Pending link'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[
                              entry.production_warehouse,
                              formatProductionStatus(entry.production_status),
                            ].filter(Boolean).join(' - ') || '-'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {entry.production_item_name || entry.production_item_code || '-'}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {formatDateTime(entry.gate_in_date, entry.in_time)}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          <GateStatusBadge status={displayStatus} />
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {eligibleByEntryId.has(entry.vehicle_entry) ? (
                            <EmptyVehicleOutButton
                              entry={eligibleByEntryId.get(entry.vehicle_entry)!}
                            />
                          ) : outByEntryId.has(entry.vehicle_entry) ? (
                            <span className="text-muted-foreground">
                              Out ·{' '}
                              {formatDateTime(
                                outByEntryId.get(entry.vehicle_entry)!.gate_out_date,
                                outByEntryId.get(entry.vehicle_entry)!.out_time,
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">{entry.items.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
