import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/core/auth';
import { dispatchFulfilmentApi } from '@/modules/dashboards/dispatch-fulfilment/api';
import type { BillRow } from '@/modules/dashboards/dispatch-fulfilment/types';

import {
  BACKLOG_OPEN_STATUSES,
  BACKLOG_PAGE_SIZE,
  DISPATCH_DAY_REFRESH_MS,
} from '../constants/dispatch-day.constants';
import { useBoardDay } from './boardDay.context';

/** One gate-out already made against a bill — a part shipment. */
export interface BacklogBillDispatch {
  docNum: string;
  status: string;
  gatepassNo: string;
  amount: number;
  weightKg: number;
  boxes: number;
  vehicleNo: string;
  gateOutDate: string | null;
  dispatchedAt: string | null;
}

/**
 * One unshipped bill.
 *
 * Carries more than the row paints, because the detail card opens from the rows
 * already in hand: the drill-down endpoint returns every one of these fields on
 * the same response the panel is drawing, so opening a bill costs no request and
 * cannot fail separately from the list it came from.
 */
export interface BacklogBill {
  id: number;
  invoiceNo: string;
  customer: string;
  place: string;
  transporter: string;
  /** Scheduled dispatch date, local YYYY-MM-DD. Never null on this list — the
   *  endpoint's window filters on this column, so an undated plan cannot match
   *  any range. Those bills are counted separately and named in the panel. */
  dispatchDate: string;
  /** Whole days between the scheduled date and today. Negative never happens
   *  here: the window ends today. */
  ageDays: number;
  /** PENDING (no truck assigned yet) or BOOKED (transporter allotted). */
  status: string;
  amount: number;
  litres: number;
  weightKg: number;
  /** No value and no quantity: a bill picked onto the plan page and abandoned
   *  before any detail was entered. A real SAP doc number, but not freight
   *  anybody is waiting on — the panel says so rather than painting three
   *  zeroes that read as a shipment worth nothing. */
  isStub: boolean;

  // --- carried for the detail card, not painted on the row ---------------- //
  /** SAP DocEntry — what the plans page and SAP itself key on. */
  docEntry: number;
  customerCode: string;
  productVariety: string;
  priority: string;
  ewayBill: string;
  vehicleNo: string;
  /** Where the truck for this bill has reached, when one is allotted. */
  dispatchStage: string | null;
  gatepassNo: string | null;
  gateOutCount: number;
  lastDispatchedAt: string | null;
  /** What has already gone out against the bill. Non-zero means a part
   *  shipment: the bill is open for the REMAINDER, not for the whole value. */
  dispatchedAmount: number;
  dispatchedWeightKg: number;
  dispatchedBoxes: number;
  /** Share of the billed value already shipped, 0-1. Null when unbilled. */
  fulfillmentRate: number | null;
  dispatches: BacklogBillDispatch[];
}

export interface DispatchBacklogBills {
  /** Oldest scheduled date first — the most overdue bill leads the panel. */
  rows: BacklogBill[];
  /** Exact open-bill count in the window, off the endpoint's own status counts,
   *  so it stays right even when `rows` is capped by the page size. */
  totalCount: number;
  pendingCount: number;
  bookedCount: number;
  /** Σ over the LOADED rows only. Equal to the window total while
   *  `isTruncated` is false; a floor on it once the page cap bites. */
  loadedAmount: number;
  loadedLitres: number;
  /** More open bills matched than the page could carry. */
  isTruncated: boolean;
  /** Open bills in the window that carry no value and no quantity. Counted
   *  server-side, so it stays right whether or not they are being shown. */
  stubCount: number;

  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/** Whole days from `from` to `to`, both local YYYY-MM-DD. */
function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * One booking status of the open backlog, for a from→today window.
 *
 * Split per status rather than fetched in one call because the drill-down
 * endpoint takes a single `booking_status`, not a set. Two small polls beat
 * pulling every DISPATCHED bill in the window and discarding it client-side —
 * on a wide window the shipped rows would crowd the open ones off the page,
 * and the page cap is the backend's, not ours to raise.
 */
function useBacklogPage(
  from: string,
  to: string,
  status: string,
  filledOnly: boolean,
  enabled: boolean,
) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: [
      'dispatch-fulfilment',
      'bills',
      currentCompany?.company_id,
      'backlog',
      status,
      { from, to, filled: filledOnly },
    ] as const,
    queryFn: () =>
      dispatchFulfilmentApi.getBills({
        from,
        to,
        status,
        limit: BACKLOG_PAGE_SIZE,
        offset: 0,
        // Oldest first, so a window wider than one page keeps the most overdue
        // bills and drops the freshest — the reverse would cut off exactly the
        // rows this panel exists to show.
        order: 'oldest',
        filled: filledOnly || undefined,
      }),
    refetchInterval: DISPATCH_DAY_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: DISPATCH_DAY_REFRESH_MS,
    retry: (failureCount, error) => {
      const httpStatus = (error as { status?: number })?.status;
      if (httpStatus === 401 || httpStatus === 403 || httpStatus === 404) return false;
      return failureCount < 2;
    },
    // Keep the old window on screen while a newly-picked date loads, so the
    // panel never blinks empty between two valid answers.
    placeholderData: keepPreviousData,
    enabled: enabled && !!from && !!to,
  });
}

/**
 * The unshipped pipeline as a bill list, for a window the viewer picks the start
 * of.
 *
 * Two things about the window are deliberate and both differ from the rest of
 * the board:
 *
 *   - It ends on the REAL today, never on the board's shown day. Back-dating the
 *     wall moves the dispatched figures because those are facts about that
 *     Tuesday; a backlog is not. "What is still owed" only has one meaningful
 *     end date, and it is now.
 *   - It filters on the SCHEDULED `dispatch_date`, not on a gate-out, because an
 *     open bill has no gate-out to anchor to. So the window reads "bills that
 *     were meant to go out between <from> and today and still have not".
 *
 * That last point is also why this cannot reuse the summary endpoint's backlog
 * total: `_backlog()` on the backend carries no date filter at all, so it can
 * only ever answer for the whole pipeline. This list is the date-bounded view of
 * the same set, and the two agree only when `from` reaches past the oldest plan.
 */
export function useDispatchBacklogBills(
  from: string,
  filledOnly = false,
  enabled = true,
): DispatchBacklogBills {
  const day = useBoardDay();
  const to = day.today;

  const pending = useBacklogPage(from, to, BACKLOG_OPEN_STATUSES.PENDING, filledOnly, enabled);
  const booked = useBacklogPage(from, to, BACKLOG_OPEN_STATUSES.BOOKED, filledOnly, enabled);

  const pendingData = pending.data;
  const bookedData = booked.data;

  return useMemo(() => {
    const toRow = (bill: BillRow): BacklogBill | null => {
      if (!bill.dispatch_date) return null;
      return {
        id: bill.id,
        invoiceNo: bill.sap_doc_num || bill.invoice_number,
        customer: bill.customer_name || bill.customer_code,
        place: bill.place_of_supply,
        transporter: bill.transporter_name,
        dispatchDate: bill.dispatch_date,
        ageDays: daysBetween(bill.dispatch_date, to),
        status: bill.booking_status,
        amount: bill.billed_amount,
        litres: bill.planned_litres,
        weightKg: bill.planned_weight,
        isStub: bill.billed_amount <= 0 && bill.planned_litres <= 0 && bill.planned_weight <= 0,

        docEntry: bill.sap_doc_entry,
        customerCode: bill.customer_code,
        productVariety: bill.product_variety,
        priority: bill.priority,
        ewayBill: bill.eway_bill,
        vehicleNo: bill.vehicle_no,
        dispatchStage: bill.dispatch_stage,
        gatepassNo: bill.gatepass_no,
        gateOutCount: bill.gateout_count,
        lastDispatchedAt: bill.last_dispatched_at,
        dispatchedAmount: bill.dispatched_amount,
        dispatchedWeightKg: bill.dispatched_weight,
        dispatchedBoxes: bill.dispatched_boxes,
        fulfillmentRate: bill.fulfillment_rate,
        dispatches: (bill.dispatches ?? []).map((d) => ({
          docNum: d.sap_doc_num,
          status: d.status,
          gatepassNo: d.gatepass_no,
          amount: d.amount,
          weightKg: d.weight,
          boxes: d.boxes,
          vehicleNo: d.vehicle_no,
          gateOutDate: d.gate_out_date,
          dispatchedAt: d.dispatched_at,
        })),
      };
    };

    const rows = [...(pendingData?.results ?? []), ...(bookedData?.results ?? [])]
      .map(toRow)
      .filter((row): row is BacklogBill => row !== null)
      // Most overdue first. The endpoint hands back newest-first and the two
      // status pages arrive separately, so the merged list has to be re-sorted
      // here whatever either page did.
      .sort((a, b) => a.dispatchDate.localeCompare(b.dispatchDate) || a.id - b.id);

    // status_counts is computed BEFORE the status filter is applied, so either
    // response carries the counts for every status in the window. Prefer
    // whichever has landed.
    const all = pendingData?.status_counts ?? bookedData?.status_counts ?? {};
    // Both count maps are computed before the status filter AND before the
    // stub filter, so they describe the same window whichever way the toggle
    // is set — which is what lets the toggle label name a number it is not
    // currently showing.
    const filled = pendingData?.filled_counts ?? bookedData?.filled_counts;
    const shown = filledOnly && filled ? filled : all;

    const pendingCount = shown[BACKLOG_OPEN_STATUSES.PENDING] ?? 0;
    const bookedCount = shown[BACKLOG_OPEN_STATUSES.BOOKED] ?? 0;

    // A backend that does not report filled_counts cannot tell us how many
    // stubs there are; zero would claim there are none, so fall back to what
    // the loaded rows show and let the panel under-report rather than lie.
    const openAll =
      (all[BACKLOG_OPEN_STATUSES.PENDING] ?? 0) + (all[BACKLOG_OPEN_STATUSES.BOOKED] ?? 0);
    const openFilled = filled
      ? (filled[BACKLOG_OPEN_STATUSES.PENDING] ?? 0) + (filled[BACKLOG_OPEN_STATUSES.BOOKED] ?? 0)
      : openAll - rows.filter((row) => row.isStub).length;

    return {
      rows,
      totalCount: pendingCount + bookedCount,
      pendingCount,
      bookedCount,
      loadedAmount: rows.reduce((sum, row) => sum + row.amount, 0),
      loadedLitres: rows.reduce((sum, row) => sum + row.litres, 0),
      isTruncated: rows.length < pendingCount + bookedCount,
      stubCount: Math.max(0, openAll - openFilled),

      isLoading: enabled && (pending.isLoading || booked.isLoading),
      isFetching: pending.isFetching || booked.isFetching,
      isError: pending.isError || booked.isError,
      error: pending.error ?? booked.error,
      refetch: () => {
        void pending.refetch();
        void booked.refetch();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pendingData,
    bookedData,
    to,
    enabled,
    filledOnly,
    pending.isLoading,
    pending.isFetching,
    pending.isError,
    pending.error,
    booked.isLoading,
    booked.isFetching,
    booked.isError,
    booked.error,
  ]);
}
