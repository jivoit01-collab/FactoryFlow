import { ChevronDown, ChevronRight, Clock, Loader2, MapPin, Search, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import {
  type SalesDispatchExpectedVehicle,
  type SalesDispatchGateOut,
  type SalesDispatchPendingBooking,
  useSalesDispatchEntries,
  useSalesDispatchExpectedVehicles,
  useSalesDispatchPendingBookings,
} from '@/modules/gate/api';
import { DateRangePicker } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Badge, Card, CardContent } from '@/shared/components/ui';

// Color-coded company pill so the board shows at a glance which company (or
// companies) each truck is dispatching for.
function companyPillClass(code?: string): string {
  const c = (code ?? '').toUpperCase();
  if (c.includes('OIL')) return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
  if (c.includes('MART')) return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100';
  if (c.includes('BEV')) return 'bg-violet-100 text-violet-800 hover:bg-violet-100';
  return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
}

/** A docked truck (one or more dockings sharing an arrival) OR a not-yet-docked
 *  booking. Pending groups carry no docking, so they are shown read-only. */
interface TruckGroup {
  key: string;
  vehicleNo: string;
  companies: { code?: string; name?: string }[];
  totalBills: number;
  dockings: SalesDispatchGateOut[];
  pending?: SalesDispatchPendingBooking;
  expected?: SalesDispatchExpectedVehicle;
}

/** Common fields both a docking and a pending booking expose. */
interface Searchable {
  vehicle_no?: string;
  entry_no?: string;
  customer_name?: string;
  company_name?: string;
  company_code?: string;
  document_numbers?: string[];
}

function matchesSearch(row: Searchable, q: string): boolean {
  if (!q) return true;
  const haystack = [
    row.vehicle_no,
    row.entry_no,
    row.customer_name,
    row.company_name,
    ...(row.document_numbers ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

/** Group DOCKED dockings by their physical truck (VehicleArrival), so a truck
 *  carrying bills for several companies shows as one row, not several. */
function groupDockingsByTruck(dockings: SalesDispatchGateOut[]): TruckGroup[] {
  const groups = new Map<string, TruckGroup>();
  for (const d of dockings) {
    const key = d.arrival_no || `dock-${d.id}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, vehicleNo: d.vehicle_no || d.entry_no, dockings: [], companies: [], totalBills: 0 };
      groups.set(key, group);
    }
    group.dockings.push(d);
    group.totalBills += d.document_count ?? d.document_numbers?.length ?? 0;
    if (!group.companies.some((c) => c.code === d.company_code)) {
      group.companies.push({ code: d.company_code, name: d.company_name });
    }
  }
  return [...groups.values()];
}

const PAGE_SIZE_DEFAULT = 25;

// PENDING_DOCKING is a booking awaiting docking (a separate source), not a
// docking status; the rest map to SalesDispatchGateOut statuses.
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'DOCKED', label: 'Docked' },
  { value: 'PENDING_DOCKING', label: 'Pending docking' },
  { value: 'EXPECTED', label: 'Expected (not arrived)' },
  { value: 'PHOTO_ATTACHED', label: 'Photo attached' },
  { value: 'READY_FOR_GATEPASS', label: 'Ready for gatepass' },
  { value: 'GATEPASS_PRINTED', label: 'Gatepass printed' },
  { value: 'PRINT_COMMITTED', label: 'Print committed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: '', label: 'All statuses' },
];

export default function DispatchLoadingListPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState('DOCKED');
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Each source maps to a lifecycle tier: dockings (docked), pending bookings
  // (arrived, not docked), expected vehicles (booked, not yet arrived). A
  // specific status shows one tier; "All statuses" merges all three.
  const showDockings = status !== 'PENDING_DOCKING' && status !== 'EXPECTED';
  const showPending = status === 'PENDING_DOCKING' || status === '';
  const showExpected = status === 'EXPECTED' || status === '';

  const dateParams = { from_date: dateRange.from || undefined, to_date: dateRange.to || undefined };

  const dockingsQuery = useSalesDispatchEntries(
    { status: showDockings && status ? status : undefined, ...dateParams, all_companies: 1 },
    { enabled: showDockings },
  );
  const pendingQuery = useSalesDispatchPendingBookings(
    { ...dateParams, all_companies: 1 },
    { enabled: showPending },
  );
  const expectedQuery = useSalesDispatchExpectedVehicles(
    { ...dateParams, all_companies: 1 },
    { enabled: showExpected },
  );

  const allDockings = useMemo(
    () => (showDockings && Array.isArray(dockingsQuery.data) ? dockingsQuery.data : []),
    [showDockings, dockingsQuery.data],
  );
  const allPending = useMemo(
    () => (showPending ? (pendingQuery.data ?? []) : []),
    [showPending, pendingQuery.data],
  );
  const allExpected = useMemo(
    () => (showExpected ? (expectedQuery.data ?? []) : []),
    [showExpected, expectedQuery.data],
  );

  const isLoading =
    (showDockings && dockingsQuery.isLoading) ||
    (showPending && pendingQuery.isLoading) ||
    (showExpected && expectedQuery.isLoading);

  // Company options derived from whatever is currently in view.
  const companyOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of [...allDockings, ...allPending, ...allExpected]) {
      if (d.company_code && !seen.has(d.company_code)) {
        seen.set(d.company_code, d.company_name ?? d.company_code);
      }
    }
    return [...seen.entries()].map(([code, name]) => ({ code, name }));
  }, [allDockings, allPending, allExpected]);

  const trucks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const passes = (row: Searchable) =>
      (!company || row.company_code === company) && matchesSearch(row, q);

    const dockingGroups = groupDockingsByTruck(allDockings.filter(passes));
    const pendingGroups: TruckGroup[] = allPending.filter(passes).map((b) => ({
      key: `pending-${b.id}`,
      vehicleNo: b.vehicle_no || b.entry_no || '—',
      companies: [{ code: b.company_code, name: b.company_name }],
      totalBills: b.document_count ?? b.document_numbers?.length ?? 0,
      dockings: [],
      pending: b,
    }));
    const expectedGroups: TruckGroup[] = allExpected.filter(passes).map((e) => ({
      key: `expected-${e.id}`,
      vehicleNo: e.vehicle_no || '—',
      companies: [{ code: e.company_code, name: e.company_name }],
      totalBills: e.document_count ?? e.document_numbers?.length ?? 0,
      dockings: [],
      expected: e,
    }));
    // Actionable first: docked → arrived/pending → expected (not arrived).
    return [...dockingGroups, ...pendingGroups, ...expectedGroups];
  }, [allDockings, allPending, allExpected, search, company]);

  useEffect(() => {
    setPage(1);
  }, [search, company, status, dateRange.from, dateRange.to, pageSize]);

  const totalPages = Math.max(Math.ceil(trucks.length / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const pageTrucks = trucks.slice((safePage - 1) * pageSize, safePage * pageSize);

  function openDocking(id: number) {
    navigate(`/warehouse/dispatch-loading/${id}`);
  }

  // Not-docked vehicle (pending/expected): scan its bills via bill-based sessions.
  function openPrep(t: TruckGroup) {
    const bills = (t.pending ?? t.expected)?.document_numbers ?? [];
    const companyName = t.companies[0]?.name ?? t.companies[0]?.code ?? '';
    const qs = new URLSearchParams({
      vehicle: t.vehicleNo,
      company: companyName,
      bills: bills.join(','),
    });
    navigate(`/warehouse/dispatch-loading-prep?${qs.toString()}`);
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Dispatch Loading"
        subtitle="Trucks docked and ready to load — scan pallets against their bills"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vehicle, docking, bill, or customer…"
            className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-md border px-3 py-2 text-sm"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        >
          <option value="">All companies</option>
          {companyOptions.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value || 'all'} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trucks…
        </div>
      ) : trucks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No trucks match your filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {pageTrucks.map((t) => {
                // Pending / expected are read-only informational rows: no
                // docking exists yet, so nothing to scan.
                if (t.pending || t.expected) {
                  const arrived = Boolean(t.pending);
                  const customer = t.pending?.customer_name ?? t.expected?.customer_name;
                  const Icon = arrived ? Clock : MapPin;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
                      onClick={() => openPrep(t)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{t.vehicleNo}</span>
                          {t.companies.map((c) => (
                            <Badge key={c.code ?? c.name} className={companyPillClass(c.code)}>
                              {c.name ?? c.code}
                            </Badge>
                          ))}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {arrived ? 'Arrived · awaiting docking' : 'Booked · not yet arrived'}
                          {customer ? ` · ${customer}` : ''} · tap to pre-scan
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {t.totalBills} bill{t.totalBills === 1 ? '' : 's'}
                        </span>
                        <Badge variant="outline">{arrived ? 'Not docked' : 'Not arrived'}</Badge>
                      </div>
                    </button>
                  );
                }

                const multi = t.dockings.length > 1;
                const isOpen = expanded === t.key;
                const single = t.dockings[0];
                return (
                  <div key={t.key}>
                    {/* Truck row */}
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
                      onClick={() =>
                        multi ? setExpanded(isOpen ? null : t.key) : openDocking(single.id)
                      }
                    >
                      {multi ? (
                        isOpen ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )
                      ) : (
                        <Truck className="h-4 w-4 shrink-0 text-primary" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{t.vehicleNo}</span>
                          {t.companies.map((c) => (
                            <Badge key={c.code ?? c.name} className={companyPillClass(c.code)}>
                              {c.name ?? c.code}
                            </Badge>
                          ))}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {multi
                            ? `${t.dockings.length} companies · ${t.totalBills} bill${t.totalBills === 1 ? '' : 's'}`
                            : `${single.entry_no}${single.dispatch_date ? ` · ${single.dispatch_date}` : ''}${single.customer_name ? ` · ${single.customer_name}` : ''}`}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {t.totalBills} bill{t.totalBills === 1 ? '' : 's'}
                        </span>
                        {!multi && <Badge variant="secondary">{single.status}</Badge>}
                      </div>
                    </button>

                    {/* Multi-company truck: pick which company's bills to load */}
                    {multi && isOpen && (
                      <div className="divide-y border-t bg-muted/30">
                        {t.dockings.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            className="flex w-full items-center gap-3 py-2.5 pl-11 pr-4 text-left text-sm hover:bg-muted"
                            onClick={() => openDocking(d.id)}
                          >
                            <Badge className={companyPillClass(d.company_code)}>
                              {d.company_name ?? d.company_code}
                            </Badge>
                            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                              {d.document_count ?? d.document_numbers?.length ?? 0} bill
                              {(d.document_count ?? d.document_numbers?.length ?? 0) === 1 ? '' : 's'}
                              {d.customer_name ? ` · ${d.customer_name}` : ''}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <PaginationControls
              page={safePage}
              pageSize={pageSize}
              total={trucks.length}
              totalPages={totalPages}
              isLoading={isLoading}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
