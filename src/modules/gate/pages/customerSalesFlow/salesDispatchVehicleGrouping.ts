import type { SalesDispatchDashboardEntry } from '@/modules/gate/api/salesDispatch/salesDispatch.api';

/**
 * One physical truck's docking rows, grouped so the board can show a single
 * expandable entry per vehicle instead of one row per company record.
 *
 * A cross-company truck is modelled as one `VehicleArrival` threading the
 * per-company `SalesDispatchGateOut` rows; grouping is presentational only —
 * each company keeps its own docking record + SAP gate pass underneath.
 */
export interface DockingVehicleGroup {
  key: string;
  vehicle: number | null;
  vehicleNo: string;
  arrivalNo: string | null;
  companies: string[];
  subEntries: SalesDispatchDashboardEntry[];
}

// A docking in one of these states is a finished/closed trip. Its physical truck
// is gone, so it must never fold together with other rows by vehicle -- otherwise
// a truck's past dispatches (all arrival-less once departed) collapse into one
// misleading dropdown under some unrelated arrival.
const TERMINAL_DOCKING_STATUSES = new Set(['DISPATCHED', 'REJECTED', 'CANCELLED']);

function isTerminal(entry: SalesDispatchDashboardEntry): boolean {
  const status = 'status' in entry ? entry.status : null;
  return typeof status === 'string' && TERMINAL_DOCKING_STATUSES.has(status);
}

function entryArrivalId(entry: SalesDispatchDashboardEntry): number | null {
  return 'arrival' in entry && entry.arrival != null ? entry.arrival : null;
}

function entryArrivalNo(entry: SalesDispatchDashboardEntry): string | null {
  return ('arrival_no' in entry && entry.arrival_no) || null;
}

function vehicleKey(entry: SalesDispatchDashboardEntry): string {
  return entry.vehicle != null ? `veh:${entry.vehicle}` : `vno:${entry.vehicle_no ?? ''}`;
}

/**
 * Group key: prefer the arrival (keeps two distinct trips of one vehicle apart
 * and folds cross-company siblings together); fall back to the vehicle for
 * legacy/arrival-less rows. `vehicleToArrival` lets arrival-less rows (pending
 * bookings) join the same group as their truck's docked rows.
 */
export function dockingGroupKey(
  entry: SalesDispatchDashboardEntry,
  vehicleToArrival: Map<string, string>,
): string {
  const arrivalId = entryArrivalId(entry);
  if (arrivalId != null) return `arv:${arrivalId}`;
  // Arrival-less + terminal = a finished trip on its own; give it a unique key so
  // it renders as its own row instead of gluing onto the truck's other rows.
  if (isTerminal(entry)) return `done:${entry.id}`;
  // Live arrival-less rows (pending bookings, in-flight dockings) fold onto their
  // truck's open arrival group.
  const vkey = vehicleKey(entry);
  return vehicleToArrival.get(vkey) ?? vkey;
}

export function buildDockingVehicleGroups(
  entries: SalesDispatchDashboardEntry[],
): DockingVehicleGroup[] {
  const vehicleToArrival = new Map<string, string>();
  for (const entry of entries) {
    const arrivalId = entryArrivalId(entry);
    // Only a LIVE arrival can adopt a vehicle's arrival-less rows -- a departed
    // (terminal) trip must not absorb a later pending booking for the same truck.
    if (arrivalId != null && !isTerminal(entry)) {
      const vkey = vehicleKey(entry);
      if (!vehicleToArrival.has(vkey)) vehicleToArrival.set(vkey, `arv:${arrivalId}`);
    }
  }

  const groups = new Map<string, DockingVehicleGroup>();
  const order: string[] = [];
  for (const entry of entries) {
    const key = dockingGroupKey(entry, vehicleToArrival);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        vehicle: entry.vehicle ?? null,
        vehicleNo: entry.vehicle_no || '',
        arrivalNo: entryArrivalNo(entry),
        companies: [],
        subEntries: [],
      };
      groups.set(key, group);
      order.push(key);
    }
    group.subEntries.push(entry);
    if (!group.vehicleNo && entry.vehicle_no) group.vehicleNo = entry.vehicle_no;
    if (!group.arrivalNo) group.arrivalNo = entryArrivalNo(entry);
    const company = entry.company_name || entry.company_code;
    if (company && !group.companies.includes(company)) group.companies.push(company);
  }
  return order.map((key) => groups.get(key)!);
}
