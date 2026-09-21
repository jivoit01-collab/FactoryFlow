import type { DispatchSheetRow } from '../../types/sheet.types';
import { statusLabel } from './vehicleStage';

/**
 * The workbook's columns, in the workbook's order.
 *
 * A sheet per company, and they are not quite the same sheet: Oil counts
 * litres and never counts boxes, Beverages counts both and puts the weight
 * before the priority, Mart ships boxes of everything and has no sister
 * invoice to quote. Rather than one grid with everything on it and half the
 * cells blank, each company's sheet is its own list of columns here — the way
 * the book is actually kept.
 *
 * FOUR COLUMNS THE APP DOES NOT KEEP
 * Mart Invoice, ASM, the factory bilty's dispatch date and the bill-and-
 * receiving date are on the workbook and have no source anywhere in the app.
 * They are listed, and marked `notKeptYet`, so the sheet and the file it
 * downloads line up column-for-column with the book they replace — and so the
 * header says plainly that the cell is empty because nothing fills it, rather
 * than leaving somebody to wonder which row is missing its data.
 */

export interface SheetColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  /** Wide free text, so the cell is allowed to be narrow and truncate. */
  wide?: boolean;
  /** What the cell shows. */
  value: (row: DispatchSheetRow) => string;
  /** What it is worth when sorted or totalled; absent for text columns. */
  number?: (row: DispatchSheetRow) => number | null;
  /** What it sorts by, where the text in the cell would sort wrongly. */
  sort?: (row: DispatchSheetRow) => string | number | null;
  /** Summed in the totals row at the foot of the sheet. */
  total?: boolean;
  /** On the workbook, but nothing in the app fills it yet. */
  notKeptYet?: boolean;
}

const text = (value: string | null | undefined) => (value ?? '').toString();

/** A figure as the sheet writes it: thousands separated, blanks left blank. */
export function figure(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return '';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const DISPATCH_DATE: SheetColumn = {
  key: 'dispatch_date',
  label: 'Dispatch Date',
  value: (row) => text(row.dispatch_date),
  // A line with no date is work still to be placed, not a line missing a
  // figure, so it sorts as the furthest-off day rather than as a blank. The
  // sheet opens newest day first, which puts those lines at the top where the
  // desk will act on them, instead of under a month of finished ones. The
  // cell itself stays empty, so the funnel still gathers them under (blank).
  sort: (row) => row.dispatch_date ?? '9999-12-31',
};
const INVOICE_DATE: SheetColumn = {
  key: 'invoice_date',
  label: 'Invoice Date',
  value: (row) => text(row.invoice_date),
};
const PARTY: SheetColumn = { key: 'party', label: 'Party', value: (row) => row.party };
const LOCATION: SheetColumn = {
  key: 'location',
  label: 'Location',
  wide: true,
  value: (row) => row.location,
};
const STATE: SheetColumn = { key: 'state', label: 'State', value: (row) => row.state };
const INVOICE_NO: SheetColumn = {
  key: 'invoice_no',
  label: 'Invoice No.',
  value: (row) => row.invoice_no,
};
const BILTY_NO: SheetColumn = {
  key: 'bilty_no',
  label: 'Bilty No.',
  value: (row) => row.bilty_no,
};
const VEHICLE_NO: SheetColumn = {
  key: 'vehicle_no',
  label: 'Vehicle No.',
  value: (row) => row.vehicle_no,
};
const TRANSPORT: SheetColumn = {
  key: 'transport_name',
  label: 'Transport Name',
  value: (row) => row.transport_name,
};
const MOBILE: SheetColumn = {
  key: 'mobile_no',
  label: 'Mobile No',
  value: (row) => row.mobile_no,
};
const PRIORITY: SheetColumn = {
  key: 'priority',
  label: 'Priority',
  value: (row) => row.priority,
};
const KANTA: SheetColumn = {
  key: 'kanta_weight',
  label: 'Kanta Weight',
  align: 'right',
  value: (row) => figure(row.kanta_weight),
  number: (row) => row.kanta_weight,
};
const FREIGHT: SheetColumn = {
  key: 'freight',
  label: 'Freight',
  align: 'right',
  value: (row) => figure(row.freight, 2),
  number: (row) => row.freight,
};
const TOTAL_FREIGHT: SheetColumn = {
  key: 'total_freight',
  label: 'Total Freight',
  align: 'right',
  value: (row) => figure(row.total_freight, 2),
  number: (row) => row.total_freight,
  total: true,
};
const REMARKS: SheetColumn = {
  key: 'remarks',
  label: 'Remarks',
  wide: true,
  value: (row) => row.remarks,
};
/**
 * Where the truck is, not what the booking says — except before there is one.
 *
 * The plan's own booking status only ever reads Pending, Booked or
 * Dispatched; the register wants to know whether the vehicle is at the gate,
 * on the dock or gone, which is the same reading the pipeline board makes.
 *
 * The one exception is the line no vehicle has been booked for, which the
 * stages call `BOOKED` and which `statusLabel` calls what it is. That gives
 * this column's funnel an entry of its own — In plans, counted — which is how
 * the desk pulls up everything still to be arranged.
 */
const STATUS: SheetColumn = {
  key: 'vehicle_stage',
  label: 'Status',
  value: statusLabel,
};

/**
 * Status leads every sheet, ahead of even the dispatch date.
 *
 * It is not a column of the book -- the book had no way to know -- but it is
 * the first thing anyone reading the register wants, and the only one that
 * says whether a line still needs doing something about. Left at the far
 * right it sat twenty columns off the edge of the screen, where a colour on
 * the row was the only hint it existed.
 */

/** On the book, kept nowhere in the app. */
const blank = (key: string, label: string): SheetColumn => ({
  key,
  label,
  notKeptYet: true,
  value: () => '',
});

const OIL_COLUMNS: SheetColumn[] = [
  STATUS,
  DISPATCH_DATE,
  INVOICE_DATE,
  PARTY,
  LOCATION,
  STATE,
  INVOICE_NO,
  blank('mart_invoice', 'Jivo Mart Invoice'),
  BILTY_NO,
  VEHICLE_NO,
  TRANSPORT,
  MOBILE,
  {
    key: 'litres',
    label: 'Oil LTR',
    align: 'right',
    value: (row) => figure(row.litres),
    number: (row) => row.litres,
    total: true,
  },
  PRIORITY,
  KANTA,
  FREIGHT,
  TOTAL_FREIGHT,
  REMARKS,
  blank('factory_bilty_date', 'Factory Bilty Dispatch Date'),
  blank('bill_receiving_date', 'Bill & Receiving Date'),
];

const WATER_COLUMNS: SheetColumn[] = [
  STATUS,
  DISPATCH_DATE,
  INVOICE_DATE,
  PARTY,
  LOCATION,
  STATE,
  INVOICE_NO,
  blank('mart_invoice', 'Mart Invoice'),
  BILTY_NO,
  VEHICLE_NO,
  TRANSPORT,
  MOBILE,
  {
    key: 'litres',
    label: 'Water+WG Ltr',
    align: 'right',
    value: (row) => figure(row.litres),
    number: (row) => row.litres,
    total: true,
  },
  KANTA,
  PRIORITY,
  FREIGHT,
  TOTAL_FREIGHT,
  {
    key: 'total_boxes',
    label: 'Total Box',
    align: 'right',
    value: (row) => figure(row.total_boxes),
    number: (row) => row.total_boxes,
    total: true,
  },
  REMARKS,
  blank('asm', 'ASM'),
];

/** The companies whose sheets this book has — these are the tabs on top. */
export const SHEET_COMPANIES = [
  { code: 'JIVO_OIL', label: 'Oil' },
  { code: 'JIVO_BEVERAGES', label: 'Beverages' },
  { code: 'JIVO_MART', label: 'Mart' },
] as const;

/**
 * Mart's own sheet.
 *
 * Beverages' layout, with the two differences it has to have: its litres are
 * not "Water+WG", because Mart ships whatever the group makes, and the Mart
 * invoice column comes off — quoting Mart's invoice beside Mart's invoice
 * says nothing.
 */
const MART_COLUMNS: SheetColumn[] = WATER_COLUMNS.filter(
  (column) => column.key !== 'mart_invoice',
).map((column) => (column.key === 'litres' ? { ...column, label: 'Litres' } : column));

const BY_COMPANY: Record<string, SheetColumn[]> = {
  JIVO_OIL: OIL_COLUMNS,
  JIVO_BEVERAGES: WATER_COLUMNS,
  JIVO_MART: MART_COLUMNS,
};

/**
 * The columns one company's sheet shows.
 *
 * A company nobody has written a layout for falls back to Oil's, the fullest
 * of the three: better a sheet with a column too many than one that refuses
 * to draw.
 */
export function columnsFor(companyCode: string): SheetColumn[] {
  return BY_COMPANY[companyCode] ?? OIL_COLUMNS;
}
