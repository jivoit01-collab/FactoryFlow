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
}

/** The linking half of the board, derived from one shared bills feed. */
export interface ControlLinkingBoard {
  /** Trucks carrying at least one bill dated today. */
  trucks: ControlLinkedTruck[];
  /** Dated, still-open bills with no vehicle — today first, then overdue. */
  pending: DispatchBill[];
  counts: {
    trucksToday: number;
    linkedBillsToday: number;
    pendingToday: number;
    pendingOverdue: number;
    pendingUpcoming: number;
  };
}
