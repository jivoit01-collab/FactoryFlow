export const EMPTY_VEHICLE_OUT_DRAFT_KEY = 'gate.empty-vehicle-out.form-draft';

export interface EmptyVehicleOutDraft {
  vehicleEntryId: number;
  vehicleEntryNo: string;
  vehicleEntryType: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  driverMobile: string;
  gateOutDate: string;
  outTime: string;
  securityName: string;
  remarks: string;
  releaseInvoiceCount: number;
  releaseCancelsDocking: boolean;
}

export function readEmptyVehicleOutDraft(): EmptyVehicleOutDraft | null {
  const rawDraft = window.localStorage.getItem(EMPTY_VEHICLE_OUT_DRAFT_KEY);
  if (!rawDraft) return null;

  try {
    return JSON.parse(rawDraft) as EmptyVehicleOutDraft;
  } catch {
    return null;
  }
}

export function writeEmptyVehicleOutDraft(draft: EmptyVehicleOutDraft) {
  window.localStorage.setItem(EMPTY_VEHICLE_OUT_DRAFT_KEY, JSON.stringify(draft));
}

export function clearEmptyVehicleOutDraft() {
  window.localStorage.removeItem(EMPTY_VEHICLE_OUT_DRAFT_KEY);
}

/**
 * Human-readable summary of what marking this vehicle out empty will do to its
 * dispatch bookings. Returns null when there are no side effects to warn about.
 */
export function buildEmptyOutSideEffectMessage(
  invoiceCount: number,
  cancelsDocking: boolean,
): string | null {
  if (invoiceCount <= 0 && !cancelsDocking) return null;

  const parts: string[] = [];
  if (cancelsDocking) parts.push('cancel the docked gate-out entry');
  if (invoiceCount > 0) {
    parts.push(
      `release ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'} for re-planning`,
    );
  }
  return `Marking this vehicle out empty will ${parts.join(' and ')}.`;
}
