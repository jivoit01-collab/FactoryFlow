import type {
  SalesDispatchDocument,
  SalesDispatchGateOut,
  SalesDispatchItem,
} from '@/modules/gate/api';

export const DOCKING_TOTAL_STEPS = 4;

export const lockedDateTimeInputClassName =
  'bg-muted/40 text-foreground disabled:cursor-not-allowed disabled:opacity-100';

export function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toTimeInputValue(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export function formatDocumentType(type?: string | null) {
  return type === 'STOCK_TRANSFER' ? 'Stock Transfer' : 'Invoice';
}

export function buildDocumentKey(document: SalesDispatchDocument) {
  return `${document.document_type}:${document.doc_entry}`;
}

export function buildEntryDocumentKey(entry: SalesDispatchGateOut) {
  return `${entry.document_type}:${entry.sap_doc_entry}`;
}

export function buildDocumentLabel(document: SalesDispatchDocument) {
  return [
    formatDocumentType(document.document_type),
    document.doc_num,
    document.doc_date,
    document.card_name || document.to_warehouse || document.warehouses,
    document.item_summary,
  ]
    .filter(Boolean)
    .join(' - ');
}

export function buildEntryDocumentLabel(entry: SalesDispatchGateOut) {
  return [
    formatDocumentType(entry.document_type),
    entry.sap_doc_num,
    entry.sap_doc_date,
    entry.customer_name || entry.to_warehouse || entry.warehouses,
    entry.item_summary,
  ]
    .filter(Boolean)
    .join(' - ');
}

/**
 * True when this docking's physical truck carries more than one docking — a
 * multi-company truck OR a same-company split load (two bills docked separately).
 * The truck is one physical load, so the scan/weighment/gatepass/attachment pages
 * must fold every docking on the arrival in. Falls back to the company count for
 * backends not yet serving `arrival_docking_count`.
 */
export function isMultiDockingTruck(entry?: SalesDispatchGateOut | null) {
  const dockingCount = entry?.arrival_docking_count ?? entry?.arrival_company_count ?? 0;
  return dockingCount > 1 && Boolean(entry?.arrival);
}

type DockingRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | null | undefined;

export interface ScanGateInput {
  /** Box scanning is turned off for this company (e.g. Jivo Beverages). */
  boxScanOptional: boolean;
  /** Boxes scanned across every scan-required docking on the truck. */
  scannedCount: number;
  /** The load still carries invoiced goods nobody scanned (judged load-wide). */
  isPartialScan: boolean;
  /** Status of this docking's own scan-skip / partial-dispatch request. */
  ownSkipStatus?: DockingRequestStatus;
  ownPartialStatus?: DockingRequestStatus;
  /** The other dockings on this truck, empty for a single-docking load. */
  loadDockings?: SalesDispatchGateOut[];
}

/**
 * Whether the operator may leave the scanning step, and which approval let them.
 *
 * The shortfall is judged LOAD-WIDE (one truck, every docking's bills), but an admin
 * approval is filed against the single docking it was raised from. So an approval sitting
 * on any docking of the truck releases all of them — otherwise the operator standing on
 * the fully scanned half of a split load is held for an approval that docking can't even
 * raise (a bill of PM cartons carries no box barcode to scan).
 */
export function resolveScanGate({
  boxScanOptional,
  scannedCount,
  isPartialScan,
  ownSkipStatus,
  ownPartialStatus,
  loadDockings = [],
}: ScanGateInput) {
  const skipApproved =
    ownSkipStatus === 'APPROVED' ||
    loadDockings.some((docking) => Boolean(docking.gatepass_readiness?.scan_skip_approved));
  const partialApproved =
    ownPartialStatus === 'APPROVED' ||
    loadDockings.some((docking) => Boolean(docking.gatepass_readiness?.partial_scan_approved));
  const satisfied =
    boxScanOptional ||
    (scannedCount > 0 && !isPartialScan) ||
    (scannedCount === 0 && skipApproved) ||
    (isPartialScan && partialApproved);
  return { skipApproved, partialApproved, satisfied };
}

export function formatDateTime(date?: string | null, time?: string | null) {
  const value = [date, time].filter(Boolean).join(' ');
  return value || '-';
}

export function formatTimestamp(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDocumentLines(document?: SalesDispatchDocument | null) {
  return Array.isArray(document?.items) ? document.items.filter(isRecord) : [];
}

export function getLineText(line: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = line[key];
    if (value !== null && value !== undefined && value !== '') {
      return String(value);
    }
  }
  return '';
}

export function summarizeSalesDispatchItems(items: SalesDispatchItem[]) {
  if (items.length === 0) return '-';
  const [firstItem] = items;
  const suffix = items.length > 1 ? ` +${items.length - 1}` : '';
  return `${firstItem.item_name || firstItem.item_code}${suffix}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
