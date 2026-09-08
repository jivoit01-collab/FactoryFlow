import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';

// ============================================================================
// Pallet space
// ============================================================================

/** Pallet-slot occupancy for one warehouse. */
export interface PalletSpaceWarehouseRow {
  warehouseId: string;
  code: string;
  name: string;
  /** Pallet slots across every enabled, stock-holding cell. */
  totalSpace: number;
  /** Slots occupied by a pallet that is physically placed. */
  usedSpace: number;
  /** Slots in blocked / damaged / under-maintenance cells — real but unusable. */
  unavailableSpace: number;
  /** `totalSpace - usedSpace - unavailableSpace`, floored at zero. */
  freeSpace: number;
  /** `usedSpace / totalSpace` as a percentage (0 when the warehouse has no space). */
  utilisationPct: number;
  storageLocations: number;
  /** Cells with no configured max-pallet capacity, counted as one slot each. */
  locationsWithoutCapacity: number;
}

/**
 * One product standing in the racking, totalled across every pallet holding it.
 *
 * The pallet-space numbers say how full the warehouse is; this says what it is
 * full *of* — "CANOLA 4 LTR, 500 boxes on 12 pallets".
 */
export interface StoredGoodsRow {
  itemCode: string;
  itemName: string;
  /** Pallets carrying this item. */
  pallets: number;
  /** Boxes across those pallets. */
  boxes: number;
}

/** Company-wide pallet space, plus the per-warehouse rows behind it. */
export interface PalletSpaceSummary {
  totalSpace: number;
  usedSpace: number;
  unavailableSpace: number;
  freeSpace: number;
  utilisationPct: number;
  /** Live pallets sitting at no location — they hold stock but no rack slot. */
  unplacedPallets: number;
  locationsWithoutCapacity: number;
  warehouses: PalletSpaceWarehouseRow[];
  /** What is on the pallets, heaviest line first. */
  goods: StoredGoodsRow[];
  /** Boxes across every placed pallet. */
  totalBoxes: number;
}

// ============================================================================
// Vehicle linking
// ============================================================================

/** One truck on the board: a vehicle plus every bill currently booked onto it. */
export interface ControlLinkedTruck {
  vehicleId: number;
  vehicleNo: string;
  transporterName: string;
  driverName: string;
  /** Companies whose bills ride on this truck — one truck, many companies. */
  companyCodes: string[];
  dispatchDates: string[];
  bills: DispatchBill[];
  totals: {
    litres: number;
    weight: number;
    amount: number;
    boxes: number;
  };
  /** Every bill on the truck is frozen by a completed empty-vehicle gate-in. */
  isLocked: boolean;
  /** Bills on this truck that have already gone out. */
  dispatchedBills: number;
  /** The whole load has gone — the truck has left. */
  isDispatched: boolean;
}

/**
 * Today's linked work, folded two ways from one read of the Bills Linking feed.
 *
 * `linkedBills` is the bill-side view — one row per bill, each naming the truck
 * it rides on. `trucks` is the same set transposed — one card per vehicle. The
 * board shows both because that is the pair of questions the floor asks: "which
 * truck is this bill on" and "what is on this truck".
 *
 * Dispatched bills stay in both views rather than vanishing: half of reading a
 * day's board is seeing what has already left, and a load that disappears the
 * moment it is gated out looks like a load that was never planned. They are
 * marked, and sorted behind the work still to do.
 */
export interface ControlLinkingBoard {
  /** Vehicles carrying at least one bill dated today. */
  trucks: ControlLinkedTruck[];
  /** Today's bills that have a vehicle attached, newest bill number first. */
  linkedBills: DispatchBill[];
  counts: {
    trucksToday: number;
    /** Today's bills carrying a vehicle, dispatched ones included. */
    linkedBillsToday: number;
    /** Of those, the ones that have already gone out. */
    dispatchedBillsToday: number;
    /** Trucks whose whole load has gone. */
    dispatchedTrucksToday: number;
    /** Today's dated bills still holding no vehicle. */
    unlinkedToday: number;
  };
  totals: {
    litres: number;
    boxes: number;
    amount: number;
  };
}

// ============================================================================
// Scheduled-but-not-dispatched queue (Dispatch Plans feed)
// ============================================================================

/**
 * Bills that carry a dispatch date and are still waiting for a truck.
 *
 * Read from the Dispatch Plans feed rather than the linking feed: the question
 * is whether the plan has been acted on, and the Plans page is where the date
 * gets filled in. Bills already booked onto a vehicle are excluded — they show
 * on the Vehicle Linking and Today's Bills panels instead.
 */
export interface ControlScheduledQueue {
  /** Overdue first, then today, then upcoming. */
  rows: DispatchBill[];
  counts: {
    /** Rows in the queue — scheduled and unbooked. */
    total: number;
    overdue: number;
    today: number;
    upcoming: number;
    /** Scheduled bills kept out of the queue because a truck is already on them. */
    alreadyBooked: number;
  };
}
