import type { DispatchTotals } from '../types';

/** One dispatch as one company's feed reports it. */
export interface DispatchRow {
  /** The vehicle arrival this dispatch belongs to — the cross-company identity. */
  arrivalId: number | null;
  /** Vehicle registration, the fallback identity where no arrival is recorded. */
  vehicleNo: string;
  /** SAP document entries on this dispatch. */
  invoiceDocEntries: readonly number[];
  /** Local calendar date of the gate-out, `YYYY-MM-DD`. */
  gateOutDate: string;
  /** Kilograms on this dispatch. */
  kg: number;
  /** The company whose schema reported it. */
  companyCode: string;
  /** Whether the customer is a group company. */
  intercompany: boolean;
}

/**
 * Combine Oil and Mart into one set of dispatch figures.
 *
 * Three corrections happen here, and every one of them is silent when skipped:
 *
 *   1. **Intercompany bills come out.** In August 2026, 66% of Oil's invoiced
 *      finished-goods pieces went to group companies. Summing both schemas raw
 *      reports internal transfers as dispatch — not a rounding error, a
 *      majority of the number.
 *   2. **Vehicles are de-duplicated, not added.** A docking is per company, so
 *      one truck carrying both companies' bills is two rows under one vehicle
 *      arrival. Counted on the arrival where there is one, falling back to the
 *      registration — which is why the fallback exists at all: legacy rows
 *      carry no arrival.
 *   3. **Invoices are de-duplicated on the SAP document entry.** A part-shipped
 *      bill travelling on two trucks is one invoice, and the backend's own
 *      count gets this wrong in both directions — the docking header reports
 *      only its first document, while summing document counts double-counts the
 *      split bill.
 *
 * Weight is added rather than de-duplicated: two trucks carrying halves of one
 * bill did carry the whole bill between them.
 */
export function combineDispatch(rows: readonly DispatchRow[]): DispatchTotals {
  const arrivals = new Set<string>();
  const invoices = new Set<number>();
  const activeDays = new Set<string>();
  let kg = 0;

  for (const row of rows) {
    if (row.intercompany) continue;

    kg += row.kg;

    // Prefer the arrival: it is the one identity both companies' dockings share.
    arrivals.add(
      row.arrivalId !== null
        ? `arrival:${row.arrivalId}`
        : `vehicle:${row.vehicleNo.trim().toUpperCase()}`,
    );

    for (const docEntry of row.invoiceDocEntries) invoices.add(docEntry);

    if (row.gateOutDate) activeDays.add(row.gateOutDate);
  }

  return {
    kg,
    vehicles: arrivals.size,
    invoices: invoices.size,
    activeDays: activeDays.size,
  };
}

/**
 * Average dispatch per day, over the days that actually dispatched.
 *
 * The divisor is days with at least one dispatch, not calendar days elapsed —
 * so the figure reads as a normal working day's output and does not sag over a
 * month with Sundays and shutdowns in it. Null when nothing has moved: a wall
 * showing "0.0 t/day" on the first of the month implies a bad month rather than
 * an empty one.
 */
export function averagePerActiveDay(totals: DispatchTotals): number | null {
  if (totals.activeDays === 0) return null;
  return totals.kg / 1000 / totals.activeDays;
}

/** A planned bill, as the day-plan feed reports it. */
export interface DayPlanBill {
  /** Kilograms on the bill. */
  weightKg: number;
  /** The vehicle linked to the plan, or null where none is. */
  vehicleId: number | null;
}

/** Today's committed tonnage and the bills behind it. */
export interface DayPlan {
  tonnes: number;
  bills: number;
  /** Bills dated for today that nobody has put on a truck yet. */
  unbookedBills: number;
}

/**
 * What the day is committed to move — booked bills only.
 *
 * Booked means a vehicle is actually linked to the plan, read off `vehicle_id`
 * rather than the booking status: the status is client-writable and drifts,
 * while the link is the fact underneath it. A bill dated for today with no
 * truck against it is a plan somebody still has to arrange, not tonnage the
 * gate can be measured against — so it is counted separately and left out of
 * the target.
 *
 * Bills already dispatched stay in. The plan is the whole day's commitment and
 * must not shrink as trucks leave, or the bar would fill while the target fell.
 */
export function dayPlan(bills: readonly DayPlanBill[]): DayPlan {
  const booked = bills.filter((bill) => bill.vehicleId != null);

  return {
    tonnes: booked.reduce((total, bill) => total + (bill.weightKg || 0), 0) / 1000,
    bills: booked.length,
    unbookedBills: bills.length - booked.length,
  };
}

/** Today measured against yesterday, as a signed percentage. */
export interface DayOnDay {
  /** Magnitude of the change, always positive. */
  pct: number;
  direction: 'up' | 'down' | 'flat';
}

/**
 * Today against the same point yesterday.
 *
 * Null when yesterday moved nothing: a percentage against zero is infinite, and
 * "+100%" on a board would read as a doubled day rather than a restarted one.
 * Flat below half a percent, because a wall board redrawing an arrow over
 * rounding noise trains the floor to ignore it.
 *
 * Yesterday is a whole day and today is a day in progress, so this comparison
 * runs behind until the last truck is out. That is stated on the tile — a
 * morning reading of "-60%" is not a bad day, it is half past ten.
 */
export function dayOnDay(todayTonnes: number, yesterdayTonnes: number): DayOnDay | null {
  if (!(yesterdayTonnes > 0)) return null;

  const change = ((todayTonnes - yesterdayTonnes) / yesterdayTonnes) * 100;
  if (Math.abs(change) < 0.5) return { pct: 0, direction: 'flat' };
  return { pct: Math.abs(change), direction: change > 0 ? 'up' : 'down' };
}

/** What a litre costs to get out of the gate, and how much of the window the
 *  figure actually speaks for. */
export interface CostPerLitre {
  /** Freight paid to hauliers, per litre. */
  freight: number;
  /** The plant's own loading cost, per litre. A configured rate, not measured. */
  loading: number;
  /** The two added — what the tile shows. */
  total: number;
  /** Litres whose freight is known. */
  coveredLitres: number;
  /** Litres dispatched in the window, whether or not their freight is known. */
  windowLitres: number;
  /** Share of the window's litres the freight half is derived from, 0-100. */
  coveragePct: number;
}

/**
 * Cost to move a litre: the bilty half measured, the loading half configured.
 *
 * The freight half is a real division — rupees of freight over the litres those
 * same bilties carried. Both come off the same set of plans, which is the whole
 * difficulty: freight is stored once per bilty and litres once per truck, so a
 * bilty split across two trucks has one amount and two rows of litres, and any
 * ratio that mixes the two populations is a fiction.
 *
 * Plans with no freight typed are excluded from both halves upstream. That is
 * the honest treatment, but it makes the figure a SAMPLE of the window rather
 * than the whole of it — so coverage comes back with the rate and a caller that
 * cannot show it should not show the rate.
 *
 * The loading half is a configured paise-per-litre, not a measurement: nothing
 * in this system meters what loading a litre costs. It is added rather than
 * folded in so the tile can show which half is which.
 *
 * Null when no litres are covered. A rate divided by nothing is not a cost of
 * zero, and on a wall "₹0.80 per litre" would read as freight being free.
 */
export function costPerLitre(
  freightAmount: number,
  coveredLitres: number,
  windowLitres: number,
  loadingPerLitre: number,
): CostPerLitre | null {
  if (!(coveredLitres > 0)) return null;

  const freight = freightAmount / coveredLitres;

  return {
    freight,
    loading: loadingPerLitre,
    total: freight + loadingPerLitre,
    coveredLitres,
    windowLitres,
    coveragePct: windowLitres > 0 ? Math.min(100, (coveredLitres / windowLitres) * 100) : 0,
  };
}
