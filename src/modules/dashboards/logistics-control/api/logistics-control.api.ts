import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';
import type { DockingPartialScanRequest } from '@/modules/admin/api/partialScanApproval.api';
import type { EmployeeMeta } from '@/modules/employees/types';

import type { DispatchBill, DispatchPlansResponse } from '../../dispatch-plans/types';
import type {
  BoardSettings,
  BoardSettingsPayload,
  FreightRate,
  FreightRateTransporter,
  OwnedVehicleStatus,
  PendingGrpoBucket,
  PendingGrpoSummary,
  StockInTransit,
  TransporterAccount,
  TransporterAgeBucket,
  TransporterAwaitingBucket,
  TransporterVendorDue,
  WarehouseSettings,
  WarehouseSettingsPayload,
} from '../types';

const EP = API_ENDPOINTS.STOCK_DASHBOARD.WAREHOUSE_SETTINGS;

export const logisticsControlApi = {
  /**
   * The warehouse's rated capacity and last audit date.
   *
   * Never 404s: the backend creates the row on first read and answers nulls, so
   * an unconfigured warehouse is a normal state the board renders rather than
   * an error it has to handle.
   */
  async getWarehouseSettings(warehouse: string): Promise<WarehouseSettings> {
    const response = await apiClient.get<WarehouseSettings>(EP, {
      params: { warehouse },
    });
    return response.data;
  },

  /**
   * Save either field, or both.
   *
   * A `null` clears a figure back to unset, which is a different state from
   * zero — the backend refuses a capacity of zero outright, since it would make
   * the warehouse read as infinitely full.
   */
  async saveWarehouseSettings(
    warehouse: string,
    payload: WarehouseSettingsPayload,
  ): Promise<WarehouseSettings> {
    const response = await apiClient.put<WarehouseSettings>(EP, payload, {
      params: { warehouse },
    });
    return response.data;
  },
};

/**
 * Bills dated to leave a warehouse, pinned to one company.
 *
 * The shared `useControlPlanBills` feed asks for every company the viewer
 * belongs to, which is right for a site-wide board and wrong here: BH-BT is a
 * Jivo Oil warehouse, so a cross-company answer folds Beverages and Mart bills
 * into a tile headed with an Oil warehouse code.
 *
 * Pinned with the `Company-Code` header rather than a query parameter because
 * the bills endpoint has no company filter — the same mechanism the non-moving
 * feed uses to read one company's chart of warehouses.
 */
export async function getPendingBillsForCompany(
  companyCode: string,
  window: { date_from: string; date_to: string },
  limit: number,
): Promise<DispatchPlansResponse> {
  const response = await apiClient.get<DispatchPlansResponse>(
    API_ENDPOINTS.DISPATCH_PLANS.BILLS,
    {
      // Built the way `buildParams` in the dispatch-plans api does: flags are
      // sent as the strings the backend parses, and a flag that is off is
      // omitted rather than sent false. `all_companies` is simply absent, which
      // is what scopes this read to the header's company.
      params: {
        date_from: window.date_from,
        date_to: window.date_to,
        by_dispatch_date: 'true',
        selected_only: 'true',
        limit: String(limit),
      },
      headers: { 'Company-Code': companyCode },
    },
  );
  return response.data;
}

/** A partial-scan approval, tagged with the company it was read from. */
export interface CompanyPartialScan extends DockingPartialScanRequest {
  companyCode: string;
}

/**
 * Approved partial-scan requests across several companies.
 *
 * The register endpoint takes no company parameter — it answers for whichever
 * company the `Company-Code` header names — so a combined figure means one
 * request per company, merged here. Same reason the pending-bill feed above is
 * pinned: a board headed "Oil + Mart" showing only the signed-in company's
 * approvals is wrong in a way nobody would notice.
 *
 * A company that errors is skipped rather than failing the set, and the rows
 * carry the company they came from so a caller can tell a merged answer apart
 * from a single one.
 */
export async function getApprovedPartialScans(
  companyCodes: readonly string[],
): Promise<CompanyPartialScan[]> {
  const results = await Promise.allSettled(
    companyCodes.map(async (companyCode) => {
      const response = await apiClient.get<DockingPartialScanRequest[]>(
        API_ENDPOINTS.DOCKING_ADMIN.PARTIAL_SCAN_REQUESTS,
        { params: { status: 'APPROVED' }, headers: { 'Company-Code': companyCode } },
      );
      return (response.data ?? []).map((row) => ({ ...row, companyCode }));
    }),
  );

  return results.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );
}

/** Company-level board figures: owned vehicles and per-section staffing. */
export const boardSettingsApi = {
  async get(): Promise<BoardSettings> {
    const response = await apiClient.get<BoardSettings>(
      API_ENDPOINTS.STOCK_DASHBOARD.BOARD_SETTINGS,
    );
    return response.data;
  },

  async save(payload: BoardSettingsPayload): Promise<BoardSettings> {
    const response = await apiClient.put<BoardSettings>(
      API_ENDPOINTS.STOCK_DASHBOARD.BOARD_SETTINGS,
      payload,
    );
    return response.data;
  },
};

/** The owned fleet with today's duty state per truck. */
export async function getOwnedVehicleStatus(): Promise<OwnedVehicleStatus> {
  const response = await apiClient.get<OwnedVehicleStatus>(
    API_ENDPOINTS.STOCK_DASHBOARD.OWNED_VEHICLES,
  );
  return response.data;
}

/** Stock still on the road, by how long it has been out. */
export async function getStockInTransit(): Promise<StockInTransit> {
  const response = await apiClient.get<StockInTransit>(
    API_ENDPOINTS.STOCK_DASHBOARD.STOCK_IN_TRANSIT,
  );
  return response.data;
}

/** A day's booked bills, and the companies whose feed could not be read. */
export interface DayPlanBills {
  bills: DispatchBill[];
  /** Companies whose read failed. Their tonnage is missing from `bills`. */
  unread: string[];
}

/**
 * Every bill scheduled to leave on one day, across the board's companies.
 *
 * Windowed on the plan's own `dispatch_date` (`by_dispatch_date`) rather than
 * the SAP invoice date: the day plan is what dispatch committed to move today,
 * and an invoice raised last week for today's truck belongs to today's plan.
 *
 * `booking_status: 'all'` deliberately keeps the bills that have already gone
 * out. The plan is the whole day's commitment and must not shrink as trucks
 * clear the gate — drop the dispatched ones and the bar would fill while the
 * target fell, which reads as beating a plan that was quietly rewritten.
 *
 * One request per company with the code pinned in the header, because the bills
 * endpoint has no company filter and `all_companies` would fold in every
 * company the VIEWER belongs to — Beverages included. A company that errors is
 * named in `unread` rather than dropped silently: a partial sum reads as a
 * small day, which is the one reading this tile must not invite.
 */
export async function getDayPlanBills(
  companyCodes: readonly string[],
  date: string,
  limit: number,
): Promise<DayPlanBills> {
  const results = await Promise.allSettled(
    companyCodes.map(async (companyCode) => {
      const response = await apiClient.get<DispatchPlansResponse>(
        API_ENDPOINTS.DISPATCH_PLANS.BILLS,
        {
          params: {
            date_from: date,
            date_to: date,
            booking_status: 'all',
            by_dispatch_date: true,
            include_unscheduled: false,
            selected_only: true,
            all_companies: false,
            limit,
          },
          headers: { 'Company-Code': companyCode },
        },
      );
      return (response.data?.data ?? []).map((bill) => ({
        ...bill,
        company_code: bill.company_code ?? companyCode,
      }));
    }),
  );

  return {
    bills: results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
    unread: companyCodes.filter((_, index) => results[index].status === 'rejected'),
  };
}

/** Pending bills for one company, tagged so a merged set stays separable. */
export interface CompanyPendingBills {
  companyCode: string;
  bills: DispatchPlansResponse['data'];
  total: number;
}

/**
 * Pending bills for several companies, kept apart rather than concatenated.
 *
 * The bills endpoint takes no company parameter — it answers for whichever
 * company the `Company-Code` header names — so a combined figure means one
 * request each. They stay separate in the result because the tile shows Oil and
 * Mart side by side, and a merged list could not be split back: the bill rows
 * carry a `company_code` only on the cross-company feed, which this is not.
 *
 * A company that errors contributes nothing rather than failing the set, so one
 * bad schema cannot blank a tile that can still answer for the other.
 */
export async function getPendingBillsByCompany(
  companyCodes: readonly string[],
  window: { date_from: string; date_to: string },
  limit: number,
): Promise<CompanyPendingBills[]> {
  const results = await Promise.allSettled(
    companyCodes.map(async (companyCode) => {
      const response = await getPendingBillsForCompany(companyCode, window, limit);
      return {
        companyCode,
        bills: response.data ?? [],
        total: response.meta?.total_bills ?? 0,
      };
    }),
  );

  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}

/** One department's on-roll headcount, tagged with the company it came from. */
export interface RollDepartment {
  companyCode: string;
  name: string;
  code: string;
  /** People in service, this department only. */
  headcount: number;
  /** People in service, including every sub-department. */
  totalHeadcount: number;
}

/** On-roll employees across the board's companies. */
export interface EmployeeRoll {
  /** In-service employees, both companies added. */
  headcount: number;
  departments: RollDepartment[];
  /** Companies whose read failed — their people are missing from the total. */
  unread: string[];
}

/**
 * The permanent staff on the roll, as the employee directory holds them.
 *
 * On-roll, not on shift: the backend counts `IN_SERVICE_STATUSES` — active,
 * probation, on leave and suspended — and leaves out everyone who has resigned,
 * retired or been terminated. Somebody on leave is still on the payroll and
 * still costs a day's salary, which is what this figure is used for, so leaving
 * them out would understate the roll rather than sharpen it.
 *
 * This is a different population from the gate's labour count and the two are
 * never added into one number without saying so: labour is a daily intake that
 * turns over, employees are a standing payroll.
 *
 * `meta/` rather than `reports/`: it carries the total AND the per-department
 * counts in one call, and needs only `can_view_employees` — `reports/` sits
 * behind a workforce-reports grant a wall-board login has no reason to hold.
 *
 * One request per company, because every endpoint in that app is scoped to the
 * `Company-Code` header with no `all_companies` escape. A company that errors —
 * including the 403 a login without the employee grant will get — is named in
 * `unread` rather than silently dropped.
 */
export async function getEmployeeRoll(
  companyCodes: readonly string[],
): Promise<EmployeeRoll> {
  const results = await Promise.allSettled(
    companyCodes.map(async (companyCode) => {
      const response = await apiClient.get<EmployeeMeta>(
        API_ENDPOINTS.EMPLOYEE_HIERARCHY.META,
        { headers: { 'Company-Code': companyCode } },
      );
      return { companyCode, meta: response.data };
    }),
  );

  const read = results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  );

  return {
    headcount: read.reduce((total, row) => total + (row.meta?.headcount ?? 0), 0),
    departments: read.flatMap(({ companyCode, meta }) =>
      (meta?.departments ?? []).map((department) => ({
        companyCode,
        name: department.name,
        code: department.code,
        headcount: department.employee_count ?? 0,
        // `meta/` leaves the roll-up at its default, so a department with
        // sub-departments reports only its own people here. Carried anyway so
        // a caller that switches to `departments/` needs no reshaping.
        totalHeadcount: department.total_employee_count ?? department.employee_count ?? 0,
      })),
    ),
    unread: companyCodes.filter((_, index) => results[index].status === 'rejected'),
  };
}

/** Both companies' freight accounts, added, plus whichever could not be read. */
export interface CombinedTransporterAccount {
  /** Freight received into SAP that nobody has raised an A/P invoice against. */
  awaitingInvoice: {
    documents: number;
    /** Un-invoiced line value, pre-tax. Not addable to `outstanding`. */
    amount: number;
    oldestDays: number | null;
    buckets: TransporterAwaitingBucket[];
  };
  /** Rupees still owed on open freight invoices. */
  outstanding: number;
  /** Open freight invoices behind that figure. */
  documents: number;
  /** Invoiced in total on those documents — outstanding plus part payments. */
  billed: number;
  /** Age of the oldest unpaid freight invoice, in days. */
  oldestDays: number | null;
  /** Exclusive age buckets, both companies added band by band. */
  buckets: TransporterAgeBucket[];
  /** Who it is owed to, heaviest first, across both companies. */
  vendors: TransporterVendorDue[];
  /** Paid out to hauliers inside the window. */
  payments: { windowDays: number; payments: number; paid: number; latestDate: string | null };
  /** Companies whose read failed — their dues are missing from every figure. */
  unread: string[];
}

/**
 * What the plant owes its transporters, Oil and Mart added.
 *
 * The backend reads SAP's open A/P invoices for the TRANSPORTER vendor group
 * and its outgoing payments to the same group. Both are per company, because
 * SAP B1 gives each company its own HANA schema and no query spans them — so a
 * board headed "Oil | Mart" is two calls added here.
 *
 * Deliberately NOT joined to this plant's bilties. SAP has the user fields for
 * it, but on the live books `U_BilltyNumber` is filled on 3 of 387 open
 * transporter invoices, so a per-bilty answer would drop almost all the money.
 * The figure is therefore every rupee of freight the company owes, including
 * invoices accounts entered directly in SAP — which is what "transporter
 * account" means to the person asking.
 */
export async function getTransporterAccount(
  companyCodes: readonly string[],
  paymentDays: number,
): Promise<CombinedTransporterAccount> {
  const results = await Promise.allSettled(
    companyCodes.map(async (companyCode) => {
      const response = await apiClient.get<TransporterAccount>(
        API_ENDPOINTS.DISPATCH.TRANSPORTER_ACCOUNT,
        {
          params: { payment_days: paymentDays },
          headers: { 'Company-Code': companyCode },
        },
      );
      return response.data;
    }),
  );

  const read = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));

  // Added band by band rather than concatenated: the two companies answer the
  // same four buckets, and a board drawing one row per band needs one row.
  const buckets = new Map<number, TransporterAgeBucket>();
  for (const account of read) {
    for (const bucket of account.outstanding?.buckets ?? []) {
      const merged = buckets.get(bucket.band);
      if (!merged) {
        buckets.set(bucket.band, { ...bucket });
        continue;
      }
      merged.documents += bucket.documents;
      merged.outstanding += bucket.outstanding;
      merged.billed += bucket.billed;
      merged.paid += bucket.paid;
      merged.oldest_days = maxOrNull(merged.oldest_days, bucket.oldest_days);
    }
  }

  const vendors = read
    .flatMap((account) => account.vendors ?? [])
    // Same haulier under two card codes is two rows on purpose: the codes are
    // per company and settle separately, so merging them would name a debt
    // nobody can pay in one cheque.
    .sort((a, b) => b.outstanding - a.outstanding);

  const latestDates = read
    .map((account) => account.payments?.latest_date ?? null)
    .filter((date): date is string => Boolean(date))
    .sort();

  // Same band-by-band merge as the payables, over a different document type.
  const awaiting = new Map<number, TransporterAwaitingBucket>();
  for (const account of read) {
    for (const bucket of account.awaiting_invoice?.buckets ?? []) {
      const merged = awaiting.get(bucket.band);
      if (!merged) {
        awaiting.set(bucket.band, { ...bucket });
        continue;
      }
      merged.documents += bucket.documents;
      merged.amount += bucket.amount;
      merged.oldest_days = maxOrNull(merged.oldest_days, bucket.oldest_days);
    }
  }

  return {
    awaitingInvoice: {
      documents: read.reduce((sum, a) => sum + (a.awaiting_invoice?.documents ?? 0), 0),
      amount: read.reduce((sum, a) => sum + (a.awaiting_invoice?.amount ?? 0), 0),
      oldestDays: read.reduce<number | null>(
        (oldest, a) => maxOrNull(oldest, a.awaiting_invoice?.oldest_days ?? null),
        null,
      ),
      buckets: [...awaiting.values()].sort((a, b) => a.band - b.band),
    },
    outstanding: read.reduce((sum, a) => sum + (a.outstanding?.outstanding ?? 0), 0),
    documents: read.reduce((sum, a) => sum + (a.outstanding?.documents ?? 0), 0),
    billed: read.reduce((sum, a) => sum + (a.outstanding?.billed ?? 0), 0),
    oldestDays: read.reduce<number | null>(
      (oldest, a) => maxOrNull(oldest, a.outstanding?.oldest_days ?? null),
      null,
    ),
    buckets: [...buckets.values()].sort((a, b) => a.band - b.band),
    vendors,
    payments: {
      windowDays: read[0]?.payments?.window_days ?? paymentDays,
      payments: read.reduce((sum, a) => sum + (a.payments?.payments ?? 0), 0),
      paid: read.reduce((sum, a) => sum + (a.payments?.paid ?? 0), 0),
      latestDate: latestDates.length > 0 ? latestDates[latestDates.length - 1] : null,
    },
    unread: companyCodes.filter((_, index) => results[index].status === 'rejected'),
  };
}

/** The later of two ages, where either may be unknown. */
function maxOrNull(left: number | null, right: number | null): number | null {
  if (left === null) return right;
  if (right === null) return left;
  return Math.max(left, right);
}

/** Both companies' pending service-GRPO queues, added. */
export interface CombinedPendingGrpo {
  documents: number;
  amount: number;
  unpriced: number;
  undated: number;
  ready: number;
  oldestDays: number | null;
  buckets: PendingGrpoBucket[];
  /** Companies whose read failed — their queue is missing from every figure. */
  unread: string[];
}

/**
 * How many service GRPOs are waiting to be posted, Oil and Mart added.
 *
 * Deliberately NOT the queue endpoint the Service GRPO page renders. That one
 * is paginated at 25 and scopes its dispatched half to the current month, both
 * for good reasons — it serves rows, and each row costs a SAP bill-header
 * snapshot. Counting its `results` gives 25 however long the queue is, and its
 * month bound makes an age band past a fortnight structurally empty: on the
 * 12th of a month nothing dispatched can be older than 11 days.
 *
 * This reads the aggregate instead — the whole backlog, grouped by bilty the
 * same way the queue groups it, with no SAP work at all.
 */
export async function getPendingGrpoSummary(
  companyCodes: readonly string[],
): Promise<CombinedPendingGrpo> {
  const results = await Promise.allSettled(
    companyCodes.map(async (companyCode) => {
      const response = await apiClient.get<PendingGrpoSummary>(
        API_ENDPOINTS.GRPO.SERVICE_PENDING_SUMMARY,
        { headers: { 'Company-Code': companyCode } },
      );
      return response.data;
    }),
  );

  const read = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));

  const buckets = new Map<number, PendingGrpoBucket>();
  for (const summary of read) {
    for (const bucket of summary.buckets ?? []) {
      const merged = buckets.get(bucket.band);
      if (!merged) {
        buckets.set(bucket.band, { ...bucket, unpriced: bucket.unpriced ?? 0 });
        continue;
      }
      merged.documents += bucket.documents;
      merged.amount += bucket.amount;
      // Every field the bucket carries has to add, or the merged band reports
      // only the first company that answered.
      merged.unpriced += bucket.unpriced ?? 0;
    }
  }

  return {
    documents: read.reduce((sum, s) => sum + (s.documents ?? 0), 0),
    amount: read.reduce((sum, s) => sum + (s.amount ?? 0), 0),
    unpriced: read.reduce((sum, s) => sum + (s.unpriced ?? 0), 0),
    undated: read.reduce((sum, s) => sum + (s.undated ?? 0), 0),
    ready: read.reduce((sum, s) => sum + (s.ready ?? 0), 0),
    oldestDays: read.reduce<number | null>(
      (oldest, s) => maxOrNull(oldest, s.oldest_days ?? null),
      null,
    ),
    buckets: [...buckets.values()].sort((a, b) => a.band - b.band),
    unread: companyCodes.filter((_, index) => results[index].status === 'rejected'),
  };
}

/** Both companies' freight rates, added before dividing. */
export interface CombinedFreightRate {
  amount: number;
  documents: number;
  vendors: number;
  byTransporter: FreightRateTransporter[];
  unread: string[];
}

/**
 * What a litre cost to move, Oil and Mart added.
 *
 * Added BEFORE dividing, never an average of two rates: the companies move very
 * different volumes, and averaging their rates would weight a small company's
 * freight as heavily as a large one's.
 *
 * The money is SAP's alone — the pre-tax line total of every outbound-freight
 * service GRPO in the window, read straight off OPDN/PDN1. This app's own
 * posting records are deliberately not consulted: GRPOs are also entered
 * directly in SAP and a write-back can fail, so the local rows are a subset
 * that reported zero for a month SAP had 15.87 lakh in.
 *
 * The litres are the caller's — the app's dispatch figures for the same window.
 */
export async function getFreightRate(
  companyCodes: readonly string[],
  dateFrom: string,
  dateTo: string,
): Promise<CombinedFreightRate> {
  const results = await Promise.allSettled(
    companyCodes.map(async (companyCode) => {
      const response = await apiClient.get<FreightRate>(API_ENDPOINTS.DISPATCH.FREIGHT_RATE, {
        params: { date_from: dateFrom, date_to: dateTo },
        headers: { 'Company-Code': companyCode },
      });
      return response.data;
    }),
  );

  const read = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));

  // Same haulier under both companies is one row. Keyed on the NAME, not the
  // card code: the codes are per company, so the same firm legitimately holds
  // a different one in each, and a reader comparing hauliers wants one line.
  const byName = new Map<string, FreightRateTransporter>();
  for (const company of read) {
    for (const row of company.by_transporter ?? []) {
      const merged = byName.get(row.transporter_name);
      if (!merged) {
        byName.set(row.transporter_name, { ...row });
        continue;
      }
      merged.amount += row.amount;
      merged.documents += row.documents;
    }
  }

  return {
    amount: read.reduce((sum, c) => sum + (c.amount ?? 0), 0),
    documents: read.reduce((sum, c) => sum + (c.documents ?? 0), 0),
    vendors: byName.size,
    byTransporter: [...byName.values()].sort((a, b) => b.amount - a.amount),
    unread: companyCodes.filter((_, index) => results[index].status === 'rejected'),
  };
}
