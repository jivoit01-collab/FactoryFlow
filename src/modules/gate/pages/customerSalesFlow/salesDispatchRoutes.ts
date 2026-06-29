const DISPATCH_DOCKING_BASE = '/dispatch/docking';
const GATE_SALES_DISPATCH_BASE = '/gate/sales-dispatch';
const GATE_BST_OUT_BASE = '/gate/bst-out';

function buildSalesDispatchRoutes(base: string) {
  // `review` appends a flag so the flow pages render read-only (walk a closed
  // entry forwards/backwards without saving or redirecting away).
  const reviewSuffix = (review?: boolean) => (review ? '&review=1' : '');
  const barcodeScan = (entryId: string | number, review?: boolean) =>
    `${base}/new/barcode-scan?entryId=${encodeURIComponent(String(entryId))}${reviewSuffix(review)}`;
  const weighment = (entryId: string | number, review?: boolean) =>
    `${base}/new/weighment?entryId=${encodeURIComponent(String(entryId))}${reviewSuffix(review)}`;

  return {
    dashboard: base,
    reports: `${base}/reprint`,
    reprintSearch: `${base}/reprint`,
    newEntry: `${base}/new`,
    barcodeScan,
    weighment,
    attachments: (entryId: string | number, review?: boolean) =>
      `${base}/new/attachments?entryId=${encodeURIComponent(String(entryId))}${reviewSuffix(review)}`,
    gatepass: (entryId: string | number, review?: boolean) =>
      `${base}/new/gatepass?entryId=${encodeURIComponent(String(entryId))}${reviewSuffix(review)}`,
    detail: (entryId: string | number) => `${base}/${entryId}`,
    reprint: (entryId: string | number) => `${base}/${entryId}/reprint`,
  };
}

export const DOCKING_ROUTES = buildSalesDispatchRoutes(DISPATCH_DOCKING_BASE);
export const SALES_DISPATCH_OUT_ROUTES = buildSalesDispatchRoutes(GATE_SALES_DISPATCH_BASE);
export const BST_OUT_DOCKING_ROUTES = buildSalesDispatchRoutes(GATE_BST_OUT_BASE);

export function getSalesDispatchRoutes(pathname: string) {
  if (pathname.startsWith(GATE_BST_OUT_BASE)) return BST_OUT_DOCKING_ROUTES;
  if (pathname.startsWith(GATE_SALES_DISPATCH_BASE)) return SALES_DISPATCH_OUT_ROUTES;
  return DOCKING_ROUTES;
}

export function isSalesDispatchOutPath(pathname: string) {
  return pathname.startsWith(GATE_SALES_DISPATCH_BASE) || pathname.startsWith(GATE_BST_OUT_BASE);
}

export const SALES_DISPATCH_BASE_ROUTES = {
  dispatchDocking: DISPATCH_DOCKING_BASE,
  gateSalesDispatchOut: GATE_SALES_DISPATCH_BASE,
  gateBstOut: GATE_BST_OUT_BASE,
};

export const GATE_OUT_ROUTES = {
  bstOutDashboard: '/gate/bst-out',
  bstOutNew: '/dispatch/docking/new',
  bstOutWeighment: (vehicleEntryId: string | number) =>
    `${GATE_BST_OUT_BASE}/new/weighment?entryId=${encodeURIComponent(String(vehicleEntryId))}`,
  bstOutGatepass: (vehicleEntryId: string | number) =>
    `${GATE_BST_OUT_BASE}/new/gatepass?entryId=${encodeURIComponent(String(vehicleEntryId))}`,
  salesDispatchOutDashboard: '/gate/sales-dispatch',
  salesDispatchOutEntry: (entryId: string | number) => `/gate/sales-dispatch/${entryId}`,
  salesDispatchOutWeighment: (vehicleEntryId: string | number) =>
    `/gate/sales-dispatch/new/weighment?entryId=${encodeURIComponent(String(vehicleEntryId))}`,
  salesDispatchOutGatepass: (vehicleEntryId: string | number) =>
    `/gate/sales-dispatch/new/gatepass?entryId=${encodeURIComponent(String(vehicleEntryId))}`,
};
