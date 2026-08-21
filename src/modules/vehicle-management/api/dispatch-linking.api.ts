import { addDays, format, parseISO, subDays } from 'date-fns';

import { dispatchPlansApi } from '@/modules/dashboards/dispatch-plans/api';
import type { DispatchBill, DispatchPlanStatus } from '@/modules/dashboards/dispatch-plans/types';

import type {
  DispatchLinkingFilters,
  DispatchLinkingResponse,
  DispatchVehicleLinkPayload,
} from '../types';

const LOOKBACK_DAYS = 365;
const LOOKAHEAD_DAYS = 90;

function buildSourceDateRange(date: string) {
  const base = parseISO(date);
  return {
    date_from: format(subDays(base, LOOKBACK_DAYS), 'yyyy-MM-dd'),
    date_to: format(addDays(base, LOOKAHEAD_DAYS), 'yyyy-MM-dd'),
  };
}

function compareDate(value: string | null, target: string) {
  if (!value) return 0;
  if (value < target) return -1;
  if (value > target) return 1;
  return 0;
}

function isClosed(status: DispatchPlanStatus) {
  return status === 'DISPATCHED' || status === 'CANCELLED';
}

function matchesBucket(bill: DispatchBill, filters: DispatchLinkingFilters) {
  const dispatchDate = bill.plan.dispatch_date;
  if (!dispatchDate) return false;

  const cmp = compareDate(dispatchDate, filters.date);
  if (filters.bucket === 'today') return cmp === 0;
  if (filters.bucket === 'overdue') return cmp < 0 && !isClosed(bill.plan.booking_status);
  if (filters.bucket === 'upcoming') return cmp > 0;
  return true;
}

function matchesStatus(bill: DispatchBill, status: DispatchPlanStatus | 'all' | undefined) {
  if (!status || status === 'all') return true;
  return bill.plan.booking_status === status;
}

function buildMeta(allDispatchDated: DispatchBill[], visible: DispatchBill[], targetDate: string) {
  return {
    total: allDispatchDated.length,
    today: allDispatchDated.filter((bill) => bill.plan.dispatch_date === targetDate).length,
    overdue: allDispatchDated.filter(
      (bill) =>
        compareDate(bill.plan.dispatch_date, targetDate) < 0 && !isClosed(bill.plan.booking_status),
    ).length,
    upcoming: allDispatchDated.filter(
      (bill) => compareDate(bill.plan.dispatch_date, targetDate) > 0,
    ).length,
    pending: visible.filter((bill) => bill.plan.booking_status === 'PENDING').length,
    booked: visible.filter((bill) => bill.plan.booking_status === 'BOOKED').length,
    dispatched: visible.filter((bill) => bill.plan.booking_status === 'DISPATCHED').length,
    cancelled: visible.filter((bill) => bill.plan.booking_status === 'CANCELLED').length,
  };
}

export const dispatchLinkingApi = {
  async getPlans(filters: DispatchLinkingFilters): Promise<DispatchLinkingResponse> {
    const sourceDateRange = buildSourceDateRange(filters.date);
    const response = await dispatchPlansApi.getBills({
      ...sourceDateRange,
      booking_status: filters.booking_status,
      search: filters.search,
      limit: filters.limit ?? 2000,
    });

    const allDispatchDated = response.data.filter((bill) => Boolean(bill.plan.dispatch_date));
    const visible = allDispatchDated
      .filter((bill) => matchesBucket(bill, filters))
      .filter((bill) => matchesStatus(bill, filters.booking_status));

    return {
      data: visible,
      meta: buildMeta(allDispatchDated, visible, filters.date),
    };
  },

  // `companyCode` is set only by the cross-company caller (Vehicle Linking): each
  // bill's plan lives in its own company, so the write names that company.
  async linkVehicle(
    docEntry: number,
    payload: DispatchVehicleLinkPayload,
    companyCode?: string,
  ) {
    return dispatchPlansApi.updatePlan(docEntry, payload, companyCode);
  },

  // Clear a booking so the vehicle can be re-assigned to another invoice.
  // Resets the plan to PENDING and drops the transport assignment; the backend
  // wipes the snapshot fields (vehicle_no, transporter/driver details) once the
  // ids are explicitly nulled.
  async unlinkVehicle(docEntry: number, companyCode?: string) {
    return dispatchPlansApi.updatePlan(
      docEntry,
      {
        vehicle_id: null,
        transporter_id: null,
        driver_id: null,
        linked_vehicle_entry_id: null,
        booking_status: 'PENDING',
      },
      companyCode,
    );
  },
};
