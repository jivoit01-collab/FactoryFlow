import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  List,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Truck,
  Unlock,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { DASHBOARDS_PERMISSIONS, GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useGlobalDateRange } from '@/core/store/hooks';
import { PipelineStatusBadge } from '@/modules/dashboards/dispatch-pipeline/components';
import { PIPELINE_STAGE_ORDER } from '@/modules/dashboards/dispatch-pipeline/constants';
import type { PipelineStage } from '@/modules/dashboards/dispatch-pipeline/types';
import {
  buildPipelineStatusFromStage,
  getPipelineStageRowClass,
} from '@/modules/dashboards/dispatch-pipeline/utils/pipelineStatus';
import {
  salesDispatchApi,
  type SalesDispatchDashboardEntry,
  type SalesDispatchDocument,
  type SalesDispatchGateOut,
  type SalesDispatchGateOutDocument,
  type SalesDispatchLock,
  type SalesDispatchPendingBooking,
  useAddDocumentToDocking,
  useSalesDispatchEntries,
  useSalesDispatchLock,
  useSalesDispatchPendingBookings,
  useUpdateSalesDispatchLock,
} from '@/modules/gate/api';
import { DateRangePicker, GateStatusBadge } from '@/modules/gate/components';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { ExpectedVehiclesSection } from './ExpectedVehiclesSection';
import { getSalesDispatchRoutes, isSalesDispatchOutPath } from './salesDispatchRoutes';
import {
  buildDockingVehicleGroups,
  type DockingVehicleGroup,
} from './salesDispatchVehicleGrouping';

const GATE_OUT_PENDING_STATUS = 'PRINT_COMMITTED';
const GATE_OUT_COMPLETED_STATUS = 'DISPATCHED';
const ACTIVE_SALES_DISPATCH_STATUSES = [
  'DOCKED',
  'PHOTO_ATTACHED',
  'READY_FOR_GATEPASS',
  'GATEPASS_PRINTED',
  'PRINT_COMMITTED',
];
const GATEPASS_PENDING_STATUSES = ['DOCKED', 'PHOTO_ATTACHED', 'READY_FOR_GATEPASS'];

type ExportCellValue = string | number;
type ExportRow = Record<string, ExportCellValue>;
type DashboardExportDocument = SalesDispatchDocument | SalesDispatchGateOutDocument;

type DashboardFilter =
  | 'ALL'
  | 'PENDING_OUT'
  | 'AWAITING_GATEPASS'
  | 'PRINT_NOT_COMMITTED'
  | 'MARKED_OUT'
  | 'PENDING_DOCKING'
  | 'WAITING_INSIDE'
  | 'MISSING_PHOTO_GPS'
  | 'GATEPASS_PENDING'
  | 'DISPATCHED';

type DockingDateBucket = 'today' | 'overdue' | 'upcoming' | 'all';
type DockingBucketCounts = Record<DockingDateBucket, number>;

const DOCKING_BUCKET_OPTIONS: Array<{ value: DockingDateBucket; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'all', label: 'All' },
];

export default function SalesDispatchDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routes = getSalesDispatchRoutes(location.pathname);
  const isGateOutMode = isSalesDispatchOutPath(location.pathname);
  const { hasPermission } = usePermission();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterState, setSelectedFilterState] = useState<{
    isGateOutMode: boolean;
    filter: DashboardFilter;
  }>({ isGateOutMode, filter: 'ALL' });
  const [selectedDockingBucket, setSelectedDockingBucket] = useState<DockingDateBucket>('today');
  const selectedFilter =
    selectedFilterState.isGateOutMode === isGateOutMode ? selectedFilterState.filter : 'ALL';
  const listParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
      search: searchTerm.trim() || undefined,
      document_type: isGateOutMode ? ('INVOICE' as const) : undefined,
      // The factory handles all three companies as one physical flow, so the
      // docking / dispatch-out board always aggregates across the user's companies
      // regardless of the active Company-Code. Each row is tagged with its company.
      all_companies: 1,
    }),
    [dateRange.from, dateRange.to, searchTerm, isGateOutMode],
  );

  const { data: entries = [], isFetching, refetch } = useSalesDispatchEntries(listParams);
  const {
    data: pendingBookings = [],
    isFetching: isPendingBookingsFetching,
    refetch: refetchPendingBookings,
  } = useSalesDispatchPendingBookings(listParams, { enabled: !isGateOutMode });
  const { data: dispatchLock } = useSalesDispatchLock();
  const updateLock = useUpdateSalesDispatchLock();
  const addToDocking = useAddDocumentToDocking();
  const isDashboardFetching = isFetching || isPendingBookingsFetching;
  const canCreateDocking = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.CREATE);
  const canManageDockingLock = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.MANAGE_LOCK);
  const canReprintGatepass = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS);
  const canViewDockingReports = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.VIEW_REPORTS);
  const canViewExpectedVehicles = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE);

  const handleAddToDocking = async (
    booking: SalesDispatchPendingBooking,
    docking: SalesDispatchGateOut,
  ) => {
    const dispatchPlanId = booking.dispatch_plan_ids?.[0];
    if (!dispatchPlanId) return;
    try {
      await addToDocking.mutateAsync({ id: docking.id, dispatchPlanId });
      toast.success(`Bill added to ${docking.entry_no}`);
      void refetch();
      void refetchPendingBookings();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add the bill to the docking'));
    }
  };

  const displayEntries = useMemo(() => {
    if (isGateOutMode) return entries.slice().sort(sortSalesDispatchOutEntries);

    return [...pendingBookings, ...entries].sort(sortDockingDashboardEntries);
  }, [entries, isGateOutMode, pendingBookings]);

  const dockingBucketCounts = useMemo(
    () => buildDockingDateBucketCounts(displayEntries),
    [displayEntries],
  );

  const cardFilteredEntries = useMemo(
    () =>
      isGateOutMode
        ? displayEntries.filter((entry) =>
            matchesSalesDispatchDashboardFilter(entry, selectedFilter),
          )
        : displayEntries.filter((entry) => matchesDockingDateBucket(entry, selectedDockingBucket)),
    [displayEntries, isGateOutMode, selectedDockingBucket, selectedFilter],
  );

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return cardFilteredEntries;
    return cardFilteredEntries.filter((entry) =>
      buildSalesDispatchSearchText(entry).includes(query),
    );
  }, [cardFilteredEntries, searchTerm]);

  const allCount = countSalesDispatchDashboardEntries(displayEntries, 'ALL');
  const pendingOutCount = countSalesDispatchDashboardEntries(displayEntries, 'PENDING_OUT');
  const awaitingGatepassCount = countSalesDispatchDashboardEntries(
    displayEntries,
    'AWAITING_GATEPASS',
  );
  const printedNotCommittedCount = countSalesDispatchDashboardEntries(
    displayEntries,
    'PRINT_NOT_COMMITTED',
  );
  const markedOutCount = countSalesDispatchDashboardEntries(displayEntries, 'MARKED_OUT');

  const statCards = [
    {
      filter: 'ALL' as const,
      icon: <List className="h-5 w-5 text-slate-600" />,
      label: 'All',
      value: allCount,
    },
    {
      filter: 'PENDING_OUT' as const,
      icon: <Truck className="h-5 w-5 text-blue-600" />,
      label: 'Pending Out',
      value: pendingOutCount,
    },
    {
      filter: 'AWAITING_GATEPASS' as const,
      icon: <FileText className="h-5 w-5 text-violet-600" />,
      label: 'Awaiting Gatepass',
      value: awaitingGatepassCount,
    },
    {
      filter: 'PRINT_NOT_COMMITTED' as const,
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      label: 'Print Not Committed',
      value: printedNotCommittedCount,
    },
    {
      filter: 'MARKED_OUT' as const,
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      label: 'Marked Out',
      value: markedOutCount,
    },
  ];

  const handleToggleLock = async () => {
    if (!canManageDockingLock) {
      toast.error('You do not have permission to manage Gate pass printing lock');
      return;
    }

    const isLocked = Boolean(dispatchLock?.is_locked);
    try {
      if (isLocked) {
        await updateLock.mutateAsync({ is_locked: false });
        toast.success('Gate pass printing unlocked');
        return;
      }

      const reason = window.prompt('Reason for locking Gate pass printing');
      if (reason === null) return;
      const trimmedReason = reason.trim();
      if (!trimmedReason) {
        toast.error('A reason is required to lock Gate pass printing');
        return;
      }
      await updateLock.mutateAsync({ is_locked: true, reason: trimmedReason });
      toast.success('Gate pass printing locked');
    } catch (lockError) {
      toast.error(getErrorMessage(lockError, 'Failed to update Docking lock'));
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // The board list is fetched slim (no per-line items/documents) for speed, but
      // the export's Documents/Items sheets need them -- pull the detail payload on
      // demand and merge those two arrays into the current filtered rows by id, so
      // the exported set/order matches exactly what's on screen.
      const detailed = await salesDispatchApi.list({ ...listParams, detail: 1 });
      const heavyById = new Map(detailed.map((row) => [row.id, row]));
      const enrichedEntries: SalesDispatchDashboardEntry[] = filteredEntries.map((entry) => {
        const heavy = heavyById.get(entry.id as number);
        return heavy
          ? ({ ...entry, items: heavy.items, documents: heavy.documents } as SalesDispatchDashboardEntry)
          : entry;
      });
      const exportedRows = exportSalesDispatchDashboard(enrichedEntries, {
        dateRange,
        isGateOutMode,
        searchTerm,
        selectedFilter: isGateOutMode ? selectedFilter : selectedDockingBucket.toUpperCase(),
      });
      toast.success(`${exportedRows} ${exportedRows === 1 ? 'row' : 'rows'} exported`);
    } catch (exportError) {
      toast.error(getErrorMessage(exportError, 'Failed to export dashboard'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isGateOutMode ? 'Sales Dispatch Out' : 'Docking'}
          </h2>
          <p className="text-muted-foreground">
            {isGateOutMode
              ? 'View Docking-created invoice dispatches and mark vehicles out'
              : 'Dock SAP invoices, verify truck documents, and print gatepasses'}
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
              void refetch();
              if (!isGateOutMode) void refetchPendingBookings();
            }}
            disabled={isDashboardFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isDashboardFetching ? 'Refreshing' : 'Refresh'}
          </Button>
          {!isGateOutMode && canReprintGatepass ? (
            <Button type="button" variant="outline" onClick={() => navigate(routes.reports)}>
              <Printer className="mr-2 h-4 w-4" />
              Reprint Gatepass
            </Button>
          ) : null}
          {canViewDockingReports ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExport()}
              disabled={isDashboardFetching || isExporting || filteredEntries.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting…' : 'Export'}
            </Button>
          ) : null}
          {!isGateOutMode && canCreateDocking && (
            <Button onClick={() => navigate(routes.newEntry)}>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          )}
        </div>
      </div>

      {!isGateOutMode && (
        <DockingLockPanel
          lock={dispatchLock}
          isSaving={updateLock.isPending}
          canManage={canManageDockingLock}
          onToggle={() => void handleToggleLock()}
        />
      )}

      {isGateOutMode ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <StatCard
              key={card.filter}
              icon={card.icon}
              label={card.label}
              value={card.value}
              isActive={selectedFilter === card.filter}
              onClick={() => setSelectedFilterState({ isGateOutMode, filter: card.filter })}
            />
          ))}
        </div>
      ) : (
        <DockingDateBucketFilters
          selectedBucket={selectedDockingBucket}
          counts={dockingBucketCounts}
          onChange={setSelectedDockingBucket}
        />
      )}

      {canViewExpectedVehicles && (
        <ExpectedVehiclesSection
          isGateOutMode={isGateOutMode}
          dateFrom={dateRange.from}
          dateTo={dateRange.to}
        />
      )}

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Truck className="h-4 w-4" />
            {isGateOutMode ? 'Sales Dispatch Out Entries' : 'Docking Entries'}
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, document, customer, vehicle"
              className="pl-9"
            />
          </div>
        </div>

        {isDashboardFetching && displayEntries.length === 0 ? (
          <EmptyState
            text={isGateOutMode ? 'Loading sales dispatch out entries' : 'Loading docking entries'}
          />
        ) : displayEntries.length === 0 ? (
          <EmptyState
            text={isGateOutMode ? 'No sales dispatch out entries yet' : 'No docking entries yet'}
          />
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            text={
              searchTerm.trim()
                ? isGateOutMode
                  ? 'No sales dispatch out entries match this search'
                  : 'No docking entries match this search'
                : isGateOutMode
                  ? 'No sales dispatch out entries match this filter'
                  : 'No docking entries match this filter'
            }
          />
        ) : (
          <DispatchTable
            entries={filteredEntries}
            newEntryPath={routes.newEntry}
            detailPath={routes.detail}
            weighmentPath={routes.weighment}
            gatepassPath={routes.gatepass}
            isGateOutMode={isGateOutMode}
            onAddToDocking={handleAddToDocking}
            isAddingToDocking={addToDocking.isPending}
          />
        )}
      </section>
    </div>
  );
}

function DispatchTable({
  entries,
  newEntryPath,
  detailPath,
  weighmentPath,
  gatepassPath,
  isGateOutMode,
  onAddToDocking,
  isAddingToDocking,
}: {
  entries: SalesDispatchDashboardEntry[];
  newEntryPath: string;
  detailPath: (entryId: string | number) => string;
  weighmentPath: (entryId: string | number) => string;
  gatepassPath: (entryId: string | number) => string;
  isGateOutMode: boolean;
  onAddToDocking?: (booking: SalesDispatchPendingBooking, docking: SalesDispatchGateOut) => void;
  isAddingToDocking?: boolean;
}) {
  const navigate = useNavigate();

  // A pending bill whose truck already has an open (pre-photo-lock) docking can be
  // folded into it instead of standing as its own row. Index those dockings by
  // vehicle so each pending row can offer an "Add to docking" shortcut; the
  // backend still enforces the same-truck / not-locked rules.
  const openDockingByVehicle = useMemo(() => {
    const map = new Map<string, SalesDispatchGateOut>();
    for (const entry of entries) {
      if (isPendingBookingEntry(entry) || entry.status !== 'DOCKED') continue;
      const key = entry.vehicle != null ? `id:${entry.vehicle}` : `no:${entry.vehicle_no}`;
      if (!map.has(key)) map.set(key, entry);
    }
    return map;
  }, [entries]);

  const findOpenDocking = (booking: SalesDispatchPendingBooking) => {
    const byId = booking.vehicle != null ? openDockingByVehicle.get(`id:${booking.vehicle}`) : undefined;
    return byId ?? openDockingByVehicle.get(`no:${booking.vehicle_no}`);
  };

  // One expandable row per physical truck (arrival, else vehicle). A single-entry
  // group renders exactly as before; a multi-entry group collapses its
  // per-company docking rows under one vehicle summary.
  const vehicleGroups = useMemo(() => buildDockingVehicleGroups(entries), [entries]);

  const renderSubRow = (entry: SalesDispatchDashboardEntry, indent: boolean) => {
    const itemSummary = entry.item_summary || summarizeItems(getEntryItems(entry));
    const plannedDispatchDate = getPlannedDispatchDate(entry);
    const actualGateOut = getActualGateOut(entry);
    const openDocking =
      onAddToDocking && isPendingBookingEntry(entry) ? findOpenDocking(entry) : undefined;

    return (
      <tr
        key={entry.id}
        className={cn(
          'cursor-pointer border-t align-top transition-colors',
          getSalesDispatchDashboardRowClassName(entry),
        )}
        onClick={() => {
          navigate(
            getSalesDispatchDashboardEntryPath(
              entry,
              newEntryPath,
              detailPath,
              weighmentPath,
              gatepassPath,
              isGateOutMode,
            ),
          );
        }}
      >
        <td className={cn('whitespace-nowrap p-3 text-sm font-medium', indent && 'pl-9')}>
          <div className="space-y-1">
            <span>{isPendingBookingEntry(entry) ? 'Pending' : entry.entry_no}</span>
            {openDocking ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-full whitespace-nowrap px-2 text-xs font-normal"
                disabled={isAddingToDocking}
                title={`This bill's truck is already docked as ${openDocking.entry_no}. Add it to that load.`}
                onClick={(event) => {
                  event.stopPropagation();
                  onAddToDocking?.(entry as SalesDispatchPendingBooking, openDocking);
                }}
              >
                + Add to {openDocking.entry_no}
              </Button>
            ) : null}
          </div>
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
        <td className="whitespace-nowrap p-3 text-sm">{entry.vehicle_no}</td>
        <td className="whitespace-nowrap p-3 text-sm">
          <PipelineStatusBadge
            status={buildPipelineStatusFromStage(getSalesDispatchDashboardEntryStage(entry))}
          />
        </td>
        <td className="p-3 text-sm" title={formatDocumentNumbers(entry)}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium leading-5">{formatDocumentNumbers(entry)}</span>
            {getDocumentCount(entry) > 1 ? (
              <span className="inline-flex whitespace-nowrap rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {getDocumentCount(entry)} docs
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">{formatDocumentType(entry.document_type)}</div>
        </td>
        <td className="p-3 text-sm">
          <div className="truncate whitespace-nowrap font-medium">{entry.customer_name || '-'}</div>
          <div className="truncate whitespace-nowrap text-xs text-muted-foreground">
            {entry.customer_code || entry.place_of_supply || '-'}
          </div>
        </td>
        <td className="p-3 text-sm" title={itemSummary}>
          <div className="truncate whitespace-nowrap">{itemSummary}</div>
        </td>
        <td className="whitespace-nowrap p-3 text-sm">{formatDate(plannedDispatchDate)}</td>
        <td className="whitespace-nowrap p-3 text-sm">{actualGateOut}</td>
        <td className="whitespace-nowrap p-3 text-sm">
          <GateStatusBadge
            status={entry.gatepass_no ? 'PRINTED' : 'PENDING'}
            label={entry.gatepass_no || 'Pending'}
          />
        </td>
      </tr>
    );
  };

  // One physical truck = ONE row, shown exactly like a single-company docking:
  // the company lives on the bills, everything else on the truck. The Status is
  // the TRUCK's -- its slowest bill's stage (the truck isn't gatepass-ready until
  // every company's docking is) -- and clicking the row opens the truck's flow
  // (one detail/scan page carrying every company's bills). The per-company
  // SalesDispatchGateOut records stay only where SAP needs them, invisible here.
  const renderMergedTruckRow = (group: DockingVehicleGroup) => {
    const primary = group.subEntries[0];
    // The truck sits at its least-advanced docking; that docking drives the row's
    // status + where clicking the truck goes next in the flow.
    const slowest = group.subEntries.reduce((slowestEntry, entry) =>
      stageRank(getSalesDispatchDashboardEntryStage(entry)) <
      stageRank(getSalesDispatchDashboardEntryStage(slowestEntry))
        ? entry
        : slowestEntry,
    );
    const truckStage = getSalesDispatchDashboardEntryStage(slowest);
    const allGatepassPrinted = group.subEntries.every((entry) => Boolean(entry.gatepass_no));
    const itemSummary = group.subEntries
      .map((entry) => entry.item_summary || summarizeItems(getEntryItems(entry)))
      .filter(Boolean)
      .join('; ');
    const docCount = group.subEntries.reduce((sum, entry) => sum + getDocumentCount(entry), 0);
    const docNumbers = group.subEntries.flatMap((entry) => getDashboardDocumentNumbers(entry));
    const customers = Array.from(
      new Set(
        group.subEntries
          .map((entry) => entry.customer_name)
          .filter((name): name is string => Boolean(name)),
      ),
    );
    return (
      <tr
        key={group.key}
        className={cn(
          'cursor-pointer border-t align-top transition-colors',
          getPipelineStageRowClass(truckStage) || 'hover:bg-muted/50',
        )}
        onClick={() =>
          navigate(
            getSalesDispatchDashboardEntryPath(
              slowest,
              newEntryPath,
              detailPath,
              weighmentPath,
              gatepassPath,
              isGateOutMode,
            ),
          )
        }
      >
        <td className="whitespace-nowrap p-3 text-sm font-medium">
          {group.arrivalNo || primary.entry_no}
        </td>
        <td className="p-3 text-sm">
          {/* Company lives on the bills: show every company the truck carries. */}
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
        <td className="whitespace-nowrap p-3 text-sm">
          <div className="font-semibold">{group.vehicleNo || '-'}</div>
          {group.arrivalNo ? (
            <div className="text-xs text-muted-foreground">{group.arrivalNo}</div>
          ) : null}
        </td>
        <td className="p-3 text-sm">
          {/* One status -- the truck's, not per bill. */}
          <PipelineStatusBadge status={buildPipelineStatusFromStage(truckStage)} />
        </td>
        <td className="p-3 text-sm" title={docNumbers.join(', ')}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium leading-5">{docNumbers.join(', ') || '-'}</span>
            {docCount > 1 ? (
              <span className="inline-flex whitespace-nowrap rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {docCount} docs
              </span>
            ) : null}
          </div>
        </td>
        <td className="p-3 text-sm">
          <div className="truncate whitespace-nowrap font-medium">
            {customers.length ? customers.join(', ') : '-'}
          </div>
        </td>
        <td className="p-3 text-sm text-muted-foreground" title={itemSummary}>
          <div className="truncate whitespace-nowrap">{itemSummary || '—'}</div>
        </td>
        <td className="whitespace-nowrap p-3 text-sm">
          {formatDate(getPlannedDispatchDate(primary))}
        </td>
        <td className="whitespace-nowrap p-3 text-sm">{getActualGateOut(primary)}</td>
        <td className="whitespace-nowrap p-3 text-sm">
          <GateStatusBadge
            status={allGatepassPrinted ? 'PRINTED' : 'PENDING'}
            label={allGatepassPrinted ? 'Printed' : 'Pending'}
          />
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[2180px] table-fixed">
          <colgroup>
            <col className="w-[180px]" />
            <col className="w-[150px]" />
            <col className="w-[130px]" />
            <col className="w-[260px]" />
            <col className="w-[280px]" />
            <col className="w-[240px]" />
            <col className="w-[320px]" />
            <col className="w-[165px]" />
            <col className="w-[165px]" />
            <col className="w-[280px]" />
          </colgroup>
          <thead className="bg-muted/50">
            <tr>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Entry No.</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Company</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Vehicle</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Status</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">SAP Document</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Customer</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Items</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Dispatch Date</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">
                Actual Gate Out
              </th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Gatepass</th>
            </tr>
          </thead>
          <tbody>
            {vehicleGroups.map((group) =>
              group.subEntries.length === 1
                ? renderSubRow(group.subEntries[0], false)
                : renderMergedTruckRow(group),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Position of a stage in the pipeline; unknown stages sort last. Lets a truck's
// row take its slowest (least-advanced) docking's stage as the truck status.
function stageRank(stage: PipelineStage): number {
  const index = PIPELINE_STAGE_ORDER.indexOf(stage);
  return index === -1 ? PIPELINE_STAGE_ORDER.length : index;
}

function getSalesDispatchDashboardEntryStage(entry: SalesDispatchDashboardEntry): PipelineStage {
  if (isPendingBookingEntry(entry)) return 'READY_TO_DOCK';
  if (entry.status === 'CANCELLED') return 'REJECTED';
  if (entry.status === 'PENDING_DOCKING') return 'READY_TO_DOCK';
  return entry.status as PipelineStage;
}

function getSalesDispatchDashboardRowClassName(entry: SalesDispatchDashboardEntry) {
  return (
    getPipelineStageRowClass(getSalesDispatchDashboardEntryStage(entry)) || 'hover:bg-muted/50'
  );
}

function DockingLockPanel({
  lock,
  isSaving,
  canManage,
  onToggle,
}: {
  lock?: SalesDispatchLock;
  isSaving: boolean;
  canManage: boolean;
  onToggle: () => void;
}) {
  const isLocked = Boolean(lock?.is_locked);

  return (
    <Card className={isLocked ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}>
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          {isLocked ? (
            <Lock className="mt-0.5 h-5 w-5 text-red-600" />
          ) : (
            <Unlock className="mt-0.5 h-5 w-5 text-emerald-600" />
          )}
          <div>
            <p className="font-medium">
              {isLocked ? 'Gate pass printing is locked' : 'Gate pass printing is open'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLocked
                ? lock?.reason || 'No reason recorded'
                : 'Gatepass print and commit are available'}
            </p>
            {lock?.changed_at ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Last changed {formatDashboardTimestamp(lock.changed_at)}
                {lock.changed_by_name ? ` by ${lock.changed_by_name}` : ''}
              </p>
            ) : null}
          </div>
        </div>
        {canManage ? (
          <Button
            type="button"
            variant={isLocked ? 'default' : 'destructive'}
            onClick={onToggle}
            disabled={isSaving}
          >
            {isLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
            {isSaving ? 'Saving' : isLocked ? 'Unlock' : 'Lock Printing'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildSalesDispatchSearchText(entry: SalesDispatchDashboardEntry) {
  return [
    isPendingBookingEntry(entry) ? 'pending docking booked' : entry.entry_no,
    entry.sap_doc_num,
    getDashboardDocumentNumbers(entry).join(' '),
    entry.document_count,
    entry.sap_doc_entry,
    entry.customer_name,
    entry.customer_code,
    entry.vehicle_no,
    entry.driver_name,
    entry.transporter_name,
    entry.gatepass_no,
    entry.item_summary,
    entry.status,
  ]
    .join(' ')
    .toLowerCase();
}

function countSalesDispatchDashboardEntries(
  entries: SalesDispatchDashboardEntry[],
  filter: DashboardFilter,
) {
  return entries.filter((entry) => matchesSalesDispatchDashboardFilter(entry, filter)).length;
}

function matchesSalesDispatchDashboardFilter(
  entry: SalesDispatchDashboardEntry,
  filter: DashboardFilter,
) {
  switch (filter) {
    case 'ALL':
      return true;
    case 'PENDING_DOCKING':
      return isPendingBookingEntry(entry);
    case 'PENDING_OUT':
      return entry.status === GATE_OUT_PENDING_STATUS;
    case 'AWAITING_GATEPASS':
    case 'GATEPASS_PENDING':
      return GATEPASS_PENDING_STATUSES.includes(entry.status);
    case 'PRINT_NOT_COMMITTED':
      return entry.status === 'GATEPASS_PRINTED';
    case 'MARKED_OUT':
    case 'DISPATCHED':
      return entry.status === GATE_OUT_COMPLETED_STATUS;
    case 'WAITING_INSIDE':
      return ACTIVE_SALES_DISPATCH_STATUSES.includes(entry.status);
    case 'MISSING_PHOTO_GPS':
      if (isPendingBookingEntry(entry)) return false;
      return (
        ACTIVE_SALES_DISPATCH_STATUSES.includes(entry.status) &&
        (!entry.truck_photo || !entry.photo_latitude || !entry.photo_longitude)
      );
    default:
      return true;
  }
}

function buildDockingDateBucketCounts(entries: SalesDispatchDashboardEntry[]): DockingBucketCounts {
  const todayKey = getLocalDateKey(new Date());
  return {
    today: entries.filter((entry) => matchesDockingDateBucket(entry, 'today', todayKey)).length,
    overdue: entries.filter((entry) => matchesDockingDateBucket(entry, 'overdue', todayKey)).length,
    upcoming: entries.filter((entry) => matchesDockingDateBucket(entry, 'upcoming', todayKey))
      .length,
    all: entries.length,
  };
}

function matchesDockingDateBucket(
  entry: SalesDispatchDashboardEntry,
  bucket: DockingDateBucket,
  todayKey = getLocalDateKey(new Date()),
) {
  if (bucket === 'all') return true;

  const comparison = compareDateToKey(getPlannedDispatchDate(entry), todayKey);
  if (comparison === null) return false;

  if (bucket === 'today') return comparison === 0;
  if (bucket === 'overdue') return comparison < 0 && !isClosedDockingDashboardEntry(entry);
  return comparison > 0;
}

function compareDateToKey(value: string | null | undefined, todayKey: string) {
  const dateKey = normalizeDateKey(value);
  if (!dateKey) return null;
  if (dateKey === todayKey) return 0;
  return dateKey < todayKey ? -1 : 1;
}

function normalizeDateKey(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  const yearFirst = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (yearFirst) return `${yearFirst[1]}-${yearFirst[2]}-${yearFirst[3]}`;

  const dayFirst = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dayFirst) return `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}`;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? '' : getLocalDateKey(parsed);
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isClosedDockingDashboardEntry(entry: SalesDispatchDashboardEntry) {
  return ['DISPATCHED', 'REJECTED', 'CANCELLED'].includes(entry.status);
}

function exportSalesDispatchDashboard(
  entries: SalesDispatchDashboardEntry[],
  context: {
    dateRange: { from?: string; to?: string };
    isGateOutMode: boolean;
    searchTerm: string;
    selectedFilter: string;
  },
) {
  const workbook = XLSX.utils.book_new();
  appendDashboardExportSheet(workbook, buildDashboardExportSummary(entries, context), 'Summary');
  // Primary, report-style sheet (one clean row per dispatch), modelled on the
  // dispatch tracking sheet. The detailed Entries/Documents/Items sheets follow.
  appendDashboardExportSheet(
    workbook,
    entries.map((entry) => buildDispatchReportRow(entry, context.isGateOutMode)),
    'Dispatch Report',
  );
  appendDashboardExportSheet(
    workbook,
    entries.map((entry) => buildDashboardEntryExportRow(entry, context.isGateOutMode)),
    'Entries',
  );

  const documentRows = buildDashboardDocumentExportRows(entries);
  if (documentRows.length) {
    appendDashboardExportSheet(workbook, documentRows, 'Documents');
  }

  const itemRows = buildDashboardItemExportRows(entries);
  if (itemRows.length) {
    appendDashboardExportSheet(workbook, itemRows, 'Items');
  }

  XLSX.writeFile(workbook, buildDashboardExportFileName(context));
  return entries.length;
}

function buildDashboardExportSummary(
  entries: SalesDispatchDashboardEntry[],
  context: {
    dateRange: { from?: string; to?: string };
    isGateOutMode: boolean;
    searchTerm: string;
    selectedFilter: string;
  },
): ExportRow[] {
  return [
    {
      Field: 'Dashboard',
      Value: context.isGateOutMode ? 'Sales Dispatch Out' : 'Docking',
    },
    {
      Field: 'Date From',
      Value: exportValue(context.dateRange.from),
    },
    {
      Field: 'Date To',
      Value: exportValue(context.dateRange.to),
    },
    {
      Field: 'Filter',
      Value: context.selectedFilter,
    },
    {
      Field: 'Search',
      Value: exportValue(context.searchTerm.trim()),
    },
    {
      Field: 'Visible Rows',
      Value: entries.length,
    },
    {
      Field: 'Exported At',
      Value: formatExportTimestamp(new Date().toISOString()),
    },
  ];
}

function buildDispatchReportRow(
  entry: SalesDispatchDashboardEntry,
  isGateOutMode: boolean,
): ExportRow {
  // Narrow to the gate-out entry for fields a pending booking doesn't carry
  // (weights, remarks, ship-to address, dispatched time).
  const gateOut = isPendingBookingEntry(entry) ? null : entry;
  return {
    'Dispatch Date': formatDate(getPlannedDispatchDate(entry)),
    'Invoice Date': exportValue(entry.sap_doc_date),
    Party: exportValue(entry.customer_name),
    Location: exportValue(gateOut?.ship_to_address || entry.place_of_supply).replace(
      /[\r\n]+/g,
      ', ',
    ),
    State: exportValue(entry.place_of_supply),
    'Invoice No.': formatDocumentNumbers(entry),
    'Bilty No.': exportValue(entry.bilty_no),
    'Factory Bilty Date': exportValue(entry.bilty_date),
    'Vehicle No.': exportValue(entry.vehicle_no),
    'Transport Name': exportValue(entry.transporter_name),
    'Mobile No': exportValue(entry.transporter_mobile_no || entry.driver_mobile_no),
    Driver: exportValue(entry.driver_name),
    'Oil LTR': exportValue(entry.total_litres),
    'Total Boxes': exportValue(gateOut?.total_boxes),
    'Kanta Weight': exportValue(
      gateOut?.net_weight || gateOut?.gross_weight || gateOut?.challan_weight,
    ),
    'Gross Weight': exportValue(gateOut?.gross_weight),
    'Net Weight': exportValue(gateOut?.net_weight),
    Freight: exportValue(entry.freight),
    'Total Freight': exportValue(entry.total_freight),
    'E-way Bill': exportValue(entry.eway_bill),
    Items: exportValue(entry.item_summary),
    'Gatepass No.': exportValue(entry.gatepass_no || 'Pending'),
    Status: getSalesDispatchDashboardStatusLabel(entry.status, isGateOutMode),
    'Actual Gate Out': getActualGateOut(entry),
    'Dispatched At': gateOut ? formatExportTimestamp(gateOut.dispatched_at) : '-',
    Remarks: exportValue(gateOut?.remarks),
  };
}

function buildDashboardEntryExportRow(
  entry: SalesDispatchDashboardEntry,
  isGateOutMode: boolean,
): ExportRow {
  const isPending = isPendingBookingEntry(entry);

  return {
    'Entry No.': isPending ? 'Pending' : exportValue(entry.entry_no),
    Company: exportValue(entry.company_name || entry.company_code),
    'Pending Booking': isPending ? 'Yes' : 'No',
    'Dispatch Plan IDs': isPending
      ? entry.dispatch_plan_ids.join(', ')
      : exportValue('dispatch_plan' in entry ? entry.dispatch_plan : undefined),
    'SAP Documents': formatDocumentNumbers(entry),
    'Document Count': getDocumentCount(entry),
    'Document Type': formatDocumentType(entry.document_type),
    Customer: exportValue(entry.customer_name),
    'Customer Code / Place': exportValue(entry.customer_code || entry.place_of_supply),
    Items: exportValue(entry.item_summary || summarizeItems(getEntryItems(entry))),
    Vehicle: exportValue(entry.vehicle_no),
    Driver: exportValue(entry.driver_name),
    'Driver Mobile': exportValue(entry.driver_mobile_no),
    Transporter: exportValue(entry.transporter_name),
    'Bilty No.': exportValue(entry.bilty_no),
    'Bilty Date': exportValue(entry.bilty_date),
    'Dispatch Date': formatDate(getPlannedDispatchDate(entry)),
    'Actual Gate Out': getActualGateOut(entry),
    Gatepass: exportValue(entry.gatepass_no || 'Pending'),
    Status: getSalesDispatchDashboardStatusLabel(entry.status, isGateOutMode),
    'Gross Weight': isPending ? '-' : exportValue(entry.gross_weight),
    'Net Weight': isPending ? '-' : exportValue(entry.net_weight),
    'Printed At': isPending ? '-' : formatExportTimestamp(entry.printed_at),
    'Print Committed At': isPending ? '-' : formatExportTimestamp(entry.print_committed_at),
    'Dispatched At': isPending ? '-' : formatExportTimestamp(entry.dispatched_at),
    'Created At': formatExportTimestamp(entry.created_at),
    'Updated At': formatExportTimestamp(entry.updated_at),
  };
}

function buildDashboardDocumentExportRows(entries: SalesDispatchDashboardEntry[]): ExportRow[] {
  return entries.flatMap((entry) => {
    const documents = getDashboardDocuments(entry);
    if (!documents.length) {
      return [
        {
          'Entry No.': isPendingBookingEntry(entry) ? 'Pending' : exportValue(entry.entry_no),
          'SAP Document': formatDocumentNumbers(entry),
          'Document Type': formatDocumentType(entry.document_type),
          Customer: exportValue(entry.customer_name),
          'Customer Code': exportValue(entry.customer_code),
          'Document Date': exportValue(entry.sap_doc_date),
          'Document Total': exportValue(entry.sap_doc_total),
          'E-way Bill': exportValue(entry.eway_bill),
          Warehouses: exportValue(entry.warehouses),
          'Item Summary': exportValue(entry.item_summary),
        },
      ];
    }

    return documents.map((document) => ({
      'Entry No.': isPendingBookingEntry(entry) ? 'Pending' : exportValue(entry.entry_no),
      'SAP Document': exportValue(getExportDocumentNumber(document)),
      'Document Type': formatDocumentType(getExportDocumentType(document)),
      Customer: exportValue(getExportDocumentCustomerName(document)),
      'Customer Code': exportValue(getExportDocumentCustomerCode(document)),
      'Document Date': exportValue(getExportDocumentDate(document)),
      'Document Total': exportValue(getExportDocumentTotal(document)),
      'E-way Bill': exportValue(document.eway_bill),
      Warehouses: exportValue(document.warehouses),
      'From Warehouse': exportValue(document.from_warehouse),
      'To Warehouse': exportValue(document.to_warehouse),
      'Total Quantity': exportValue(document.total_quantity),
      'Total Boxes': exportValue(document.total_boxes),
      'Total Litres': exportValue(document.total_litres),
      'Total Weight': exportValue(document.total_weight),
      'Item Summary': exportValue(document.item_summary),
    }));
  });
}

function buildDashboardItemExportRows(entries: SalesDispatchDashboardEntry[]): ExportRow[] {
  return entries.flatMap((entry) =>
    getEntryItems(entry).map((item) => ({
      'Entry No.': exportValue(entry.entry_no),
      'SAP Document': exportValue(item.document_sap_doc_num || entry.sap_doc_num),
      'Line No.': item.line_num,
      'Item Code': exportValue(item.item_code),
      'Item Name': exportValue(item.item_name),
      Quantity: exportValue(item.quantity),
      UOM: exportValue(item.uom),
      Warehouse: exportValue(item.warehouse_code),
      'From Warehouse': exportValue(item.from_warehouse),
      'To Warehouse': exportValue(item.to_warehouse),
      'Base Ref': exportValue(item.base_ref),
      'Total Boxes': exportValue(item.total_boxes),
      'Total Litres': exportValue(item.total_litres),
      'Total Weight': exportValue(item.total_weight),
    })),
  );
}

function appendDashboardExportSheet(workbook: XLSX.WorkBook, rows: ExportRow[], sheetName: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const columns = Object.keys(rows[0] || {});
  worksheet['!cols'] = columns.map((column) => {
    const contentWidth = Math.max(
      column.length,
      ...rows.map((row) => String(row[column] ?? '').length),
    );
    return { wch: Math.min(Math.max(contentWidth + 2, 12), 60) };
  });
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

function buildDashboardExportFileName(context: {
  dateRange: { from?: string; to?: string };
  isGateOutMode: boolean;
  selectedFilter: string;
}) {
  const dashboardName = context.isGateOutMode ? 'Sales_Dispatch_Out' : 'Docking';
  const fromDate = context.dateRange.from || 'all';
  const toDate = context.dateRange.to || 'all';
  return `${dashboardName}_${fromDate}_to_${toDate}_${slugExportPart(context.selectedFilter)}.xlsx`;
}

function getDashboardDocuments(entry: SalesDispatchDashboardEntry): DashboardExportDocument[] {
  return (entry.documents || []) as DashboardExportDocument[];
}

function getExportDocumentNumber(document: DashboardExportDocument) {
  return 'sap_doc_num' in document ? document.sap_doc_num : document.doc_num;
}

function getExportDocumentType(document: DashboardExportDocument) {
  return document.document_type;
}

function getExportDocumentCustomerName(document: DashboardExportDocument) {
  return 'customer_name' in document ? document.customer_name : document.card_name;
}

function getExportDocumentCustomerCode(document: DashboardExportDocument) {
  return 'customer_code' in document ? document.customer_code : document.card_code;
}

function getExportDocumentDate(document: DashboardExportDocument) {
  return 'sap_doc_date' in document ? document.sap_doc_date : document.doc_date;
}

function getExportDocumentTotal(document: DashboardExportDocument) {
  return 'sap_doc_total' in document ? document.sap_doc_total : document.doc_total;
}

function exportValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  return value;
}

function formatExportTimestamp(value?: string | null) {
  if (!value) return '-';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return timestamp.toLocaleString();
}

function slugExportPart(value: string) {
  return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'all';
}

function sortDockingDashboardEntries(
  first: SalesDispatchDashboardEntry,
  second: SalesDispatchDashboardEntry,
) {
  const firstDispatchDate = dateValue(getPlannedDispatchDate(first));
  const secondDispatchDate = dateValue(getPlannedDispatchDate(second));

  if (firstDispatchDate !== secondDispatchDate) {
    return secondDispatchDate - firstDispatchDate;
  }

  return (
    timestampValue(second.updated_at || second.created_at) -
    timestampValue(first.updated_at || first.created_at)
  );
}

function dateValue(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortSalesDispatchOutEntries(first: SalesDispatchGateOut, second: SalesDispatchGateOut) {
  const firstPriority = first.status === GATE_OUT_PENDING_STATUS ? 0 : 1;
  const secondPriority = second.status === GATE_OUT_PENDING_STATUS ? 0 : 1;

  if (firstPriority !== secondPriority) {
    return firstPriority - secondPriority;
  }

  return (
    timestampValue(second.updated_at || second.created_at) -
    timestampValue(first.updated_at || first.created_at)
  );
}

function timestampValue(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getSalesDispatchDashboardEntryPath(
  entry: SalesDispatchDashboardEntry,
  newEntryPath: string,
  detailPath: (entryId: string | number) => string,
  weighmentPath: (entryId: string | number) => string,
  gatepassPath: (entryId: string | number) => string,
  isGateOutMode: boolean,
) {
  if (isPendingBookingEntry(entry)) {
    return `${newEntryPath}?dispatchPlanIds=${entry.dispatch_plan_ids.join(',')}`;
  }
  if (isGateOutMode && entry.status === GATE_OUT_PENDING_STATUS) {
    return hasCompleteGateOutWeighment(entry)
      ? gatepassPath(entry.vehicle_entry)
      : weighmentPath(entry.vehicle_entry);
  }
  return detailPath(entry.id);
}

function hasCompleteGateOutWeighment(entry: SalesDispatchDashboardEntry) {
  if (isPendingBookingEntry(entry)) return false;
  const gross = toFiniteNumber(entry.gross_weight);
  const tare = toFiniteNumber(entry.tare_weight);
  return gross !== null && gross > 0 && tare !== null && tare >= 0 && gross >= tare;
}

function toFiniteNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getSalesDispatchDashboardStatusLabel(status: string, isGateOutMode: boolean) {
  if (status === 'PENDING_DOCKING') return 'PENDING';
  if (!isGateOutMode) return status;
  if (status === GATE_OUT_PENDING_STATUS) return 'PENDING OUT';
  if (status === GATE_OUT_COMPLETED_STATUS) return 'MARKED OUT';
  return status;
}

function getDashboardDocumentNumbers(entry: SalesDispatchDashboardEntry) {
  if (entry.document_numbers?.length) return entry.document_numbers;
  if (entry.sap_doc_num) return [entry.sap_doc_num];
  if (entry.sap_doc_entry) return [String(entry.sap_doc_entry)];
  return [];
}

function formatDocumentNumbers(entry: SalesDispatchDashboardEntry) {
  return getDashboardDocumentNumbers(entry).join(', ') || '-';
}

function getDocumentCount(entry: SalesDispatchDashboardEntry) {
  return (
    entry.document_count ||
    getDashboardDocumentNumbers(entry).length ||
    entry.documents?.length ||
    0
  );
}

function formatDocumentType(value: string) {
  return value === 'STOCK_TRANSFER' ? 'Stock Transfer' : 'A/R Invoice';
}

function formatDate(date?: string | null) {
  return date || '-';
}

function formatDateTime(date?: string | null, time?: string | null) {
  if (!date && !time) return '-';
  return [date, time].filter(Boolean).join(' ');
}

function getPlannedDispatchDate(entry: SalesDispatchDashboardEntry) {
  return entry.dispatch_date || (isPendingBookingEntry(entry) ? entry.gate_out_date : null);
}

function getActualGateOut(entry: SalesDispatchDashboardEntry) {
  if (isPendingBookingEntry(entry)) return '-';
  if (entry.status !== GATE_OUT_COMPLETED_STATUS) return '-';
  if (!entry.gate_out_date && !entry.out_time) {
    return formatDashboardTimestamp(entry.dispatched_at);
  }
  return formatDateTime(entry.gate_out_date, entry.out_time);
}

function formatDashboardTimestamp(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function summarizeItems(items: SalesDispatchGateOut['items']) {
  if (!items.length) return '-';
  return items
    .slice(0, 2)
    .map((item) => `${item.item_code} (${item.quantity} ${item.uom})`)
    .join(', ');
}

function isPendingBookingEntry(
  entry: SalesDispatchDashboardEntry,
): entry is Extract<SalesDispatchDashboardEntry, { row_type: 'PENDING_BOOKING' }> {
  return 'row_type' in entry && entry.row_type === 'PENDING_BOOKING';
}

function getEntryItems(entry: SalesDispatchDashboardEntry) {
  return isPendingBookingEntry(entry) ? [] : entry.items;
}

function DockingDateBucketFilters({
  selectedBucket,
  counts,
  onChange,
}: {
  selectedBucket: DockingDateBucket;
  counts: DockingBucketCounts;
  onChange: (bucket: DockingDateBucket) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-4">
      <span className="mr-1 text-sm font-medium text-muted-foreground">Dispatch Date</span>
      {DOCKING_BUCKET_OPTIONS.map((option) => {
        const count = counts[option.value];
        const isActive = selectedBucket === option.value;
        const hasOverdueVehicles = option.value === 'overdue' && count > 0;

        return (
          <Button
            key={option.value}
            type="button"
            variant={isActive ? 'default' : 'outline'}
            className={cn(
              'gap-2',
              hasOverdueVehicles &&
                !isActive &&
                'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800',
              hasOverdueVehicles && isActive && 'bg-red-600 text-white hover:bg-red-700',
            )}
            onClick={() => onChange(option.value)}
          >
            <span>{option.label}</span>
            <span
              className={cn(
                'inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-foreground',
                hasOverdueVehicles && !isActive && 'bg-red-100 text-red-700',
                hasOverdueVehicles && isActive && 'bg-white/20 text-white',
              )}
            >
              {count}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        'rounded-lg border bg-card p-4 text-left text-card-foreground shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive && 'border-primary/60 bg-primary/5 ring-1 ring-primary/30',
      )}
    >
      <span className="flex items-center justify-between">
        <span>{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </span>
      <span
        className={cn(
          'mt-2 block text-sm font-medium text-muted-foreground',
          isActive && 'text-foreground',
        )}
      >
        {label}
      </span>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
