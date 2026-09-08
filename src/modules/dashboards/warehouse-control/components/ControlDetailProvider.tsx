import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';

import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import type { WarehouseGroup } from '@/modules/dashboards/non-moving/types';

import type { ControlLinkedTruck } from '../types';
import { BillDetailDialog } from './BillDetailDialog';
import type { ControlDetailApi } from './controlDetailContext';
import { ControlDetailContext } from './controlDetailContext';
import { NonMovingDetailDialog } from './NonMovingDetailDialog';
import { VehicleDetailDialog } from './VehicleDetailDialog';

/** What the dialog layer is currently showing. */
type DetailView =
  | { kind: 'bill'; bill: DispatchBill; from: ControlLinkedTruck | null }
  | { kind: 'vehicle'; truck: ControlLinkedTruck }
  | { kind: 'non-moving'; warehouse: WarehouseGroup; ageDays: number }
  | null;

/**
 * Owns the board's two detail dialogs.
 *
 * Only one is ever open: drilling from a truck into a bill swaps the view rather
 * than stacking a second dialog on top, and the bill dialog then offers a way
 * back to the truck it came from. Stacked modals on a phone are a trap — the
 * lower one is unreachable and its close button sits under the upper overlay.
 */
export function ControlDetailProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<DetailView>(null);

  const showBill = useCallback((bill: DispatchBill) => {
    setView({ kind: 'bill', bill, from: null });
  }, []);

  const showVehicle = useCallback((truck: ControlLinkedTruck) => {
    setView({ kind: 'vehicle', truck });
  }, []);

  const showNonMovingWarehouse = useCallback((warehouse: WarehouseGroup, ageDays: number) => {
    setView({ kind: 'non-moving', warehouse, ageDays });
  }, []);

  const api = useMemo<ControlDetailApi>(
    () => ({ showBill, showVehicle, showNonMovingWarehouse }),
    [showBill, showVehicle, showNonMovingWarehouse],
  );

  const billView = view?.kind === 'bill' ? view : null;
  const vehicleView = view?.kind === 'vehicle' ? view : null;
  const nonMovingView = view?.kind === 'non-moving' ? view : null;
  const cameFrom = billView?.from ?? null;

  return (
    <ControlDetailContext.Provider value={api}>
      {children}

      <BillDetailDialog
        bill={billView?.bill ?? null}
        open={Boolean(billView)}
        onOpenChange={(next) => {
          if (!next) setView(null);
        }}
        onBack={cameFrom ? () => setView({ kind: 'vehicle', truck: cameFrom }) : undefined}
        backLabel={cameFrom ? `Back to ${cameFrom.vehicleNo}` : undefined}
      />

      <VehicleDetailDialog
        truck={vehicleView?.truck ?? null}
        open={Boolean(vehicleView)}
        onOpenChange={(next) => {
          if (!next) setView(null);
        }}
        onSelectBill={(bill) => {
          if (vehicleView) setView({ kind: 'bill', bill, from: vehicleView.truck });
        }}
      />

      <NonMovingDetailDialog
        warehouse={nonMovingView?.warehouse ?? null}
        ageDays={nonMovingView?.ageDays ?? 0}
        open={Boolean(nonMovingView)}
        onOpenChange={(next) => {
          if (!next) setView(null);
        }}
      />
    </ControlDetailContext.Provider>
  );
}
