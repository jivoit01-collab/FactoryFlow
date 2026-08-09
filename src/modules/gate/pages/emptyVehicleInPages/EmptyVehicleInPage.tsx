import {
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Truck,
  User,
} from 'lucide-react';
import { type KeyboardEvent, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ENTRY_TYPES } from '@/config/constants';
import { useGlobalDateRange } from '@/core/store/hooks';
import { PipelineStatusBadge } from '@/modules/dashboards/dispatch-pipeline/components';
import { getPipelineStageRowClass } from '@/modules/dashboards/dispatch-pipeline/utils/pipelineStatus';
import { useDispatchBills } from '@/modules/dashboards/dispatch-plans/api';
import {
  type EmptyVehicleGateInEntry,
  useEmptyVehicleEligibleEntries,
  useEmptyVehicleGateInEntries,
  useEmptyVehicleGateOutEntries,
} from '@/modules/gate/api';
import { DateRangePicker, EmptyVehicleOutButton, GateStatusBadge } from '@/modules/gate/components';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  buildEmptyVehicleGroups,
  buildExpectedDispatchVehicles,
  type EmptyVehicleGroup,
  formatDispatchNumber,
} from './emptyVehicleInDispatch';

export default function EmptyVehicleInPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'inside'>('all');
  const expectedDispatchRef = useRef<HTMLElement>(null);

  const showInsideOnly = () =>
    setStatusFilter((current) => (current === 'inside' ? 'all' : 'inside'));
  const showAllEntries = () => setStatusFilter('all');
  const scrollToExpectedDispatch = () =>
    expectedDispatchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const activateOnKey = (handler: () => void) => (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler();
    }
  };

  const queryParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
      // The factory is one physical place for all three companies, so the
      // empty-vehicle-in board always aggregates across the user's companies
      // regardless of the active Company-Code. Each row is tagged with its company.
      all_companies: 1,
    }),
    [dateRange.from, dateRange.to],
  );
  const expectedDispatchParams = useMemo(
    () => ({
      date_from: dateRange.from,
      date_to: dateRange.to,
      booking_status: 'BOOKED' as const,
      limit: 200,
      // The gate expects vehicles by their scheduled dispatch date, not the SAP
      // invoice date — a bill invoiced earlier but scheduled to leave in this window
      // must show.
      by_dispatch_date: true,
      // The gate is one place for all the user's companies: show expected vehicles
      // across every company (the company selector is a decorator here too).
      all_companies: true,
    }),
    [dateRange.from, dateRange.to],
  );

  const {
    data: entries = [],
    isLoading: isEntriesLoading,
    refetch: refetchEntries,
  } = useEmptyVehicleGateInEntries(queryParams);
  const {
    data: activeDispatchEntries = [],
    refetch: refetchActiveDispatchEntries,
  } = useEmptyVehicleGateInEntries({
    reason: 'DISPATCH',
    inside_only: true,
    all_companies: 1,
  });
  const {
    data: expectedDispatchResponse,
    isLoading: isExpectedDispatchLoading,
    refetch: refetchExpectedDispatch,
  } = useDispatchBills(expectedDispatchParams);

  // Empty-vehicle-out overlay: which chains can leave empty (by vehicle-entry id) and the
  // exit time for those already out. Cross-company, matching this board's aggregation.
  const { data: eligibleEntries = [] } = useEmptyVehicleEligibleEntries({
    entry_type: ENTRY_TYPES.EMPTY_VEHICLE,
    all_companies: 1,
  });
  const { data: emptyOuts = [] } = useEmptyVehicleGateOutEntries({
    entry_type: ENTRY_TYPES.EMPTY_VEHICLE,
    all_companies: 1,
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

  const insideEntries = entries.filter(
    (entry) => !['COMPLETED', 'CANCELLED'].includes(entry.vehicle_entry_status),
  );
  const expectedDispatchVehicles = useMemo(
    () => buildExpectedDispatchVehicles(expectedDispatchResponse?.data || [], activeDispatchEntries),
    [activeDispatchEntries, expectedDispatchResponse?.data],
  );
  const filteredEntries = useMemo(() => {
    const base =
      statusFilter === 'inside'
        ? entries.filter(
            (entry) => !['COMPLETED', 'CANCELLED'].includes(entry.vehicle_entry_status),
          )
        : entries;
    const query = searchTerm.trim().toLowerCase();
    if (!query) return base;

    return base.filter((entry) => (
      [
        entry.entry_no,
        entry.vehicle_number,
        entry.driver_name,
        entry.driver_mobile,
        entry.reason,
        entry.reason_display,
        entry.sap_doc_num,
        entry.sap_doc_entry,
        entry.sap_from_warehouse,
        entry.sap_to_warehouse,
        entry.document_reference,
        entry.document_notes,
        entry.bst_gate_out_entry_no,
        entry.gate_in_date,
        entry.in_time,
        entry.vehicle_entry_status,
        entry.security_name,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    ));
  }, [entries, searchTerm, statusFilter]);

  // One expandable row per physical truck (arrival, else vehicle) so a
  // cross-company gate-in shows as a single vehicle entry; single-entry groups
  // render exactly as before.
  const vehicleGroups = useMemo(() => buildEmptyVehicleGroups(filteredEntries), [filteredEntries]);

  const formatOutDateTime = (date?: string, time?: string) =>
    [date, time ? time.slice(0, 5) : ''].filter(Boolean).join(' ') || '-';

  // Render the "Empty Out" cell content for one vehicle-entry chain: a button when it can
  // still leave empty, the exit time once it has, else a dash.
  const renderEmptyOutCell = (vehicleEntryId: number) => {
    const eligible = eligibleByEntryId.get(vehicleEntryId);
    if (eligible) {
      return <EmptyVehicleOutButton entry={eligible} onCompleted={() => refetchEntries()} />;
    }
    const out = outByEntryId.get(vehicleEntryId);
    if (out) {
      return (
        <span className="text-xs text-muted-foreground">
          Out · {formatOutDateTime(out.gate_out_date, out.out_time)}
        </span>
      );
    }
    return <span className="text-muted-foreground">-</span>;
  };

  const renderEntryRow = (entry: EmptyVehicleGateInEntry, indent: boolean) => (
    <tr
      key={entry.id}
      className={cn(
        'cursor-pointer border-t',
        getPipelineStageRowClass(entry.pipeline_status?.stage) || 'hover:bg-muted/40',
      )}
      onClick={() => navigate(`/gate/empty-vehicle-in/new?gateInId=${entry.id}`)}
    >
      <td className={cn('whitespace-nowrap p-3 text-sm font-medium', indent && 'pl-9')}>
        {entry.entry_no}
      </td>
      <td className="whitespace-nowrap p-3 text-sm">
        {entry.company_name || entry.company_code ? (
          <span className="inline-flex whitespace-nowrap rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">
            {entry.company_name || entry.company_code}
          </span>
        ) : (
          '-'
        )}
      </td>
      <td className="whitespace-nowrap p-3 text-sm">{entry.vehicle_number}</td>
      <td className="whitespace-nowrap p-3 text-sm">
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          {entry.driver_name}
        </span>
      </td>
      <td className="whitespace-nowrap p-3 text-sm">
        {entry.pipeline_status ? (
          <PipelineStatusBadge status={entry.pipeline_status} />
        ) : (
          <GateStatusBadge status={entry.vehicle_entry_status} />
        )}
      </td>
      <td className="whitespace-nowrap p-3 text-sm">
        <Badge variant="outline">{entry.reason_display}</Badge>
      </td>
      <td className="whitespace-nowrap p-3 text-sm">
        <DocumentCell entry={entry} />
      </td>
      <td className="whitespace-nowrap p-3 text-sm">{entry.gate_in_date}</td>
      <td className="whitespace-nowrap p-3 text-sm">{entry.in_time}</td>
      <td className="whitespace-nowrap p-3 text-sm text-muted-foreground">
        {entry.security_name || '-'}
      </td>
      <td className="whitespace-nowrap p-3 text-sm">{renderEmptyOutCell(entry.vehicle_entry)}</td>
    </tr>
  );

  // One physical truck under several companies = ONE row (its VehicleArrival is
  // the app-level entry), rendered like a single-company row but carrying every
  // company + its bills. Shared fields (vehicle, driver, dates) come from the
  // primary chain -- one physical truck, so they're identical across companies.
  const renderMergedTruckRow = (group: EmptyVehicleGroup) => {
    const primary = group.subEntries[0];
    return (
      <tr
        key={group.key}
        className={cn(
          'cursor-pointer border-t',
          getPipelineStageRowClass(primary.pipeline_status?.stage) || 'hover:bg-muted/40',
        )}
        // Open the truck via its primary chain's entry (its bills, driver, and
        // arrival are shared); every company's bills are already shown in-row.
        onClick={() => navigate(`/gate/empty-vehicle-in/new?gateInId=${primary.id}`)}
      >
        <td className="whitespace-nowrap p-3 text-sm font-medium">
          {group.arrivalNo || primary.entry_no}
        </td>
        <td className="whitespace-nowrap p-3 text-sm">
          <div className="flex flex-wrap gap-1">
            {group.companies.map((company) => (
              <span
                key={company}
                className="inline-flex whitespace-nowrap rounded-full border bg-muted px-2 py-0.5 text-xs font-medium"
              >
                {company}
              </span>
            ))}
          </div>
        </td>
        <td className="whitespace-nowrap p-3 text-sm">{group.vehicleNumber || '-'}</td>
        <td className="whitespace-nowrap p-3 text-sm">
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {primary.driver_name}
          </span>
        </td>
        <td className="whitespace-nowrap p-3 text-sm">
          {primary.pipeline_status ? (
            <PipelineStatusBadge status={primary.pipeline_status} />
          ) : (
            <GateStatusBadge status={primary.vehicle_entry_status} />
          )}
        </td>
        <td className="whitespace-nowrap p-3 text-sm">
          <Badge variant="outline">{primary.reason_display}</Badge>
        </td>
        <td className="whitespace-nowrap p-3 text-sm">
          <div className="space-y-1">
            {group.subEntries.map((entry) => (
              <DocumentCell key={entry.id} entry={entry} />
            ))}
          </div>
        </td>
        <td className="whitespace-nowrap p-3 text-sm">{primary.gate_in_date}</td>
        <td className="whitespace-nowrap p-3 text-sm">{primary.in_time}</td>
        <td className="whitespace-nowrap p-3 text-sm text-muted-foreground">
          {primary.security_name || '-'}
        </td>
        <td className="whitespace-nowrap p-3 text-sm">
          <div className="flex flex-col gap-1">
            {group.subEntries.map((sub) => {
              const eligible = eligibleByEntryId.get(sub.vehicle_entry);
              if (eligible) {
                const company = eligible.company_code || eligible.company_name || '';
                return (
                  <EmptyVehicleOutButton
                    key={sub.id}
                    entry={eligible}
                    label={company ? `Out · ${company}` : undefined}
                    onCompleted={() => refetchEntries()}
                  />
                );
              }
              const out = outByEntryId.get(sub.vehicle_entry);
              if (out) {
                return (
                  <span key={sub.id} className="text-xs text-muted-foreground">
                    Out · {formatOutDateTime(out.gate_out_date, out.out_time)}
                  </span>
                );
              }
              return null;
            })}
            {group.subEntries.every(
              (sub) =>
                !eligibleByEntryId.has(sub.vehicle_entry) &&
                !outByEntryId.has(sub.vehicle_entry),
            ) ? (
              <span className="text-muted-foreground">-</span>
            ) : null}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Empty Vehicle In</h2>
          <p className="text-muted-foreground">
            Record empty vehicles entering for BST, dispatch, repair, or job work
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
          <Button
            variant="outline"
            onClick={() => {
              refetchEntries();
              refetchActiveDispatchEntries();
              refetchExpectedDispatch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/gate/empty-vehicle-in/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card
          role="button"
          tabIndex={0}
          onClick={showInsideOnly}
          onKeyDown={activateOnKey(showInsideOnly)}
          title="Show only vehicles still inside"
          className={cn(
            'cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            statusFilter === 'inside' && 'ring-2 ring-blue-600',
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Truck className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{insideEntries.length}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Inside</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={showAllEntries}
          onKeyDown={activateOnKey(showAllEntries)}
          title="Show all entries"
          className={cn(
            'cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            statusFilter === 'all' && 'ring-2 ring-green-600',
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{entries.length}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Total Entries</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={scrollToExpectedDispatch}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              scrollToExpectedDispatch();
            }
          }}
          title="Jump to expected dispatch vehicles"
          className="cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold">{expectedDispatchVehicles.length}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Expected Dispatch</p>
          </CardContent>
        </Card>
      </div>

      <section ref={expectedDispatchRef}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Truck className="h-4 w-4" />
            Expected Dispatch Vehicles
          </h3>
        </div>
        {isExpectedDispatchLoading ? (
          <EmptyState text="Loading expected dispatch vehicles..." />
        ) : expectedDispatchVehicles.length === 0 ? (
          <EmptyState text="No expected dispatch vehicles in this date range" />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="max-h-72 overflow-auto">
              <table className="w-full min-w-[940px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                    <th className="p-3 text-left text-sm font-medium">Dispatch Bills</th>
                    <th className="p-3 text-left text-sm font-medium">Customer</th>
                    <th className="p-3 text-left text-sm font-medium">Dispatch Date</th>
                    <th className="p-3 text-left text-sm font-medium">Load</th>
                    <th className="p-3 text-left text-sm font-medium">Bilty</th>
                    <th className="p-3 text-right text-sm font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expectedDispatchVehicles.map((vehicle) => {
                    const href = `/gate/empty-vehicle-in/new?expectedVehicleId=${vehicle.vehicleId}&dispatchDocEntry=${vehicle.docEntries[0]}`;
                    return (
                      <tr
                        key={vehicle.vehicleId}
                        className="cursor-pointer border-t hover:bg-muted/40"
                        onClick={() => {
                          if (vehicle.alreadyInside) {
                            toast.error(
                              `${vehicle.vehicleNo} is already inside under gate entry ` +
                                `${vehicle.insideEntryNo ?? ''}`.trim() +
                                ' and has not left yet. Finish its dispatch, or do an ' +
                                'empty-vehicle-out, before starting a new entry.',
                            );
                            return;
                          }
                          navigate(href);
                        }}
                      >
                        <td className="whitespace-nowrap p-3 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {vehicle.vehicleNo}
                            {vehicle.alreadyInside ? (
                              <Badge variant="outline" className="border-amber-300 text-amber-700">
                                Already inside
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="max-w-[260px] truncate">
                            {vehicle.docNums.join(', ')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {vehicle.docNums.length} bill{vehicle.docNums.length === 1 ? '' : 's'}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="max-w-[240px] truncate">
                            {vehicle.customers.join(', ') || '-'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {vehicle.dispatchDate || '-'}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          <div>{formatDispatchNumber(vehicle.totalWeight, 3)} kg</div>
                          <div className="text-xs text-muted-foreground">
                            {vehicle.totalBoxes > 0
                              ? `${formatDispatchNumber(vehicle.totalBoxes)} boxes`
                              : 'Boxes not available'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {vehicle.biltyNo || '-'}
                        </td>
                        <td className="p-3 text-right text-sm">
                          {vehicle.alreadyInside ? (
                            <span className="text-xs font-medium text-amber-700">
                              Inside — can't start
                            </span>
                          ) : (
                            <Button type="button" size="sm" variant="outline">
                              Start Entry
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Empty Vehicle Entries
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, vehicle, driver, reason"
              className="pl-9"
            />
          </div>
        </div>
        {isEntriesLoading ? (
          <EmptyState text="Loading empty vehicle entries..." />
        ) : entries.length === 0 ? (
          <EmptyState text="No empty vehicle entries in this date range" />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No empty vehicle entries match this search" />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[1180px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Entry No.</th>
                    <th className="p-3 text-left text-sm font-medium">Company</th>
                    <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                    <th className="p-3 text-left text-sm font-medium">Driver</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                    <th className="p-3 text-left text-sm font-medium">Reason</th>
                    <th className="p-3 text-left text-sm font-medium">Document</th>
                    <th className="p-3 text-left text-sm font-medium">In Date</th>
                    <th className="p-3 text-left text-sm font-medium">In Time</th>
                    <th className="p-3 text-left text-sm font-medium">Security</th>
                    <th className="p-3 text-left text-sm font-medium">Empty Out</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleGroups.map((group) =>
                    group.subEntries.length === 1
                      ? renderEntryRow(group.subEntries[0], false)
                      : renderMergedTruckRow(group),
                  )}
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

function DocumentCell({ entry }: { entry: EmptyVehicleGateInEntry }) {
  if (entry.reason === 'BST') {
    const label = entry.sap_doc_num || entry.sap_doc_entry;
    if (!label) return <span className="text-muted-foreground">BST not linked</span>;

    return (
      <span className="inline-flex items-center gap-1">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span>BST {label}</span>
        {entry.is_bst_document_locked && (
          <GateStatusBadge status="LOCKED" label="Locked" className="ml-1" />
        )}
      </span>
    );
  }

  if (entry.document_reference) {
    return (
      <span className="inline-flex items-center gap-1">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        {entry.document_reference}
      </span>
    );
  }

  return <span className="text-muted-foreground">-</span>;
}
