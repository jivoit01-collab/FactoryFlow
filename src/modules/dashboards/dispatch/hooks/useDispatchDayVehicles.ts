import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { EmptyVehicleGateInEntry } from '@/modules/gate/api/emptyVehicleIn/emptyVehicleIn.api';
import { emptyVehicleInApi } from '@/modules/gate/api/emptyVehicleIn/emptyVehicleIn.api';
import { EMPTY_VEHICLE_IN_QUERY_KEYS } from '@/modules/gate/api/emptyVehicleIn/emptyVehicleIn.queries';
import type {
  SalesDispatchGateOut,
  SalesDispatchStatus,
} from '@/modules/gate/api/salesDispatch/salesDispatch.api';
import { salesDispatchApi } from '@/modules/gate/api/salesDispatch/salesDispatch.api';
import { SALES_DISPATCH_QUERY_KEYS } from '@/modules/gate/api/salesDispatch/salesDispatch.queries';

import {
  DISPATCH_DAY_REFRESH_MS,
  DOCKING_STATUS_PROGRESS,
} from '../constants/dispatch-day.constants';
import { localDateOf, localHourOf } from '../utils/format';
import { useBoardDay } from './boardDay.context';

/** Is the truck still standing inside the plant, or has it gone? */
export type TruckPresence = 'IN' | 'OUT';

/** One physical truck, collapsed from every docking riding on it. */
export interface DayTruck {
  key: string;
  vehicleNo: string;
  arrivalNo: string | null;
  presence: TruckPresence;
  /** Furthest-along docking status on the truck. */
  status: SalesDispatchStatus;
  /**
   * At least one docking on this truck is still at DOCKED — the step the
   * Docking page treats as box scanning.
   *
   * Tracked separately from `status`, which reports the FURTHEST-along docking:
   * a shared truck with one company printed and another still at the dock is
   * genuinely still being scanned, and the headline status would hide that.
   */
  isScanning: boolean;
  /** Company names on board -- more than one on a shared truck. */
  companies: string[];
  transporters: string[];
  customers: string[];
  bills: number;
  amount: number;
  boxes: number;
  weightKg: number;
  /** When the first docking opened -- how long it has been inside. */
  inAt: string | null;
  /** When it cleared the gate, if it has. */
  outAt: string | null;
}

/** One company's slice of the day. */
export interface CompanySlice {
  code: string;
  name: string;
  trucksOut: number;
  trucksIn: number;
  bills: number;
  amount: number;
  boxes: number;
  weightKg: number;
}

/** One customer's slice of the day. */
export interface CustomerSlice {
  code: string;
  name: string;
  /** Distinct trucks that carried something for this customer. */
  trucks: number;
  /** Of those, how many have cleared the gate and how many are still inside.
   *  A customer with two loads where only one has gone reads "1 out · 1 in". */
  trucksOut: number;
  trucksIn: number;
  bills: number;
  amount: number;
  boxes: number;
  weightKg: number;
  litres: number;
  /** Loads on this row that were shared with another customer. On those the
   *  docking carries one SAP total for every bill on it, so the value here is
   *  apportioned rather than exact — the row says so when this is non-zero. */
  sharedLoads: number;
}

/** One transporter's slice of the day. */
export interface VendorSlice {
  name: string;
  trucks: number;
  trucksOut: number;
  trucksIn: number;
  bills: number;
  amount: number;
  boxes: number;
  /** Kept, but not what the panel leads with -- see `litres`. */
  weightKg: number;
  /** The dependable quantity on this data; SAP's weight is not. */
  litres: number;
}

export interface DispatchDayVehicles {
  /** Every truck the day touched: still inside, plus the ones that left today. */
  trucks: DayTruck[];
  inside: DayTruck[];
  out: DayTruck[];
  totalCount: number;
  inCount: number;
  outCount: number;
  /** Of the trucks inside, how many are at the box-scanning step. */
  scanningCount: number;
  /** Today's dispatch by company, biggest first. */
  byCompany: CompanySlice[];
  /** Today's dispatch by transporter, biggest first. */
  byVendor: VendorSlice[];
  /** Today's dispatch by customer, biggest first. */
  byCustomer: CustomerSlice[];
  /** Trucks that cleared the gate in each hour of the day, index 0-23. */
  outByHour: number[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  updatedAt: number;
  refetch: () => void;
}

/** A decimal string off the API, as a number. Blank/null/garbage all read zero. */
function num(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** The date a docking actually cleared the gate, local. */
function outDateOf(docking: SalesDispatchGateOut): string | null {
  return docking.gate_out_date ?? localDateOf(docking.dispatched_at);
}

/** The date a docking opened — when the truck came to the dock. */
function inDateOf(docking: SalesDispatchGateOut): string | null {
  return localDateOf(docking.docked_at ?? docking.created_at);
}

/**
 * Was this docking still inside the plant when `date` ended?
 *
 * Derived from its own timestamps rather than from `status`, because status is
 * always the CURRENT state: asking it about Tuesday returns where the truck
 * stands today. Docked on or before the day, and either never gone or gone
 * afterwards, is the only reading that survives back-dating.
 */
function wasInsideAtEndOf(docking: SalesDispatchGateOut, date: string): boolean {
  const dockedOn = inDateOf(docking);
  if (!dockedOn || dockedOn > date) return false;
  const leftOn = outDateOf(docking);
  // Dispatched but carrying no gate-out date at all: it has clearly gone, and
  // with no date to place it on, claiming it is still inside would strand a
  // phantom truck in the yard forever.
  if (!leftOn) return docking.status !== 'DISPATCHED';
  return leftOn > date;
}

/**
 * The customers on one docking.
 *
 * A docking that carries bills for more than one customer stores them joined
 * into the single `customer_name` field — "RAJEEV TRADING COMPANY, ANAND
 * ENTERPRISES" — and `customer_code` the same way. Grouping on the raw string
 * invents a combined customer that does not exist: across sixty days it turns
 * 257 real customers into 296 rows.
 *
 * Splitting is safe here rather than a guess, and both halves were checked
 * against the live data: no docking carrying a single bill has a comma in its
 * name (so the comma is never part of a name), and on all 104 joined dockings
 * the name and code lists have the same number of parts (so they zip).
 */
function customersOn(docking: SalesDispatchGateOut): { code: string; name: string }[] {
  const split = (value: string | null | undefined) =>
    (value ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

  const names = split(docking.customer_name);
  const codes = split(docking.customer_code);
  const size = Math.max(names.length, codes.length);
  if (size === 0) return [];

  const seen = new Set<string>();
  const out: { code: string; name: string }[] = [];
  for (let index = 0; index < size; index += 1) {
    // Prefer the code as the key — it is machine-issued and never carries a
    // comma, so it survives the split cleanly even where a name would not.
    const code = codes[index] ?? '';
    const name = names[index] ?? code;
    const key = code || name;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ code: key, name: name || key });
  }
  return out;
}

function push(list: string[], value: string | null | undefined) {
  const trimmed = (value ?? '').trim();
  if (trimmed && !list.includes(trimmed)) list.push(trimmed);
}

/**
 * A stamp as epoch ms; `whenMissing` covers absent and unreadable alike.
 *
 * Timestamps reach this hook from two registers in two different SHAPES: the
 * docking carries what DRF rendered, an offset stamp ("...T19:03:20+05:30"),
 * while a gate-in carries a date and a time in separate columns that have to be
 * composed here. Comparing those lexically — which is what the truck's in/out
 * stamps used to do — orders "2026-09-08T09:53:00+05:30" *after*
 * "2026-09-08T04:23:00Z" although they are the same instant. So every ordering
 * decision on a stamp goes through here instead.
 */
function instantOf(iso: string | null | undefined, whenMissing: number): number {
  if (!iso) return whenMissing;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? whenMissing : ms;
}

/** Is `candidate` the earlier stamp? A truck with no stamp yet takes any. */
function isEarlier(candidate: string, current: string | null): boolean {
  if (!current) return true;
  return (
    instantOf(candidate, Number.POSITIVE_INFINITY) < instantOf(current, Number.POSITIVE_INFINITY)
  );
}

/** Is `candidate` the later stamp? A truck with no stamp yet takes any. */
function isLater(candidate: string, current: string | null): boolean {
  if (!current) return true;
  return (
    instantOf(candidate, Number.NEGATIVE_INFINITY) > instantOf(current, Number.NEGATIVE_INFINITY)
  );
}

/**
 * When a truck crossed the barrier, as an instant.
 *
 * The gate register keeps the day and the clock time in separate columns, both
 * local to the plant, so they are composed and normalised here. This is the
 * truer "inside since" than the docking's `docked_at`: a truck that came in at
 * 15:53 and was docked at 19:03 has been standing in the yard for the extra
 * three hours whatever the docking says.
 */
function gateInStampOf(entry: EmptyVehicleGateInEntry): string | null {
  if (!entry.gate_in_date) return null;
  const at = new Date(`${entry.gate_in_date}T${entry.in_time || '00:00:00'}`);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/** Don't retry what a permission or a missing route already answered. */
function retryUnlessRefused(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

/**
 * Today's trucks, their companies and their transporters.
 *
 * Read off the gate rather than off the dispatch plans, from the three registers
 * a truck passes through in order — and it takes all three, because each one
 * only knows about its own step:
 *
 *   - the DOCKING register carries company, transporter, customer, bills and
 *     money, but a truck only enters it when somebody starts a docking on it;
 *   - the GATE-IN register carries the barrier crossing itself, which is the
 *     moment the truck becomes the yard's problem and the moment the dwell clock
 *     should start;
 *   - the PENDING-DOCKING list says which bills a truck that has arrived is
 *     still waiting to have loaded.
 *
 * Reading the docking register alone is what made the wall claim one vehicle on
 * a morning when six were standing in the yard: five had come through the gate
 * and none had been docked yet, so as far as the board was concerned they did
 * not exist.
 *
 * Both questions are asked *of the shown day*, not of the wall clock:
 *   - IN  = still inside at the END of that day. On today that is "inside right
 *           now"; on a back-date it is what was standing in the yard when the
 *           day closed. Reading a live status flag instead would report where
 *           those trucks are *now*, which is not a fact about Tuesday at all.
 *   - OUT = cleared the gate on that day.
 *
 * The docking list filters on when the docking was created, so the window
 * reaches a week back of the shown day; the rest is decided here. The two gate
 * queries are asked only while the board is live, because "still inside" is a
 * fact about this minute and neither register records when that stopped being
 * true — the same reason the late-on-road chip disappears on a back-date.
 */
export function useDispatchDayVehicles(enabled = true): DispatchDayVehicles {
  const day = useBoardDay();

  const params = {
    from_date: day.dockingFrom,
    to_date: day.date,
    all_companies: 1,
  };

  const query = useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.list(params),
    queryFn: () => salesDispatchApi.list(params),
    // A finished day cannot change, so history is fetched once and left alone.
    refetchInterval: day.isToday ? DISPATCH_DAY_REFRESH_MS : false,
    refetchIntervalInBackground: day.isToday,
    staleTime: day.isToday ? DISPATCH_DAY_REFRESH_MS : Infinity,
    retry: retryUnlessRefused,
    enabled,
  });

  // Every truck that came through the barrier for a dispatch and has not left.
  const gateInParams = {
    from_date: day.dockingFrom,
    to_date: day.date,
    reason: 'DISPATCH' as const,
    inside_only: true,
    all_companies: 1,
  };
  const gateInQuery = useQuery({
    queryKey: EMPTY_VEHICLE_IN_QUERY_KEYS.list(gateInParams),
    queryFn: () => emptyVehicleInApi.list(gateInParams),
    refetchInterval: DISPATCH_DAY_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: DISPATCH_DAY_REFRESH_MS,
    retry: retryUnlessRefused,
    enabled: enabled && day.isToday,
  });

  // What those trucks are still carrying: bills booked to a truck that has
  // arrived and has no docking yet.
  const pendingQuery = useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.pendingBookings(params),
    queryFn: () => salesDispatchApi.pendingBookings(params),
    refetchInterval: DISPATCH_DAY_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: DISPATCH_DAY_REFRESH_MS,
    retry: retryUnlessRefused,
    enabled: enabled && day.isToday,
  });

  const dockings = query.data;
  const gateIns = gateInQuery.data;
  const pendingBookings = pendingQuery.data;

  const derived = useMemo(() => {
    const rows = dockings ?? [];
    const atGate = gateIns ?? [];
    const waiting = pendingBookings ?? [];

    // ---- collapse dockings onto physical trucks -------------------------- //
    // A truck shared by two companies is two dockings under one arrival. Group
    // on the arrival when there is one, and fall back to the plate for the
    // legacy dockings that predate arrivals.
    const truckMap = new Map<string, DayTruck>();

    for (const docking of rows) {
      if (docking.status === 'REJECTED' || docking.status === 'CANCELLED') continue;

      const key =
        docking.arrival_no || docking.vehicle_no || `entry-${docking.entry_no || docking.id}`;
      const isInside = wasInsideAtEndOf(docking, day.date);
      const leftOn = outDateOf(docking);

      // Neither inside at the close of the day nor gone during it: the day
      // never touched this load.
      if (!isInside && leftOn !== day.date) continue;

      let truck = truckMap.get(key);
      if (!truck) {
        truck = {
          key,
          vehicleNo: docking.vehicle_no || '',
          arrivalNo: docking.arrival_no ?? null,
          presence: isInside ? 'IN' : 'OUT',
          status: docking.status,
          isScanning: false,
          companies: [],
          transporters: [],
          customers: [],
          bills: 0,
          amount: 0,
          boxes: 0,
          weightKg: 0,
          inAt: null,
          outAt: null,
        };
        truckMap.set(key, truck);
      }

      // One docking still open keeps the whole truck inside — it cannot leave
      // until every company on it is dispatched.
      //
      // The headline status has to come from the dockings that are HOLDING it,
      // not simply the highest-ranked one: DISPATCHED outranks every loading
      // step, so a truck with one company gone and one still at the gatepass
      // would otherwise read "Dispatched" next to its own IN badge.
      const rank = DOCKING_STATUS_PROGRESS[docking.status] ?? 0;
      // Any open docking sitting at DOCKED means somebody is scanning boxes on
      // this truck right now, whatever its other dockings have reached.
      if (isInside && docking.status === 'DOCKED') truck.isScanning = true;
      if (isInside) {
        if (truck.presence !== 'IN') {
          truck.presence = 'IN';
          truck.status = docking.status;
        } else if (rank > (DOCKING_STATUS_PROGRESS[truck.status] ?? 0)) {
          truck.status = docking.status;
        }
      } else if (truck.presence === 'OUT' && rank > (DOCKING_STATUS_PROGRESS[truck.status] ?? 0)) {
        truck.status = docking.status;
      }

      push(truck.companies, docking.company_name || docking.company_code);
      push(truck.transporters, docking.transporter_name);
      push(truck.customers, docking.customer_name);

      truck.bills += docking.document_count ?? 1;
      truck.amount += num(docking.sap_doc_total);
      truck.boxes += num(docking.total_boxes);
      truck.weightKg += num(docking.total_weight);

      const dockedAt = docking.docked_at || docking.created_at;
      if (dockedAt && isEarlier(dockedAt, truck.inAt)) truck.inAt = dockedAt;

      const leftAt = docking.dispatched_at ?? null;
      if (leftAt && isLater(leftAt, truck.outAt)) truck.outAt = leftAt;
    }

    // ---- the same trucks, seen from the gate ----------------------------- //
    // The three registers name a truck three different ways, so they are keyed
    // onto one another by plate: a gate-in and a docking on the same physical
    // truck must land on one row rather than two. The plate index is seeded from
    // the dockings above and then keeps growing, so a truck first seen at the
    // gate still collects its pending bills below.
    const keyOfPlate = new Map<string, string>();
    for (const truck of truckMap.values()) {
      if (truck.vehicleNo) keyOfPlate.set(truck.vehicleNo.trim().toUpperCase(), truck.key);
    }

    /** The truck key for a plate, or null when nothing on the board carries it. */
    const knownKeyFor = (plate: string | null | undefined): string | null => {
      const upper = (plate ?? '').trim().toUpperCase();
      return (upper && keyOfPlate.get(upper)) || null;
    };

    /**
     * The row for a truck the gate can see, created at the barrier if the
     * docking register has never heard of it.
     *
     * A truck that only the gate knows about starts at PENDING_DOCKING — the
     * backend's own name for "arrived, nothing docked yet" — and any real
     * docking status outranks it the moment one appears.
     */
    const truckAtGate = (
      plate: string | null | undefined,
      arrivalNo: string | null,
      fallbackKey: string,
    ): DayTruck => {
      const cleanPlate = (plate ?? '').trim();
      const key = knownKeyFor(cleanPlate) || arrivalNo || cleanPlate.toUpperCase() || fallbackKey;
      let truck = truckMap.get(key);
      if (!truck) {
        truck = {
          key,
          vehicleNo: cleanPlate,
          arrivalNo,
          presence: 'IN',
          status: 'PENDING_DOCKING',
          isScanning: false,
          companies: [],
          transporters: [],
          customers: [],
          bills: 0,
          amount: 0,
          boxes: 0,
          weightKg: 0,
          inAt: null,
          outAt: null,
        };
        truckMap.set(key, truck);
      }
      if (cleanPlate) keyOfPlate.set(cleanPlate.toUpperCase(), key);
      if (!truck.arrivalNo && arrivalNo) truck.arrivalNo = arrivalNo;
      return truck;
    };

    for (const entry of atGate) {
      const truck = truckAtGate(
        entry.vehicle_number,
        entry.arrival_no ?? null,
        `gate-in-${entry.id}`,
      );
      push(truck.companies, entry.company_name || entry.company_code);
      push(truck.transporters, entry.transporter_name);
      // The barrier crossing beats the docking stamp: the dwell clock has to run
      // from when the truck arrived, not from when somebody got to it.
      const arrivedAt = gateInStampOf(entry);
      if (arrivedAt && isEarlier(arrivedAt, truck.inAt)) truck.inAt = arrivedAt;
    }

    for (const group of waiting) {
      const truck = truckAtGate(group.vehicle_no, null, `pending-${group.id}`);
      // A truck that already left today keeps the history it left with; bills
      // still booked to it belong to its next trip, not to this row.
      if (truck.presence !== 'IN') continue;
      push(truck.companies, group.company_name || group.company_code);
      push(truck.transporters, group.transporter_name);
      push(truck.customers, group.customer_name);
      truck.bills += group.document_count ?? 1;
    }

    const trucks = [...truckMap.values()];
    // Anything still inside jumps a truck back to IN, so its out stamp is stale.
    for (const truck of trucks) if (truck.presence === 'IN') truck.outAt = null;

    const inside = trucks
      .filter((truck) => truck.presence === 'IN')
      // Longest inside first: the one that has been standing since morning is
      // the one somebody needs to chase. A truck with no stamp at all leads,
      // where it is most likely to be noticed and fixed.
      .sort(
        (a, b) =>
          instantOf(a.inAt, Number.NEGATIVE_INFINITY) - instantOf(b.inAt, Number.NEGATIVE_INFINITY),
      );
    const out = trucks
      .filter((truck) => truck.presence === 'OUT')
      .sort(
        (a, b) =>
          instantOf(b.outAt, Number.NEGATIVE_INFINITY) -
          instantOf(a.outAt, Number.NEGATIVE_INFINITY),
      );

    // ---- company and vendor slices --------------------------------------- //
    // Split per DOCKING, not per truck: a shared truck's value belongs to the
    // company whose bills it is carrying, not to whichever one sorted first.
    const companyMap = new Map<string, CompanySlice>();
    const vendorMap = new Map<string, VendorSlice>();
    const customerMap = new Map<string, CustomerSlice>();
    // Distinct trucks per company/vendor, so a two-docking load counts once.
    const companyTrucks = new Map<string, Set<string>>();
    const vendorTrucks = new Map<string, { all: Set<string>; out: Set<string> }>();
    const customerTrucks = new Map<string, Set<string>>();

    for (const docking of rows) {
      if (docking.status === 'REJECTED' || docking.status === 'CANCELLED') continue;
      const isInside = wasInsideAtEndOf(docking, day.date);
      const leftOn = outDateOf(docking);
      if (!isInside && leftOn !== day.date) continue;

      const truckKey =
        docking.arrival_no || docking.vehicle_no || `entry-${docking.entry_no || docking.id}`;
      const wentOutToday = !isInside && leftOn === day.date;

      const code = (docking.company_code || '').trim() || 'UNKNOWN';
      const company = companyMap.get(code) ?? {
        code,
        name: (docking.company_name || '').trim() || code,
        trucksOut: 0,
        trucksIn: 0,
        bills: 0,
        amount: 0,
        boxes: 0,
        weightKg: 0,
      };
      const seenForCompany = companyTrucks.get(code) ?? new Set<string>();
      if (!seenForCompany.has(truckKey)) {
        seenForCompany.add(truckKey);
        if (wentOutToday) company.trucksOut += 1;
        else company.trucksIn += 1;
      }
      if (wentOutToday) {
        // Value is only counted once it has actually left, so the company bars
        // add up to the same money the headline KPI reports.
        company.bills += docking.document_count ?? 1;
        company.amount += num(docking.sap_doc_total);
        company.boxes += num(docking.total_boxes);
        company.weightKg += num(docking.total_weight);
      }
      companyTrucks.set(code, seenForCompany);
      companyMap.set(code, company);

      const vendorName = (docking.transporter_name || '').trim() || 'Not recorded';
      const vendor = vendorMap.get(vendorName) ?? {
        name: vendorName,
        trucks: 0,
        trucksOut: 0,
        trucksIn: 0,
        bills: 0,
        amount: 0,
        boxes: 0,
        weightKg: 0,
        litres: 0,
      };
      const seenForVendor = vendorTrucks.get(vendorName) ?? { all: new Set(), out: new Set() };
      if (!seenForVendor.all.has(truckKey)) {
        seenForVendor.all.add(truckKey);
        vendor.trucks += 1;
        if (wentOutToday) vendor.trucksOut += 1;
        else vendor.trucksIn += 1;
      }
      if (wentOutToday) {
        seenForVendor.out.add(truckKey);
        vendor.bills += docking.document_count ?? 1;
        vendor.amount += num(docking.sap_doc_total);
        vendor.boxes += num(docking.total_boxes);
        vendor.weightKg += num(docking.total_weight);
        vendor.litres += num(docking.total_litres);
      }
      vendorTrucks.set(vendorName, seenForVendor);
      vendorMap.set(vendorName, vendor);

      // ---- customers ----------------------------------------------------- //
      const onLoad = customersOn(docking);
      // One SAP total covers every bill on the docking, and the joined field
      // does not say how many bills belong to which customer — so a shared load
      // is divided evenly. Approximate per row, but it keeps the column adding
      // up to the same money the headline reports, which attributing the whole
      // amount to each customer would not.
      const share = onLoad.length > 1 ? 1 / onLoad.length : 1;

      for (const entry of onLoad) {
        const customer = customerMap.get(entry.code) ?? {
          code: entry.code,
          name: entry.name,
          trucks: 0,
          trucksOut: 0,
          trucksIn: 0,
          bills: 0,
          amount: 0,
          boxes: 0,
          weightKg: 0,
          litres: 0,
          sharedLoads: 0,
        };
        const seenForCustomer = customerTrucks.get(entry.code) ?? new Set<string>();
        if (!seenForCustomer.has(truckKey)) {
          seenForCustomer.add(truckKey);
          customer.trucks += 1;
          if (wentOutToday) customer.trucksOut += 1;
          else customer.trucksIn += 1;
        }
        if (onLoad.length > 1) customer.sharedLoads += 1;
        if (wentOutToday) {
          customer.bills += (docking.document_count ?? 1) * share;
          customer.amount += num(docking.sap_doc_total) * share;
          customer.boxes += num(docking.total_boxes) * share;
          customer.weightKg += num(docking.total_weight) * share;
          customer.litres += num(docking.total_litres) * share;
        }
        customerTrucks.set(entry.code, seenForCustomer);
        customerMap.set(entry.code, customer);
      }
    }

    // ---- the trucks standing at the gate, in the same three splits -------- //
    // Trucks-in only, never value: nothing has been loaded onto them yet, so
    // every money and volume column stays exactly where the docking register
    // left it. Without this the panels contradict the screen they sit on — a
    // vehicle list showing seven trucks beside a company bar claiming one.
    for (const entry of atGate) {
      const truckKey = knownKeyFor(entry.vehicle_number) ?? `gate-in-${entry.id}`;

      const code = (entry.company_code || '').trim() || 'UNKNOWN';
      const company = companyMap.get(code) ?? {
        code,
        name: (entry.company_name || '').trim() || code,
        trucksOut: 0,
        trucksIn: 0,
        bills: 0,
        amount: 0,
        boxes: 0,
        weightKg: 0,
      };
      const seenForCompany = companyTrucks.get(code) ?? new Set<string>();
      if (!seenForCompany.has(truckKey)) {
        seenForCompany.add(truckKey);
        company.trucksIn += 1;
      }
      companyTrucks.set(code, seenForCompany);
      companyMap.set(code, company);

      const vendorName = (entry.transporter_name || '').trim() || 'Not recorded';
      const vendor = vendorMap.get(vendorName) ?? {
        name: vendorName,
        trucks: 0,
        trucksOut: 0,
        trucksIn: 0,
        bills: 0,
        amount: 0,
        boxes: 0,
        weightKg: 0,
        litres: 0,
      };
      const seenForVendor = vendorTrucks.get(vendorName) ?? { all: new Set(), out: new Set() };
      if (!seenForVendor.all.has(truckKey)) {
        seenForVendor.all.add(truckKey);
        vendor.trucks += 1;
        vendor.trucksIn += 1;
      }
      vendorTrucks.set(vendorName, seenForVendor);
      vendorMap.set(vendorName, vendor);
    }

    // The customer only reaches the board on the booked bill, not on the gate-in
    // — the gate records a truck and a company, never who the load is for.
    for (const group of waiting) {
      const truckKey = knownKeyFor(group.vehicle_no) ?? `pending-${group.id}`;
      const code = (group.customer_code || '').trim() || (group.customer_name || '').trim();
      if (!code) continue;

      const customer = customerMap.get(code) ?? {
        code,
        name: (group.customer_name || '').trim() || code,
        trucks: 0,
        trucksOut: 0,
        trucksIn: 0,
        bills: 0,
        amount: 0,
        boxes: 0,
        weightKg: 0,
        litres: 0,
        sharedLoads: 0,
      };
      const seenForCustomer = customerTrucks.get(code) ?? new Set<string>();
      if (!seenForCustomer.has(truckKey)) {
        seenForCustomer.add(truckKey);
        customer.trucks += 1;
        customer.trucksIn += 1;
      }
      customerTrucks.set(code, seenForCustomer);
      customerMap.set(code, customer);
    }

    const byCompany = [...companyMap.values()].sort(
      (a, b) => b.amount - a.amount || b.trucksOut - a.trucksOut,
    );
    const byVendor = [...vendorMap.values()].sort(
      (a, b) => b.amount - a.amount || b.trucks - a.trucks,
    );
    // Value first, but a customer with nothing shipped yet still has to rank by
    // the trucks it has standing at the dock — otherwise the very rows this
    // panel exists to surface sort to the bottom.
    const byCustomer = [...customerMap.values()].sort(
      (a, b) => b.amount - a.amount || b.trucks - a.trucks,
    );

    // ---- gate-outs by hour ------------------------------------------------ //
    const outByHour = new Array<number>(24).fill(0);
    for (const truck of out) {
      const hour = localHourOf(truck.outAt);
      if (hour != null) outByHour[hour] += 1;
    }

    return {
      trucks,
      inside,
      out,
      totalCount: trucks.length,
      inCount: inside.length,
      outCount: out.length,
      scanningCount: inside.filter((truck) => truck.isScanning).length,
      byCompany,
      byVendor,
      byCustomer,
      outByHour,
    };
  }, [dockings, gateIns, pendingBookings, day.date]);

  return {
    ...derived,
    // The docking register alone decides whether the board can paint and whether
    // it has to apologise. The two gate reads are additive: if the gate is down,
    // the wall falls back to the trucks it can still account for rather than
    // going blank over a truck it could not name.
    isLoading: enabled && query.isLoading,
    isFetching: query.isFetching || gateInQuery.isFetching || pendingQuery.isFetching,
    isError: query.isError,
    error: query.error,
    updatedAt: Math.max(
      query.dataUpdatedAt,
      gateInQuery.dataUpdatedAt ?? 0,
      pendingQuery.dataUpdatedAt ?? 0,
    ),
    refetch: () => {
      void query.refetch();
      void gateInQuery.refetch();
      void pendingQuery.refetch();
    },
  };
}
