// Filter model of the shared Scanned Boxes sheet — a separate module so the
// component file exports only components (react-refresh constraint).

export interface ScanSheetFilter {
  document: string;
  item: string;
  query: string;
}

export const ALL_SCAN_SHEET_FILTER: ScanSheetFilter = { document: 'ALL', item: 'ALL', query: '' };

/**
 * Case-insensitive substring match of the sheet's search query against a scan's
 * searchable fields. Callers apply it while scoping their scans so every stat
 * and badge they derive agrees with the visible rows.
 */
export function matchesScanSearch(query: string, fields: Array<string | null | undefined>) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => (field || '').toLowerCase().includes(needle));
}
