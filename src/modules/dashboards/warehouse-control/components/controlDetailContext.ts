/**
 * The board's detail-dialog channel.
 *
 * Kept apart from the provider component so the module exports only hooks and
 * constants — a file mixing a component with a hook breaks fast refresh.
 */
import { createContext, useContext } from 'react';

import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import type { WarehouseGroup } from '@/modules/dashboards/non-moving/types';

import type { ControlLinkedTruck } from '../types';

export interface ControlDetailApi {
  showBill: (bill: DispatchBill) => void;
  showVehicle: (truck: ControlLinkedTruck) => void;
  /** One non-moving warehouse, with the items stuck in it. */
  showNonMovingWarehouse: (warehouse: WarehouseGroup, ageDays: number) => void;
}

export const ControlDetailContext = createContext<ControlDetailApi | null>(null);

/**
 * Open a bill or a vehicle in the board's detail dialog.
 *
 * Panels call this instead of owning dialog state, so there is exactly one bill
 * dialog and one vehicle dialog on the page no matter how many panels can open
 * them, and drilling from a truck into one of its bills keeps working across
 * panel boundaries.
 */
export function useControlDetail(): ControlDetailApi {
  const context = useContext(ControlDetailContext);
  if (!context) {
    throw new Error('useControlDetail must be used inside a ControlDetailProvider');
  }
  return context;
}
