import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type {
  SalesDispatchGateOut,
  SalesDispatchStatus,
} from '@/modules/gate/api/salesDispatch/salesDispatch.api';
import { salesDispatchApi } from '@/modules/gate/api/salesDispatch/salesDispatch.api';
import { SALES_DISPATCH_QUERY_KEYS } from '@/modules/gate/api/salesDispatch/salesDispatch.queries';

import {
  DISPATCH_DAY_REFRESH_MS,
  DOCKING_DAYS_BACK,
  DOCKING_STATUS_PROGRESS,
  INSIDE_DOCKING_STATUSES,
  shiftISO,
} from '../constants/dispatch-day.constants';
import { localDateOf, localHourOf } from '../utils/format';
import { useBoardDay } from './useBoardDay';

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

/** One transporter's slice of the day. */
export interface VendorSlice {
  name: string;
  trucks: number;
  trucksOut: number;
  trucksIn: number;
  bills: number;
  amount: number;
  boxes: number;
  weightKg: number;
}

export interface DispatchDayVehicles {
  /** Every truck the day touched: still inside, plus the ones that left today. */
  trucks: DayTruck[];
  inside: DayTruck[];
  out: DayTruck[];
  totalCount: number;
  inCount: number;
  outCount: number;
  /** Today's dispatch by company, biggest first. */
  byCompany: CompanySlice[];
  /** Today's dispatch by transporter, biggest first. */
  byVendor: VendorSlice[];
  /** Trucks that cleared the gate in each hour of the day, index 0-23. */
  outByHour: number[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  updatedAt: number;
  refetch: () => void;
}

const INSIDE = new Set<string>(INSIDE_DOCKING_STATUSES);

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

function push(list: string[], value: string | null | undefined) {
  const trimmed = (value ?? '').trim();
  if (trimmed && !list.includes(trimmed)) list.push(trimmed);
}

/**
 * Today's trucks, their companies and their transporters -- read off the docking
 * register rather than the dispatch plans.
 *
 * The docking is the only record that carries all three at once (company,
 * transporter, and the truck's real state), which is why the vendor, company and
 * vehicle panels all hang off this one query instead of three.
 *
 * Two different questions get two different windows, deliberately:
 *   - IN  = standing inside *right now*, whenever it docked. A truck that came in
 *           last Tuesday and still has not left is the most important row on the
 *           board, so it is never aged out.
 *   - OUT = cleared the gate *today*. Yesterday's departures are done business.
 * The list endpoint filters on when the docking was created, so the window
 * reaches back a week to catch the first of those; the second is filtered here.
 */
export function useDispatchDayVehicles(enabled = true): DispatchDayVehicles {
  const day = useBoardDay();

  const params = {
    from_date: shiftISO(-DOCKING_DAYS_BACK),
    to_date: day.today,
    all_companies: 1,
  };

  const query = useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.list(params),
    queryFn: () => salesDispatchApi.list(params),
    refetchInterval: DISPATCH_DAY_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: DISPATCH_DAY_REFRESH_MS,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
    enabled,
  });

  const dockings = query.data;

  const derived = useMemo(() => {
    const rows = dockings ?? [];

    // ---- collapse dockings onto physical trucks -------------------------- //
    // A truck shared by two companies is two dockings under one arrival. Group
    // on the arrival when there is one, and fall back to the plate for the
    // legacy dockings that predate arrivals.
    const truckMap = new Map<string, DayTruck>();

    for (const docking of rows) {
      if (docking.status === 'REJECTED' || docking.status === 'CANCELLED') continue;

      const key =
        docking.arrival_no || docking.vehicle_no || `entry-${docking.entry_no || docking.id}`;
      const isInside = INSIDE.has(docking.status);
      const leftOn = outDateOf(docking);

      // Dropped: dispatched before today and no longer inside -- done business.
      if (!isInside && leftOn !== day.today) continue;

      let truck = truckMap.get(key);
      if (!truck) {
        truck = {
          key,
          vehicleNo: docking.vehicle_no || '',
          arrivalNo: docking.arrival_no ?? null,
          presence: isInside ? 'IN' : 'OUT',
          status: docking.status,
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
      if (dockedAt && (!truck.inAt || dockedAt < truck.inAt)) truck.inAt = dockedAt;

      const leftAt = docking.dispatched_at ?? null;
      if (leftAt && (!truck.outAt || leftAt > truck.outAt)) truck.outAt = leftAt;
    }

    const trucks = [...truckMap.values()];
    // Anything still inside jumps a truck back to IN, so its out stamp is stale.
    for (const truck of trucks) if (truck.presence === 'IN') truck.outAt = null;

    const inside = trucks
      .filter((truck) => truck.presence === 'IN')
      // Longest inside first: the one that has been standing since morning is
      // the one somebody needs to chase.
      .sort((a, b) => (a.inAt ?? '').localeCompare(b.inAt ?? ''));
    const out = trucks
      .filter((truck) => truck.presence === 'OUT')
      .sort((a, b) => (b.outAt ?? '').localeCompare(a.outAt ?? ''));

    // ---- company and vendor slices --------------------------------------- //
    // Split per DOCKING, not per truck: a shared truck's value belongs to the
    // company whose bills it is carrying, not to whichever one sorted first.
    const companyMap = new Map<string, CompanySlice>();
    const vendorMap = new Map<string, VendorSlice>();
    // Distinct trucks per company/vendor, so a two-docking load counts once.
    const companyTrucks = new Map<string, Set<string>>();
    const vendorTrucks = new Map<string, { all: Set<string>; out: Set<string> }>();

    for (const docking of rows) {
      if (docking.status === 'REJECTED' || docking.status === 'CANCELLED') continue;
      const isInside = INSIDE.has(docking.status);
      const leftOn = outDateOf(docking);
      if (!isInside && leftOn !== day.today) continue;

      const truckKey =
        docking.arrival_no || docking.vehicle_no || `entry-${docking.entry_no || docking.id}`;
      const wentOutToday = !isInside && leftOn === day.today;

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
      }
      vendorTrucks.set(vendorName, seenForVendor);
      vendorMap.set(vendorName, vendor);
    }

    const byCompany = [...companyMap.values()].sort(
      (a, b) => b.amount - a.amount || b.trucksOut - a.trucksOut,
    );
    const byVendor = [...vendorMap.values()].sort(
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
      byCompany,
      byVendor,
      outByHour,
    };
  }, [dockings, day.today]);

  return {
    ...derived,
    isLoading: enabled && query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    updatedAt: query.dataUpdatedAt,
    refetch: () => void query.refetch(),
  };
}
