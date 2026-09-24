import { PIPELINE_STAGE_LABEL, PIPELINE_STAGE_ORDER } from '@/modules/dashboards/dispatch-pipeline/constants';
import type { PipelineStage } from '@/modules/dashboards/dispatch-pipeline/types';
import type {
  DockingColumnFilters,
  DockingColumnValue,
  SalesDispatchDashboardEntry,
} from '@/modules/gate/api';
import { BLANK } from '@/shared/components/sheetGrid';

/**
 * The docking board's columns, as both ends name them.
 *
 * The board is paged, so the funnels and the sort are the server's work (see
 * `DOCKING_COLUMNS` in `gate_core/views_sales_dispatch.py`) — narrowing the
 * twenty-five rows that happened to land on a page only shuffles those
 * twenty-five. `key` is the name on the wire and has to stay in step with that
 * table; a name the server does not know is refused by name rather than
 * silently ignored.
 *
 * `value` is here for one job only: the not-yet-docked bookings that ride the
 * top of page one come from a different endpoint, which the board's funnels
 * never reach. They are sieved here instead, by the same ticks, so a filtered
 * board does not leave a row standing that plainly does not match it.
 */
export interface DockingColumn {
  key: string;
  label: string;
  /** What this column reads on a pending booking. `null` for an empty cell. */
  value: (entry: SalesDispatchDashboardEntry) => string | string[] | null;
}

function text(value?: string | null): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

export const DOCKING_COLUMNS: DockingColumn[] = [
  // A booking has no docking yet, so it has no entry number — its cell prints
  // "Pending" and its funnel value is the blank one.
  { key: 'entry_no', label: 'Entry No.', value: () => null },
  { key: 'company', label: 'Company', value: (entry) => text(entry.company_name) },
  { key: 'vehicle', label: 'Vehicle', value: (entry) => text(entry.vehicle_no) },
  // Every booking sits at the same stage by definition: booked, not yet docked.
  { key: 'status', label: 'Status', value: () => 'READY_TO_DOCK' },
  {
    key: 'document',
    label: 'SAP Document',
    // A load carries many bills and the cell prints all of them, so a tick on
    // any one of them keeps the row.
    value: (entry) =>
      entry.document_numbers?.length
        ? entry.document_numbers
        : (text(entry.sap_doc_num) ?? null),
  },
  { key: 'customer', label: 'Customer', value: (entry) => text(entry.customer_name) },
  { key: 'items', label: 'Items', value: (entry) => text(entry.item_summary) },
  {
    key: 'dispatch_date',
    label: 'Dispatch Date',
    value: (entry) => text(entry.dispatch_date) ?? text(entry.gate_out_date),
  },
  // A booking has not been anywhere near the gate, so this is always empty.
  { key: 'gate_out', label: 'Actual Gate Out', value: () => null },
  { key: 'gatepass', label: 'Gatepass', value: (entry) => text(entry.gatepass_no) },
];

/**
 * The status funnel, said the way the badge beside it says it.
 *
 * The server answers in stage keys — `DOCKED`, `PRINT_COMMITTED` — because
 * those are what it filters on. The wording and the order live here, with the
 * badge, so the drop-down reads "docked at dock" and walks the pipeline rather
 * than the alphabet.
 */
export function labelColumnValues(column: string, values: DockingColumnValue[]) {
  if (column !== 'status') return values;
  const rank = (value: string) => {
    const index = PIPELINE_STAGE_ORDER.indexOf(value as PipelineStage);
    return index === -1 ? PIPELINE_STAGE_ORDER.length : index;
  };
  return values
    .map((row) =>
      row.value === BLANK
        ? row
        : { ...row, label: PIPELINE_STAGE_LABEL[row.value as PipelineStage] ?? row.label },
    )
    .sort((a, b) => rank(a.value) - rank(b.value));
}

/**
 * Does this pending booking survive the funnels the board is set to?
 *
 * Nothing ticked on a column means that column is not filtering, so a booking
 * only has to answer the columns that are.
 */
export function pendingBookingMatchesFilters(
  entry: SalesDispatchDashboardEntry,
  filters: DockingColumnFilters,
): boolean {
  return DOCKING_COLUMNS.every((column) => {
    const picked = filters[column.key];
    if (!picked?.length) return true;
    const held = column.value(entry);
    if (held === null) return picked.includes(BLANK);
    const values = Array.isArray(held) ? held : [held];
    return values.length === 0
      ? picked.includes(BLANK)
      : values.some((value) => picked.includes(value));
  });
}
