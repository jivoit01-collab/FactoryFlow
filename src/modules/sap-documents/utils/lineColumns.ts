/**
 * A document's lines, one column per field — SAP Portal's approval line tables
 * (`backend_v1/public/sap-approvals.html:859-914`, `itemCols` / `serviceCols`),
 * so a bill can be checked cell by cell and pasted into a sheet to check the
 * working (issue #36: everything used to sit in one "Item / description" cell).
 *
 * One list drives both the table and the copy, so a column on screen can never
 * go missing from what is pasted.
 *
 * Two layouts, as the portal had, plus transfers: a service document (a freight
 * bill, whose GRPO was done in service, carries no item on any line) gets the
 * freight columns — received qty, litres, bilty; every other document the item
 * columns. The portal's columns are always shown, in its order, so a paste lands
 * in the same place bill after bill; fields the portal never showed come after
 * them, and only when some line carries one.
 *
 * The dimensions are named as JI's GRPO posts them (`factory_app/grpo/services.py`):
 * 1 Variety, 2 Effective Month, 3 Budget, 4 Sub Budget, 5 State. The portal's
 * item layout had 1 and 3 the wrong way round.
 */
import { type ClipboardCell, formatNumber } from '@/shared/utils';

import type { DocumentKind, DocumentLine } from '../api';
import { money, quantity, sapDate } from './format';

export type LineLayout = 'item' | 'service' | 'transfer';

export interface LineColumn {
  label: string;
  /** The cell as it reads on screen. */
  text: (line: DocumentLine, index: number) => string;
  /** The cell as a spreadsheet should take it: a figure stays a number. */
  value: (line: DocumentLine, index: number) => ClipboardCell;
  /** Figures read right-aligned. */
  align?: 'right';
  /** Long text, allowed to wrap; every other cell stays on one line. */
  wrap?: boolean;
  /** Shown only when some line has a value (a field the portal never showed). */
  optional?: boolean;
}

export const LAYOUT_TITLES: Record<LineLayout, string> = {
  item: 'Item lines',
  service: 'Service lines',
  transfer: 'Lines',
};

type Getter<T> = (line: DocumentLine) => T | null | undefined;

function text(label: string, get: Getter<string>, extra: Partial<LineColumn> = {}): LineColumn {
  return { label, text: (line) => get(line) || '', value: (line) => get(line) || '', ...extra };
}

function figure(
  label: string,
  get: Getter<number>,
  format: (value: number | null | undefined) => string,
  extra: Partial<LineColumn> = {},
): LineColumn {
  return { label, text: (line) => format(get(line)), value: (line) => get(line) ?? null, align: 'right', ...extra };
}

const optional = (column: LineColumn): LineColumn => ({ ...column, optional: true });

const percent = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : formatNumber(value, Number.isInteger(value) ? 0 : 2);

const NUMBER: LineColumn = {
  label: '#',
  text: (line, index) => String((line.line_num ?? index) + 1),
  value: (line, index) => (line.line_num ?? index) + 1,
};

const ITEM_NO = text('Item No', (l) => l.item_code);
const DESCRIPTION = text('Description', (l) => l.description, { wrap: true });
const QTY = figure('Qty', (l) => l.quantity, quantity);
const UOM = text('UoM', (l) => l.uom);
const UNIT_PRICE = figure('Unit Price', (l) => l.unit_price, money);
const TAX_CODE = text('Tax Code', (l) => l.tax_code);
const TAX_PERCENT = figure('Tax %', (l) => l.tax_percent, percent);
const SAC = text('SAC', (l) => l.sac_code);
const GL_ACCOUNT = text('G/L Account', (l) => l.account_code);
const RECEIVED = figure('Received Qty', (l) => l.received_qty, quantity);
const DISPATCHED = figure('Dispatched Qty', (l) => l.dispatched_qty, quantity);
const LOCATION = text('Loc.', (l) => l.location_name || l.location_code);
const LITRE = figure('Litre', (l) => l.litres, quantity);
const BILTY_NO = text('Bilty Number', (l) => l.bilty_no);
const BILTY_DATE = text('Bilty Date', (l) => (l.bilty_date ? sapDate(l.bilty_date) : ''));
const AR_NO = text('ARNO', (l) => l.ar_no);
const SUB_ACCOUNT = text('Sub Account', (l) => l.sub_account);
const CUSTOMER_CODE = text('Customer Code', (l) => l.udf_card_code);
const PURPOSE = text('Purpose', (l) => l.purpose);
const REMARKS = text('Remarks', (l) => l.remarks, { wrap: true });
const PROJECT = text('Project', (l) => l.project);
const WTAX_LIABLE = text('WTax Liable', (l) =>
  l.wtax_liable === null || l.wtax_liable === undefined ? '' : l.wtax_liable ? 'Yes' : 'No',
);
const COPIED_FROM = text('Copied From', (l) =>
  l.base_label ? `${l.base_label} ${l.base_ref || l.base_entry || ''}`.trim() : '',
);

const DIMENSIONS = ['Variety', 'Effective Month', 'Budget', 'Sub Budget', 'State'].map((label, n) =>
  text(label, (l) => l.dimensions[n]?.name || l.dimensions[n]?.code),
);

const ITEM_COLUMNS: LineColumn[] = [
  NUMBER,
  ITEM_NO,
  DESCRIPTION,
  QTY,
  UOM,
  UNIT_PRICE,
  figure('Disc %', (l) => l.discount_percent, percent),
  TAX_CODE,
  TAX_PERCENT,
  figure('Total', (l) => l.line_total, money),
  GL_ACCOUNT,
  text('G/L Name', (l) => l.account_name, { wrap: true }),
  text('Warehouse', (l) => l.warehouse_code),
  text('Warehouse Name', (l) => l.warehouse_name, { wrap: true }),
  LOCATION,
  LITRE,
  BILTY_NO,
  AR_NO,
  SUB_ACCOUNT,
  CUSTOMER_CODE,
  ...DIMENSIONS,
  REMARKS,
  ...[RECEIVED, DISPATCHED, BILTY_DATE, WTAX_LIABLE, PURPOSE, SAC, COPIED_FROM, PROJECT].map(optional),
];

const SERVICE_COLUMNS: LineColumn[] = [
  NUMBER,
  SAC,
  GL_ACCOUNT,
  text('G/L Account Name', (l) => l.account_name, { wrap: true }),
  DESCRIPTION,
  TAX_CODE,
  WTAX_LIABLE,
  RECEIVED,
  DISPATCHED,
  UNIT_PRICE,
  figure('Total (LC)', (l) => l.line_total, money),
  LOCATION,
  LITRE,
  BILTY_NO,
  AR_NO,
  SUB_ACCOUNT,
  CUSTOMER_CODE,
  PURPOSE,
  BILTY_DATE,
  ...DIMENSIONS,
  // A service line's standard Quantity is SAP's 0; its quantities are the UDFs above.
  ...[QTY, TAX_PERCENT, REMARKS, COPIED_FROM, PROJECT].map(optional),
];

const TRANSFER_COLUMNS: LineColumn[] = [
  NUMBER,
  ITEM_NO,
  DESCRIPTION,
  QTY,
  UOM,
  text('From Warehouse', (l) => l.from_warehouse_code),
  text('From Warehouse Name', (l) => l.from_warehouse_name, { wrap: true }),
  text('To Warehouse', (l) => l.warehouse_code),
  text('To Warehouse Name', (l) => l.warehouse_name, { wrap: true }),
  UNIT_PRICE,
  figure('Total', (l) => l.line_total, money),
  ...[LITRE, BILTY_NO, ...DIMENSIONS, REMARKS, COPIED_FROM, PROJECT].map(optional),
];

const LAYOUTS: Record<LineLayout, LineColumn[]> = {
  item: ITEM_COLUMNS,
  service: SERVICE_COLUMNS,
  transfer: TRANSFER_COLUMNS,
};

/** SAP's service documents carry no item on any line. */
export function lineLayout(kind: DocumentKind, lines: DocumentLine[]): LineLayout {
  if (kind === 'transfer') return 'transfer';
  return lines.length > 0 && lines.every((line) => !line.item_code) ? 'service' : 'item';
}

function filled(cell: ClipboardCell): boolean {
  return cell !== null && cell !== undefined && cell !== '' && cell !== 0;
}

/** The layout's columns, less any optional one no line fills. */
export function lineColumns(layout: LineLayout, lines: DocumentLine[]): LineColumn[] {
  return LAYOUTS[layout].filter(
    (column) => !column.optional || lines.some((line, index) => filled(column.value(line, index))),
  );
}

/**
 * The lines as a sheet: the headings, then one row per line, figures as plain
 * numbers. Unlike a register's copy, the headings come along — a document's
 * lines are pasted into a fresh sheet to be checked, not under existing rows.
 */
export function linesToClipboardRows(columns: LineColumn[], lines: DocumentLine[]): ClipboardCell[][] {
  return [
    columns.map((column) => column.label),
    ...lines.map((line, index) => columns.map((column) => column.value(line, index))),
  ];
}
