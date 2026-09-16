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
  RUNNING: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  IDLE: 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 text-slate-700 dark:text-muted-foreground',
  BREAKDOWN: 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
  UNDER_PM: 'border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
  UNDER_REPAIR: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  RETIRED: 'border-zinc-200 dark:border-border bg-zinc-50 dark:bg-muted/40 text-zinc-700 dark:text-muted-foreground',
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
  REOPENED: 'Reopened',
  APPROVED: 'Approved',
  CLOSED: 'Closed',
};

const WORK_ORDER_STATUS_CLASSES: Record<WorkOrderStatus, string> = {
  DRAFT: 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 text-slate-700 dark:text-muted-foreground',
  OPEN: 'border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
  ASSIGNED: 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  IN_PROGRESS: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  WAITING_SPARE: 'border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
  WAITING_VENDOR: 'border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  ON_HOLD: 'border-zinc-200 dark:border-border bg-zinc-50 dark:bg-muted/40 text-zinc-700 dark:text-muted-foreground',
  COMPLETED: 'border-teal-200 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400',
  REOPENED: 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
  APPROVED: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  CLOSED: 'border-neutral-200 dark:border-border bg-neutral-50 dark:bg-muted/40 text-neutral-700 dark:text-muted-foreground',
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
  DRAFT: 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 text-slate-700 dark:text-muted-foreground',
  SUBMITTED: 'border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
  APPROVED: 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  IN_PROGRESS: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  COMPLETED: 'border-teal-200 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400',
  CLOSED: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  CANCELLED: 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
  EXPIRED: 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
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
  PENDING: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  PAID: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  WAIVED: 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 text-slate-700 dark:text-muted-foreground',
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
  PENDING_QUOTATION_SELECTION: 'Pending Company Selection',
  QUOTATION_SELECTED: 'Company Selected',
  PURCHASED: 'Purchased',
  GATE_IN: 'Arrived at Gate',
  RECEIVED: 'Received into Store',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

const MATERIAL_INDENT_STATUS_CLASSES: Record<MaterialIndentStatus, string> = {
  DRAFT: 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 text-slate-700 dark:text-muted-foreground',
  SUBMITTED: 'border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
  ISSUED: 'border-teal-200 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400',
  PENDING_APPROVAL: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  APPROVED: 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  PENDING_QUOTATION_SELECTION: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  QUOTATION_SELECTED: 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  PURCHASED: 'border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400',
  GATE_IN: 'border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  RECEIVED: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  REJECTED: 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
  CANCELLED: 'border-zinc-200 dark:border-border bg-zinc-50 dark:bg-muted/40 text-zinc-700 dark:text-muted-foreground',
};

export function getMaterialIndentStatusLabel(status: MaterialIndentStatus) {
  return MATERIAL_INDENT_STATUS_LABELS[status] ?? status;
}

export function getMaterialIndentStatusClass(status: MaterialIndentStatus) {
  return MATERIAL_INDENT_STATUS_CLASSES[status];
}
