import type {
  AssetStatus,
  MaterialIndentStatus,
  SafetyFineStatus,
  WorkOrderStatus,
  WorkPermitStatus,
} from '../types';

const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  RUNNING: 'Running',
  IDLE: 'Idle',
  BREAKDOWN: 'Breakdown',
  UNDER_PM: 'Under PM',
  UNDER_REPAIR: 'Under Repair',
  RETIRED: 'Retired',
};

const ASSET_STATUS_CLASSES: Record<AssetStatus, string> = {
  RUNNING: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  IDLE: 'border-slate-200 bg-slate-50 text-slate-700',
  BREAKDOWN: 'border-rose-200 bg-rose-50 text-rose-700',
  UNDER_PM: 'border-sky-200 bg-sky-50 text-sky-700',
  UNDER_REPAIR: 'border-amber-200 bg-amber-50 text-amber-700',
  RETIRED: 'border-zinc-200 bg-zinc-50 text-zinc-700',
};

const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  WAITING_SPARE: 'Waiting Spare',
  WAITING_VENDOR: 'Waiting Vendor',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  CLOSED: 'Closed',
};

const WORK_ORDER_STATUS_CLASSES: Record<WorkOrderStatus, string> = {
  DRAFT: 'border-slate-200 bg-slate-50 text-slate-700',
  OPEN: 'border-sky-200 bg-sky-50 text-sky-700',
  ASSIGNED: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  IN_PROGRESS: 'border-amber-200 bg-amber-50 text-amber-700',
  WAITING_SPARE: 'border-orange-200 bg-orange-50 text-orange-700',
  WAITING_VENDOR: 'border-purple-200 bg-purple-50 text-purple-700',
  ON_HOLD: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  COMPLETED: 'border-teal-200 bg-teal-50 text-teal-700',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CLOSED: 'border-neutral-200 bg-neutral-50 text-neutral-700',
};

const WORK_PERMIT_STATUS_LABELS: Record<WorkPermitStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

const WORK_PERMIT_STATUS_CLASSES: Record<WorkPermitStatus, string> = {
  DRAFT: 'border-slate-200 bg-slate-50 text-slate-700',
  SUBMITTED: 'border-sky-200 bg-sky-50 text-sky-700',
  APPROVED: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  IN_PROGRESS: 'border-amber-200 bg-amber-50 text-amber-700',
  COMPLETED: 'border-teal-200 bg-teal-50 text-teal-700',
  CLOSED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CANCELLED: 'border-rose-200 bg-rose-50 text-rose-700',
  EXPIRED: 'border-red-200 bg-red-50 text-red-700',
};

export function getAssetStatusLabel(status: AssetStatus) {
  return ASSET_STATUS_LABELS[status] ?? status;
}

export function getAssetStatusClass(status: AssetStatus) {
  return ASSET_STATUS_CLASSES[status];
}

export function getWorkOrderStatusLabel(status: WorkOrderStatus) {
  return WORK_ORDER_STATUS_LABELS[status] ?? status;
}

export function getWorkOrderStatusClass(status: WorkOrderStatus) {
  return WORK_ORDER_STATUS_CLASSES[status];
}

export function getWorkPermitStatusLabel(status: WorkPermitStatus) {
  return WORK_PERMIT_STATUS_LABELS[status] ?? status;
}

export function getWorkPermitStatusClass(status: WorkPermitStatus) {
  return WORK_PERMIT_STATUS_CLASSES[status];
}

const SAFETY_FINE_STATUS_LABELS: Record<SafetyFineStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  WAIVED: 'Waived',
};

const SAFETY_FINE_STATUS_CLASSES: Record<SafetyFineStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  WAIVED: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function getSafetyFineStatusLabel(status: SafetyFineStatus) {
  return SAFETY_FINE_STATUS_LABELS[status] ?? status;
}

export function getSafetyFineStatusClass(status: SafetyFineStatus) {
  return SAFETY_FINE_STATUS_CLASSES[status];
}

const MATERIAL_INDENT_STATUS_LABELS: Record<MaterialIndentStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted to Store',
  ISSUED: 'Issued from Store',
  PENDING_APPROVAL: 'Pending Purchase Approval',
  APPROVED: 'Approved for Purchase',
  PURCHASED: 'Purchased',
  GATE_IN: 'Arrived at Gate',
  RECEIVED: 'Received into Store',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

const MATERIAL_INDENT_STATUS_CLASSES: Record<MaterialIndentStatus, string> = {
  DRAFT: 'border-slate-200 bg-slate-50 text-slate-700',
  SUBMITTED: 'border-sky-200 bg-sky-50 text-sky-700',
  ISSUED: 'border-teal-200 bg-teal-50 text-teal-700',
  PENDING_APPROVAL: 'border-amber-200 bg-amber-50 text-amber-700',
  APPROVED: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  PURCHASED: 'border-violet-200 bg-violet-50 text-violet-700',
  GATE_IN: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  RECEIVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
  CANCELLED: 'border-zinc-200 bg-zinc-50 text-zinc-700',
};

export function getMaterialIndentStatusLabel(status: MaterialIndentStatus) {
  return MATERIAL_INDENT_STATUS_LABELS[status] ?? status;
}

export function getMaterialIndentStatusClass(status: MaterialIndentStatus) {
  return MATERIAL_INDENT_STATUS_CLASSES[status];
}
