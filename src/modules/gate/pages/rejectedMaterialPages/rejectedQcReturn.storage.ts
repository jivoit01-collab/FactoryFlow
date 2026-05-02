import type { FactoryHeadDecisionRecord } from '@/modules/qc/utils/factoryHeadDecision';

export const REJECTED_QC_RETURN_DRAFT_KEY = 'gate.rejected-qc-return.form-draft';
export const REJECTED_QC_RETURN_COMPLETED_KEY = 'gate.rejected-qc-return.completed-entries';

export interface RejectedQCReturnDraft {
  vehicleId: number;
  vehicleNo: string;
  vehicleType: string;
  transporterId: number;
  transporterName: string;
  transporterContactPerson: string;
  transporterMobile: string;
  vehicleCapacity: string;
  gpsId: string;
  driverId: number;
  driverName: string;
  mobileNumber: string;
  drivingLicenseNumber: string;
  idProofType: string;
  idProofNumber: string;
  driverPhoto: string | null;
  challanNo: string;
  ewayBillNo: string;
  gateOutDate: string;
  securityName: string;
  outTime: string;
  manualSapRef: string;
  remarks: string;
  items: RejectedQCReturnItem[];
}

export interface RejectedQCReturnItem {
  id: string;
  label: string;
  entryNo: string;
  itemName: string;
  partyName: string;
  reportNo: string;
  lotNo: string;
  quantity: string;
}

export interface RejectedQCReturnEntry {
  id: string;
  entryNo: string;
  status: 'COMPLETED';
  vehicle: Omit<RejectedQCReturnDraft, 'items'>;
  items: RejectedQCReturnItem[];
  values: Record<string, string | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface RejectedQCReturnInspectionOption {
  value: string;
  label: string;
  decision: FactoryHeadDecisionRecord;
}

export const EMPTY_REJECTED_QC_RETURN_DRAFT: RejectedQCReturnDraft = {
  vehicleId: 0,
  vehicleNo: '',
  vehicleType: '',
  transporterId: 0,
  transporterName: '',
  transporterContactPerson: '',
  transporterMobile: '',
  vehicleCapacity: '',
  gpsId: '',
  driverId: 0,
  driverName: '',
  mobileNumber: '',
  drivingLicenseNumber: '',
  idProofType: '',
  idProofNumber: '',
  driverPhoto: null,
  challanNo: '',
  ewayBillNo: '',
  gateOutDate: new Date().toISOString().slice(0, 10),
  securityName: '',
  outTime: '',
  manualSapRef: '',
  remarks: '',
  items: [],
};

export function buildRejectedQCReturnEntryNo(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `RQC-${datePart}-${timePart}`;
}

export function readRejectedQCReturnDraft(): RejectedQCReturnDraft {
  const rawDraft = window.localStorage.getItem(REJECTED_QC_RETURN_DRAFT_KEY);
  if (!rawDraft) return EMPTY_REJECTED_QC_RETURN_DRAFT;

  try {
    return {
      ...EMPTY_REJECTED_QC_RETURN_DRAFT,
      ...(JSON.parse(rawDraft) as Partial<RejectedQCReturnDraft>),
    };
  } catch {
    return EMPTY_REJECTED_QC_RETURN_DRAFT;
  }
}

export function writeRejectedQCReturnDraft(draft: RejectedQCReturnDraft): void {
  window.localStorage.setItem(REJECTED_QC_RETURN_DRAFT_KEY, JSON.stringify(draft));
}

export function clearRejectedQCReturnDraft(): void {
  window.localStorage.removeItem(REJECTED_QC_RETURN_DRAFT_KEY);
}

export function readRejectedQCReturnEntries(): RejectedQCReturnEntry[] {
  const rawEntries = window.localStorage.getItem(REJECTED_QC_RETURN_COMPLETED_KEY);
  if (!rawEntries) return [];

  try {
    return JSON.parse(rawEntries) as RejectedQCReturnEntry[];
  } catch {
    return [];
  }
}

export function writeRejectedQCReturnEntry(entry: RejectedQCReturnEntry): void {
  const entries = readRejectedQCReturnEntries();
  window.localStorage.setItem(
    REJECTED_QC_RETURN_COMPLETED_KEY,
    JSON.stringify([entry, ...entries]),
  );
}
