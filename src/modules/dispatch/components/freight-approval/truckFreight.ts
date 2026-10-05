/**
 * A truck's freight against its benchmark, worked out on the linking screen as
 * the desk types — the same arithmetic the server does when it records it
 * (`dispatch_plans/freight_approval_service.py`), which has the last word.
 *
 * The slab follows the vehicle's capacity until the desk picks one: the
 * destination's rated slab whose band holds it. A per-kg rate is multiplied by
 * the bills' weight, and by the capacity only when the bills carry none.
 */
import type {
  DispatchFreightApproval,
  TruckFreightBill,
  TruckFreightInput,
} from '../../api/freightApproval.api';
import type {
  FreightBenchmarkRate,
  FreightBenchmarkTable,
  FreightDestination,
  FreightSlab,
} from '../../types/freightBenchmark.types';

export interface TruckFreightDraft {
  destinationId: number | null;
  /** Only set once the desk has picked a slab; until then it follows capacity. */
  slabId: number | null;
  actual: string;
  reason: string;
  /** False until the desk (or the truck's existing freight) has filled anything in. */
  touched: boolean;
}

export const EMPTY_TRUCK_FREIGHT: TruckFreightDraft = {
  destinationId: null,
  slabId: null,
  actual: '',
  reason: '',
  touched: false,
};

export function draftFromApproval(approval: DispatchFreightApproval): TruckFreightDraft {
  return {
    destinationId: approval.destination,
    // Carried over only when the desk had chosen it; otherwise it keeps
    // following the capacity, which is what it did last time too.
    slabId: approval.suggested_slab === approval.slab ? null : approval.slab,
    actual: String(approval.actual_freight),
    reason: approval.reason,
    touched: true,
  };
}

export interface TruckFreightQuote {
  destination: FreightDestination | null;
  /** The slab in force: the desk's pick, else the suggestion. */
  slab: FreightSlab | null;
  suggestedSlab: FreightSlab | null;
  rate: FreightBenchmarkRate | null;
  /** The weight a per-kg rate is multiplied by. */
  weightKg: number | null;
  benchmark: number | null;
  actual: number | null;
  /** Over the benchmark, or no benchmark to be under: needs an approver. */
  needsApproval: boolean;
}

export function capacityKgOf(capacityTon: string | number | null | undefined): number | null {
  const tons = Number(capacityTon);
  return Number.isFinite(tons) && tons > 0 ? Math.round(tons * 1000) : null;
}

export function quoteTruckFreight(
  table: FreightBenchmarkTable | undefined,
  draft: TruckFreightDraft,
  capacityKg: number | null,
  loadKg: number | null,
): TruckFreightQuote {
  const destination = table?.destinations.find((d) => d.id === draft.destinationId) ?? null;
  const slabs = table?.slabs ?? [];
  const rated = destination
    ? destination.rates
        .map((rate) => slabs.find((s) => s.id === rate.slab))
        .filter((s): s is FreightSlab => Boolean(s && s.is_active))
    : [];
  const suggestedSlab =
    capacityKg === null
      ? null
      : (rated.find((s) => s.above_kg < capacityKg && capacityKg <= s.up_to_kg) ?? null);
  const slab =
    (draft.slabId !== null ? slabs.find((s) => s.id === draft.slabId) : suggestedSlab) ?? null;
  const rate =
    destination && slab ? (destination.rates.find((r) => r.slab === slab.id) ?? null) : null;

  let weightKg: number | null = null;
  let benchmark: number | null = null;
  if (rate?.basis === 'PER_KG') {
    weightKg = loadKg && loadKg > 0 ? loadKg : capacityKg;
    benchmark = weightKg ? Math.round(rate.amount * weightKg * 100) / 100 : null;
  } else if (rate) {
    benchmark = rate.amount;
  }

  const typed = draft.actual.trim();
  const actual = typed === '' ? null : Number(typed);
  const needsApproval =
    actual !== null && Number.isFinite(actual) && (benchmark === null || actual > benchmark);
  return { destination, slab, suggestedSlab, rate, weightKg, benchmark, actual, needsApproval };
}

/** What stops the freight being saved, in words; empty when it can be. */
export function truckFreightProblem(draft: TruckFreightDraft, quote: TruckFreightQuote): string {
  if (!quote.destination) return 'Pick where the truck is going, from the Freight Benchmarks.';
  if (!quote.slab) return 'Pick the slab the truck is running as.';
  if (quote.actual === null) return 'Enter the freight agreed for the truck.';
  if (!Number.isFinite(quote.actual) || quote.actual < 0) return 'The freight is an amount in ₹.';
  if (quote.needsApproval && !draft.reason.trim()) {
    return quote.benchmark === null
      ? `${quote.destination.name} has no benchmark for ${quote.slab.label}, so the freight needs approving. Say why it is what it is.`
      : 'The freight is over the benchmark. Say why, for the approver.';
  }
  return '';
}

export function toTruckFreightInput(
  vehicleId: number,
  draft: TruckFreightDraft,
  quote: TruckFreightQuote,
  bills: TruckFreightBill[],
  extend: boolean,
): TruckFreightInput {
  return {
    vehicle_id: vehicleId,
    destination_id: quote.destination!.id,
    slab_id: quote.slab!.id,
    actual_freight: draft.actual.trim(),
    reason: quote.needsApproval ? draft.reason.trim() : '',
    bills,
    extend,
  };
}

/** How the truck's bills are named to the freight endpoint. */
export function freightBillsOf(
  bills: { company_code?: string | null; doc_entry: number }[],
): TruckFreightBill[] {
  return bills.map((bill) => ({
    company_code: bill.company_code ?? '',
    doc_entry: bill.doc_entry,
  }));
}
