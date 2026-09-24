import { format } from 'date-fns';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ChevronRight,
  Download,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { DISPATCH_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { useGlobalDateRange } from '@/core/store/hooks';
import { downloadTrackingSheet } from '@/modules/dispatch/components/tracking/trackingExport';
import {
  type CreateTruckDispatchUpdateRequest,
  type DispatchTrackingCustomerLocation,
  type DispatchTrackingFilters,
  type DispatchTrackingTruck,
  type TruckDispatchStatus,
  useAddTruckDispatchUpdate,
  useDispatchTrackingTrucks,
  useTruckDispatchBills,
  useTruckDispatchUpdates,
  useUploadReturnNote,
} from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';
import { DateRangePicker } from '@/modules/gate/components/DateRangePicker';
import { EmptyPanel, FilterBar, FilterField, PageHeader } from '@/shared/components/page';
import { PaginationControls } from '@/shared/components/PaginationControls';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect as Select,
  SelectOption,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';
import { getErrorMessage } from '@/shared/utils/error';

// The stages an operator can add after dispatch (DISPATCHED is the starting point).
const ADDABLE_STATUSES: { value: TruckDispatchStatus; label: string }[] = [
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'REACHED_DESTINATION', label: 'Reached Destination' },
  { value: 'UNLOADING', label: 'Unloading' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'PARTIALLY_DELIVERED', label: 'Partially Delivered' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'DELAYED', label: 'Delayed' },
  { value: 'CLOSED', label: 'Closed' },
];

// Every status a truck can currently be in — includes the DISPATCHED starting
// point, so the filter can narrow to trucks with no updates yet.
const STATUS_FILTER_OPTIONS: { value: TruckDispatchStatus; label: string }[] = [
  { value: 'DISPATCHED', label: 'Dispatched' },
  ...ADDABLE_STATUSES,
];

const STATUS_CLASS: Record<TruckDispatchStatus, string> = {
  DISPATCHED:
    'border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  IN_TRANSIT:
    'border-indigo-300 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  REACHED_DESTINATION:
    'border-cyan-300 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  UNLOADING:
    'border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  DELIVERED:
    'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  PARTIALLY_DELIVERED:
    'border-orange-300 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
  RETURNED:
    'border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
  DELAYED:
    'border-yellow-300 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  CLOSED:
    'border-gray-300 dark:border-border bg-gray-100 dark:bg-muted text-gray-700 dark:text-muted-foreground',
};

function StatusBadge({ status, label }: { status: TruckDispatchStatus; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        STATUS_CLASS[status] ?? STATUS_CLASS.DISPATCHED,
      )}
    >
      {label}
    </span>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, 'dd MMM yyyy, HH:mm');
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, 'dd MMM yyyy');
}

/**
 * Dispatch Tracking — a board of trucks that have left the gate, each showing its
 * current post-dispatch status. Expand a truck to see its status timeline and add
 * the next event (in transit, delivered, returned, …). Tracked at the truck (trip)
 * level, so a multi-company truck has one shared timeline.
 */
export default function DispatchTrackingPage() {
  const { hasPermission } = usePermission();
  const canUpdate = hasPermission(DISPATCH_PERMISSIONS.DISPATCH_TRACKING_UPDATE);
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();

  // Seed from the URL so the Dispatch Tracking dashboard can deep-link here
  // pre-filtered (e.g. ?status=IN_TRANSIT or ?search=<vehicle>).
  const [search, setSearch] = useState(
    () => new URLSearchParams(window.location.search).get('search') ?? '',
  );
  const [statusFilter, setStatusFilter] = useState<TruckDispatchStatus | ''>(() => {
    const s = new URLSearchParams(window.location.search).get('status');
    return s && STATUS_FILTER_OPTIONS.some((o) => o.value === s) ? (s as TruckDispatchStatus) : '';
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<DispatchTrackingTruck | null>(null);

  // Any filter change resets back to the first page.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateRange.from, dateRange.to, pageSize]);

  const filters = useMemo<DispatchTrackingFilters>(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter || undefined,
      from_date: dateRange.from || undefined,
      to_date: dateRange.to || undefined,
      page,
      page_size: pageSize,
    }),
    [search, statusFilter, dateRange.from, dateRange.to, page, pageSize],
  );

  const trucksQuery = useDispatchTrackingTrucks(filters);
  const trucksPage = trucksQuery.data;
  const trucks = useMemo(() => trucksPage?.results ?? [], [trucksPage]);
  const hasActiveFilters = Boolean(search.trim() || statusFilter || dateRange.from || dateRange.to);

  // Overdue trucks — reach-by date passed and not reached yet. Alert once when found.
  const lateTrucks = useMemo(() => trucks.filter((truck) => truck.is_late), [trucks]);
  const alertedRef = useRef(false);
  useEffect(() => {
    if (lateTrucks.length > 0 && !alertedRef.current) {
      alertedRef.current = true;
      toast.warning(
        `${lateTrucks.length} truck${lateTrucks.length === 1 ? '' : 's'} overdue — expected reach date exceeded.`,
      );
    }
    if (lateTrucks.length === 0) alertedRef.current = false;
  }, [lateTrucks.length]);

  // The download is what is on screen: this page of trucks, under these filters.
  const handleExport = () => {
    const totalPages = trucksPage?.total_pages ?? 1;
    const total = trucksPage?.count ?? trucks.length;
    downloadTrackingSheet({
      trucks,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      page: trucksPage?.page ?? page,
      totalPages,
    });
    const shown = `${trucks.length} truck${trucks.length === 1 ? '' : 's'}`;
    toast.success(
      total > trucks.length
        ? `Exported the ${shown} on this page (of ${total}).`
        : `Exported ${shown}.`,
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Navigation}
        accent="sky"
        title="Dispatch Tracking"
        description="Track trucks after they leave the gate — in transit, delivered, returned. Add a status update as each event happens."
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => trucksQuery.refetch()}
          disabled={trucksQuery.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={trucksQuery.isLoading || trucks.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </PageHeader>

      <FilterBar isFetching={trucksQuery.isFetching}>
        <FilterField
          label="Search"
          htmlFor="dispatch-tracking-search"
          className="sm:min-w-[300px] sm:flex-1"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dispatch-tracking-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vehicle, transporter, arrival, bill, customer, company, status"
              className="pl-9"
            />
          </div>
        </FilterField>

        <FilterField label="Status" htmlFor="dispatch-tracking-status">
          <Select
            id="dispatch-tracking-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as TruckDispatchStatus | '')}
            className="h-10 w-full sm:w-44"
            aria-label="Filter by status"
          >
            <SelectOption value="">All statuses</SelectOption>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </Select>
        </FilterField>

        <FilterField label="Dispatched between">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(date) => setDateRange(date && 'from' in date ? date : undefined)}
          />
        </FilterField>
      </FilterBar>

      {lateTrucks.length > 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="font-medium">
            {lateTrucks.length} truck{lateTrucks.length === 1 ? '' : 's'} overdue — the expected
            reach date has passed and {lateTrucks.length === 1 ? 'it hasn’t' : 'they haven’t'}{' '}
            reached yet.
          </span>
        </div>
      ) : null}

      {trucksQuery.isLoading ? (
        <EmptyState text="Loading dispatched trucks..." />
      ) : trucks.length === 0 ? (
        <EmptyState
          text={
            hasActiveFilters
              ? 'No dispatched trucks match these filters.'
              : 'No dispatched trucks to track yet.'
          }
        />
      ) : (
        <div className="space-y-3">
          {trucks.map((truck) => (
            <TruckRow key={truck.arrival} truck={truck} onOpen={() => setSelected(truck)} />
          ))}
          <PaginationControls
            page={trucksPage?.page ?? page}
            pageSize={trucksPage?.page_size ?? pageSize}
            total={trucksPage?.count ?? 0}
            totalPages={trucksPage?.total_pages ?? 1}
            isLoading={trucksQuery.isFetching}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-xl"
        >
          {selected ? (
            <>
              <SheetHeader className="space-y-2">
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  {selected.vehicle_number || '-'}
                  {selected.arrival_no ? (
                    <Badge
                      variant="outline"
                      className="border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
                    >
                      {selected.arrival_no}
                    </Badge>
                  ) : null}
                  <StatusBadge
                    status={selected.current_status}
                    label={selected.current_status_display}
                  />
                </SheetTitle>
                <SheetDescription className="space-y-1 text-left">
                  {selected.transporter_name ? (
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {selected.transporter_name}
                    </span>
                  ) : null}
                  <span className="block">
                    Dispatched {formatDateTime(selected.dispatched_at)} · Driver{' '}
                    {selected.driver_name || '-'}
                    {selected.driver_mobile ? (
                      <>
                        {' · '}
                        <a
                          href={`tel:${selected.driver_mobile}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {selected.driver_mobile}
                        </a>
                      </>
                    ) : null}
                    {selected.gatepass_no ? ` · ${selected.gatepass_no}` : ''}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2">
                    <Package className="h-3.5 w-3.5" />
                    {selected.documents.length ? selected.documents.join(', ') : 'No bills'}
                    {selected.customers.length ? ` · ${selected.customers.join(', ')}` : ''}
                  </span>
                  <span className="flex flex-wrap gap-1 pt-1">
                    {selected.companies.map((company) => (
                      <Badge key={company} variant="outline">
                        {company}
                      </Badge>
                    ))}
                  </span>
                </SheetDescription>
              </SheetHeader>

              {/* `?? []`: the board can deploy ahead of the backend that sends it,
                  and a missing key must not take the sheet down. */}
              <CustomerLocations locations={selected.customer_locations ?? []} />

              <TruckTrackingPanel arrivalId={selected.arrival} canUpdate={canUpdate} />
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** SAP's address block as display lines: CR-separated, closing on the country
 *  code ("IN"), which is dropped — every customer here is in India. */
function addressLines(address: string) {
  const lines = address
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 1 && lines[lines.length - 1] === 'IN' ? lines.slice(0, -1) : lines;
}

/** Where the truck is delivering — each customer's ship-to address off its bills. */
function CustomerLocations({ locations }: { locations: DispatchTrackingCustomerLocation[] }) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        Customer location{locations.length === 1 ? '' : 's'}
      </p>
      {locations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No customer address on this truck’s bills.</p>
      ) : (
        <ul className="divide-y">
          {locations.map((location) => {
            const lines = addressLines(location.ship_to_address);
            return (
              <li
                key={`${location.customer_name}|${location.ship_to_code}|${location.ship_to_address}`}
                className="space-y-0.5 py-2 text-sm first:pt-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{location.customer_name || '—'}</span>
                  {location.place_of_supply ? (
                    <Badge variant="outline">{location.place_of_supply}</Badge>
                  ) : null}
                </div>
                {location.ship_to_code && location.ship_to_code !== location.customer_name ? (
                  <p className="text-xs text-muted-foreground">Ship to {location.ship_to_code}</p>
                ) : null}
                {lines.length ? (
                  <address className="not-italic text-muted-foreground">
                    {lines.map((line, index) => (
                      <span key={`${index}-${line}`} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                ) : (
                  <p className="text-muted-foreground">No address on the bill.</p>
                )}
                {location.documents.length ? (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Package className="h-3 w-3" />
                    {location.documents.join(', ')}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TruckRow({ truck, onOpen }: { truck: DispatchTrackingTruck; onOpen: () => void }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`cursor-pointer transition-colors hover:bg-muted/40 ${
        truck.is_late ? 'border-red-300 dark:border-red-500/30 bg-red-50/40 dark:bg-red-500/10' : ''
      }`}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <Truck
          className={`mt-0.5 h-4 w-4 shrink-0 ${truck.is_late ? 'text-red-600' : 'text-blue-600'}`}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{truck.vehicle_number || '-'}</span>
            {truck.arrival_no ? (
              <Badge
                variant="outline"
                className="border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
              >
                {truck.arrival_no}
              </Badge>
            ) : null}
            <StatusBadge status={truck.current_status} label={truck.current_status_display} />
            {truck.is_late ? (
              <Badge className="gap-1 bg-red-600 hover:bg-red-600">
                <AlertTriangle className="h-3 w-3" />
                Late · {truck.days_overdue}d overdue
              </Badge>
            ) : null}
            {truck.companies.map((company) => (
              <Badge key={company} variant="outline">
                {company}
              </Badge>
            ))}
          </div>
          {truck.expected_reach_date ? (
            <p
              className={`inline-flex items-center gap-1 text-xs ${
                truck.is_late ? 'font-medium text-red-600' : 'text-muted-foreground'
              }`}
            >
              <CalendarClock className="h-3 w-3" />
              {truck.is_late ? 'Date exceeded — was due' : 'Reach by'}{' '}
              {formatDate(truck.expected_reach_date)}
            </p>
          ) : null}
          {truck.transporter_name ? (
            <p className="flex items-center gap-1 text-sm">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{truck.transporter_name}</span>
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Dispatched {formatDateTime(truck.dispatched_at)} · Driver {truck.driver_name || '-'}
            {truck.driver_mobile ? (
              <>
                {' · '}
                {/* Chasing a truck starts with a call — tappable, and it must not
                    open the detail sheet the card sits behind. */}
                <a
                  href={`tel:${truck.driver_mobile}`}
                  onClick={(event) => event.stopPropagation()}
                  className="font-medium text-foreground hover:underline"
                >
                  {truck.driver_mobile}
                </a>
              </>
            ) : null}
            {truck.gatepass_no ? ` · ${truck.gatepass_no}` : ''}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            {truck.documents.length ? truck.documents.join(', ') : 'No bills'}
            {truck.customers.length ? ` · ${truck.customers.join(', ')}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden text-right sm:inline">
            {truck.update_count} update{truck.update_count === 1 ? '' : 's'}
            <br />
            last {formatDateTime(truck.last_update_at)}
          </span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

const EMPTY_FORM = {
  status: '' as TruckDispatchStatus | '',
  location: '',
  remarks: '',
  expected_reach_date: '',
  delivered_date: '',
};

/** Statuses that record a hand-over date the operator can back-date. */
const DELIVERY_STATUSES: TruckDispatchStatus[] = ['DELIVERED', 'PARTIALLY_DELIVERED'];

/** One item's row in the partial-delivery table, as the operator edits it. */
interface ItemSplit {
  delivered: string;
  returned: string;
}

/** Attaches the return note to a partial delivery that was saved without one —
 *  the signed note usually comes back with the driver a day or two later. */
function ReturnNoteUpload({ arrivalId, updateId }: { arrivalId: number; updateId: number }) {
  const upload = useUploadReturnNote();
  const inputId = `late-return-note-${updateId}`;

  const handleChange = async (file: File | undefined) => {
    if (!file) return;
    try {
      await upload.mutateAsync({ arrivalId, updateId, file });
      toast.success('Return note attached');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to attach the return note'));
    }
  };

  return (
    <span className="mt-1 inline-flex items-center gap-1 text-xs">
      <Label htmlFor={inputId} className="cursor-pointer text-blue-600 hover:underline">
        {upload.isPending ? 'Attaching…' : 'Attach return note'}
      </Label>
      <input
        id={inputId}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        disabled={upload.isPending}
        onChange={(event) => handleChange(event.target.files?.[0])}
      />
    </span>
  );
}

function TruckTrackingPanel({ arrivalId, canUpdate }: { arrivalId: number; canUpdate: boolean }) {
  const updatesQuery = useTruckDispatchUpdates(arrivalId);
  const addUpdate = useAddTruckDispatchUpdate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [proof, setProof] = useState<File | null>(null);
  const [returnNote, setReturnNote] = useState<File | null>(null);
  // Keyed by item id — a bill is "short" when any of its items has a number.
  const [splits, setSplits] = useState<Record<number, ItemSplit>>({});
  const [openBills, setOpenBills] = useState<Record<number, boolean>>({});

  const isPartial = form.status === 'PARTIALLY_DELIVERED';
  const showDeliveredDate = DELIVERY_STATUSES.includes(form.status as TruckDispatchStatus);
  const billsQuery = useTruckDispatchBills(arrivalId, isPartial);
  const bills = billsQuery.data ?? [];

  const updates = updatesQuery.data ?? [];

  const setSplit = (itemId: number, patch: Partial<ItemSplit>) =>
    setSplits((current) => ({
      ...current,
      [itemId]: { ...(current[itemId] ?? { delivered: '', returned: '' }), ...patch },
    }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setProof(null);
    setReturnNote(null);
    setSplits({});
    setOpenBills({});
  };

  const handleSubmit = async () => {
    if (!form.status) {
      toast.error('Pick a status.');
      return;
    }

    // Only items the operator actually filled are sent; a bill with no filled
    // item — and any bill left untouched — went out in full.
    const partial_lines = isPartial
      ? bills
          .map((bill) => ({
            document: bill.id,
            items: bill.items
              .filter((item) => {
                const split = splits[item.id];
                return Number(split?.delivered || 0) > 0 || Number(split?.returned || 0) > 0;
              })
              .map((item) => ({
                item: item.id,
                qty_delivered: splits[item.id]?.delivered?.trim() || '0',
                qty_returned: splits[item.id]?.returned?.trim() || '0',
              })),
          }))
          .filter((line) => line.items.length > 0)
      : [];

    if (isPartial && partial_lines.length === 0) {
      toast.error('Enter the quantity delivered or returned for at least one item.');
      return;
    }

    try {
      const payload: CreateTruckDispatchUpdateRequest = {
        status: form.status,
        location: form.location.trim(),
        remarks: form.remarks.trim(),
        proof,
        ...(form.status === 'IN_TRANSIT' && form.expected_reach_date
          ? { expected_reach_date: form.expected_reach_date }
          : {}),
        ...(showDeliveredDate && form.delivered_date
          ? { delivered_date: form.delivered_date }
          : {}),
        ...(isPartial ? { partial_lines, return_note: returnNote } : {}),
      };
      await addUpdate.mutateAsync({ arrivalId, data: payload });
      toast.success('Status update added');
      resetForm();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add the status update'));
    }
  };

  return (
    <div className="space-y-4 rounded-md border p-3">
      {canUpdate ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Add a status update</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`status-${arrivalId}`} className="text-xs">
                Status
              </Label>
              <Select
                id={`status-${arrivalId}`}
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as TruckDispatchStatus,
                  }))
                }
              >
                <SelectOption value="">Select a status…</SelectOption>
                {ADDABLE_STATUSES.map((option) => (
                  <SelectOption key={option.value} value={option.value}>
                    {option.label}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`location-${arrivalId}`} className="text-xs">
                Location / place (optional)
              </Label>
              <Input
                id={`location-${arrivalId}`}
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="e.g. NH-48, Gurdaspur"
              />
            </div>
          </div>
          {form.status === 'IN_TRANSIT' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`reach-${arrivalId}`} className="text-xs">
                Expected reach date — when the truck should reach the location
              </Label>
              <Input
                id={`reach-${arrivalId}`}
                type="date"
                className="w-full sm:w-56"
                value={form.expected_reach_date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, expected_reach_date: event.target.value }))
                }
              />
              <span className="text-[11px] text-muted-foreground">
                If this date passes before the truck reaches, the trip is flagged “late / date
                exceeded”.
              </span>
            </div>
          ) : null}
          {showDeliveredDate ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`delivered-${arrivalId}`} className="text-xs">
                Delivered date — when the goods were actually handed over
              </Label>
              <Input
                id={`delivered-${arrivalId}`}
                type="date"
                className="w-full sm:w-56"
                value={form.delivered_date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, delivered_date: event.target.value }))
                }
              />
              <span className="text-[11px] text-muted-foreground">
                Back-date this if the delivery happened earlier than you are logging it.
              </span>
            </div>
          ) : null}
          {isPartial ? (
            <div className="flex flex-col gap-2 rounded-md border border-orange-200 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/10 p-3">
              <div>
                <p className="text-xs font-medium">What came back?</p>
                <p className="text-[11px] text-muted-foreground">
                  Open a bill and fill the quantity delivered and returned for each item the
                  customer was short on. Items you leave blank — and bills you never open — count as
                  delivered in full.
                </p>
              </div>
              {billsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading the truck’s bills…</p>
              ) : bills.length === 0 ? (
                <p className="text-xs text-muted-foreground">No bills found on this truck.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {bills.map((bill) => {
                    const open = !!openBills[bill.id];
                    const filled = bill.items.filter((item) => {
                      const split = splits[item.id];
                      return Number(split?.delivered || 0) > 0 || Number(split?.returned || 0) > 0;
                    }).length;
                    return (
                      <div
                        key={bill.id}
                        className="rounded border border-orange-200 dark:border-orange-500/30 bg-white"
                      >
                        <button
                          type="button"
                          aria-expanded={open}
                          className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs"
                          onClick={() =>
                            setOpenBills((current) => ({ ...current, [bill.id]: !open }))
                          }
                        >
                          <ChevronRight
                            className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                              open ? 'rotate-90' : ''
                            }`}
                          />
                          <span className="font-medium">{bill.sap_doc_num || '—'}</span>
                          <span className="truncate text-muted-foreground">
                            {bill.customer_name || '—'}
                          </span>
                          <span className="ml-auto shrink-0 text-muted-foreground">
                            {filled > 0 ? (
                              <span className="font-medium text-orange-700 dark:text-orange-400">
                                {filled} item{filled === 1 ? '' : 's'} short
                              </span>
                            ) : (
                              `${bill.items.length} item${bill.items.length === 1 ? '' : 's'}`
                            )}
                          </span>
                        </button>
                        {open ? (
                          <div className="overflow-x-auto border-t border-orange-100 dark:border-orange-500/30 px-2 pb-2">
                            <table className="w-full min-w-[460px] text-xs">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="py-1 pr-2">Item</th>
                                  <th className="py-1 pr-2 text-right">Dispatched</th>
                                  <th className="py-1 pr-2 text-right">Delivered</th>
                                  <th className="py-1 text-right">Returned</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bill.items.map((item) => (
                                  <tr key={item.id} className="border-t border-orange-50">
                                    <td className="py-1.5 pr-2">
                                      <span className="font-medium">{item.item_code}</span>
                                      <span className="block truncate text-muted-foreground">
                                        {item.item_name}
                                      </span>
                                    </td>
                                    <td className="py-1.5 pr-2 text-right text-muted-foreground">
                                      {item.quantity} {item.uom}
                                    </td>
                                    <td className="py-1.5 pr-2 text-right">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        aria-label={`Delivered quantity for ${item.item_code}`}
                                        className="h-7 w-20 text-right"
                                        value={splits[item.id]?.delivered ?? ''}
                                        onChange={(event) =>
                                          setSplit(item.id, { delivered: event.target.value })
                                        }
                                      />
                                    </td>
                                    <td className="py-1.5 text-right">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        aria-label={`Returned quantity for ${item.item_code}`}
                                        className="h-7 w-20 text-right"
                                        value={splits[item.id]?.returned ?? ''}
                                        onChange={(event) =>
                                          setSplit(item.id, { returned: event.target.value })
                                        }
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`return-note-${arrivalId}`} className="text-xs">
                  Return note (optional)
                </Label>
                <Input
                  id={`return-note-${arrivalId}`}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(event) => setReturnNote(event.target.files?.[0] ?? null)}
                />
                <span className="text-[11px] text-muted-foreground">
                  Not required now — if the signed note comes back with the driver later, save this
                  update and attach it from the timeline.
                </span>
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`remarks-${arrivalId}`} className="text-xs">
              Remarks (optional)
            </Label>
            <Textarea
              id={`remarks-${arrivalId}`}
              value={form.remarks}
              onChange={(event) =>
                setForm((current) => ({ ...current, remarks: event.target.value }))
              }
              placeholder="Any note about this update…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`proof-${arrivalId}`} className="text-xs">
              Proof (photo / document, optional)
            </Label>
            <Input
              id={`proof-${arrivalId}`}
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) => setProof(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={handleSubmit} disabled={addUpdate.isPending}>
              {addUpdate.isPending ? 'Adding…' : 'Add update'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Timeline</p>
        {updatesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading timeline…</p>
        ) : updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No updates yet — the truck has just been dispatched.
          </p>
        ) : (
          <ol className="space-y-2">
            {updates.map((update) => (
              <li key={update.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={update.status} label={update.status_display} />
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(update.occurred_at)}
                  </span>
                  {update.location ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {update.location}
                    </span>
                  ) : null}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {update.created_by_name || '—'}
                  </span>
                </div>
                {update.expected_reach_date ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    Reach by {formatDate(update.expected_reach_date)}
                  </p>
                ) : null}
                {update.delivered_date ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    Delivered on {formatDate(update.delivered_date)}
                  </p>
                ) : null}
                {update.remarks ? <p className="mt-1 text-sm">{update.remarks}</p> : null}
                {update.partial_lines?.length ? (
                  <div className="mt-2 space-y-2">
                    {update.partial_lines.map((line) => (
                      <div
                        key={line.id}
                        className="overflow-x-auto rounded border border-orange-100 dark:border-orange-500/30 bg-orange-50/40 dark:bg-orange-500/10"
                      >
                        <div className="flex flex-wrap items-baseline gap-2 px-2 py-1">
                          <span className="text-xs font-medium">{line.sap_doc_num || '—'}</span>
                          <span className="text-xs text-muted-foreground">
                            {line.customer_name || '—'}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {line.qty_delivered} delivered ·{' '}
                            <span className="font-medium text-orange-700 dark:text-orange-400">
                              {line.qty_returned} returned
                            </span>
                          </span>
                        </div>
                        <table className="w-full min-w-[360px] text-xs">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="px-2 py-1">Item</th>
                              <th className="px-2 py-1 text-right">Dispatched</th>
                              <th className="px-2 py-1 text-right">Delivered</th>
                              <th className="px-2 py-1 text-right">Returned</th>
                            </tr>
                          </thead>
                          <tbody>
                            {line.items.map((item) => (
                              <tr
                                key={item.id}
                                className="border-t border-orange-100 dark:border-orange-500/30"
                              >
                                <td className="px-2 py-1">
                                  <span className="font-medium">{item.item_code}</span>
                                  <span className="block truncate text-muted-foreground">
                                    {item.item_name}
                                  </span>
                                </td>
                                <td className="px-2 py-1 text-right text-muted-foreground">
                                  {item.quantity} {item.uom}
                                </td>
                                <td className="px-2 py-1 text-right">{item.qty_delivered}</td>
                                <td className="px-2 py-1 text-right font-medium text-orange-700 dark:text-orange-400">
                                  {item.qty_returned}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  {update.proof ? (
                    <a
                      href={update.proof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                    >
                      View proof
                    </a>
                  ) : null}
                  {update.return_note ? (
                    <a
                      href={update.return_note}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                    >
                      View return note
                    </a>
                  ) : update.status === 'PARTIALLY_DELIVERED' && canUpdate ? (
                    <ReturnNoteUpload arrivalId={arrivalId} updateId={update.id} />
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/** Thin wrapper so the page's many call sites keep reading `<EmptyState text=… />`. */
function EmptyState({ text }: { text: string }) {
  return <EmptyPanel message={text} loading={/loading/i.test(text)} />;
}
