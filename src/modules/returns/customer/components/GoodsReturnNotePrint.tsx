import { forwardRef } from 'react';

import type { GoodsReturnPrintLine, GoodsReturnPrintPayload } from '../api';

/**
 * SAP's own Return Note, reproduced.
 *
 * The customer and the warehouse both know this sheet as the one SAP prints, so
 * the aim is the same page rather than a nicer one — anything that reads
 * differently is something somebody has to reconcile. Unlike the A/R invoice's
 * TAX INVOICE (a dense Crystal layout reproduced from the PDF's vector
 * geometry), this is SAP's *default* marketing-document layout: a plain sheet
 * with one ruled grid. The measurements below were taken off a scanned printout
 * of Return 1609264514, so they are good to a point or two, not exact, and the
 * regions are laid out in normal flow instead of absolutely positioned.
 *
 * Everything is in POINTS on a 595 x 842pt A4 page — `fontSize: 8` in a React
 * style means 8 *pixels*, a quarter smaller than the 8pt SAP sets, so every size
 * here carries its unit.
 *
 * Two faithful oddities worth not "fixing":
 *
 * * **Zero money prints blank.** The sample sheet's Price and Total cells are
 *   empty, not `0.0000`, because a return moves stock without crediting the
 *   customer (the credit note is a separate document). Only the document total
 *   at the foot prints its zero, with the currency.
 * * **Sales Employee and Payment Terms are never empty.** SAP defaults them to
 *   its own `-1` rows — "-No Sales Employee / Buyer-" and "ADVANCE/CASH/0 DAYS"
 *   — and prints those words, so they arrive on the payload rather than being
 *   blanked here.
 *
 * A long return runs onto a second page the way the browser breaks it; SAP would
 * repeat the grid header. Nobody has yet returned enough lines for that to
 * matter, and reproducing SAP's pagination is only worth it for the invoice,
 * whose grid is ruled all the way down whether or not there are rows for it.
 */

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 34;
const CONTENT_W = PAGE_W - MARGIN * 2;

const RULE = '0.75pt solid #000';

/** Where the "To" block's name and address sit, and the label column beside it. */
const PARTY_INDENT = 117;
const RIGHT_LABEL = 357;

/** Grid column widths, in points, measured off the printout. */
const COLUMNS: { key: string; label: string; width: number; align?: 'right' }[] = [
  { key: 'line_no', label: '#', width: 18 },
  { key: 'item_code', label: 'Item No.', width: 44 },
  { key: 'description', label: 'Description', width: 126 },
  { key: 'uom', label: 'UoM', width: 26 },
  { key: 'quantity', label: 'Quantity', width: 86, align: 'right' },
  { key: 'price', label: 'Price', width: 86, align: 'right' },
  { key: 'stock_quantity', label: 'Qty (Stock UoM)', width: 46, align: 'right' },
  { key: 'total', label: 'Total', width: 95, align: 'right' },
];

export const GOODS_RETURN_PRINT_STYLE = `
  @page { size: A4 portrait; margin: 0; }
  @media print {
    body { margin: 0; background: #fff !important; }
  }
`;

// ---------------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------------

/** `12.000000` -> `12`, `12.500000` -> `12.5` — how SAP prints a quantity. */
function quantity(value: string): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '';
  return String(n);
}

/** Four decimals, the sheet's money precision (`INR 0.0000`). */
function money(value: string): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(4);
}

/** Blank rather than `0.0000`: see the note on zero money above. */
function moneyOrBlank(value: string): string {
  return Number(value ?? 0) === 0 ? '' : money(value);
}

function cellValue(line: GoodsReturnPrintLine, key: string): string {
  switch (key) {
    case 'line_no':
      return String(line.line_no);
    case 'item_code':
      return line.item_code;
    case 'description':
      return line.description;
    case 'uom':
      return line.uom;
    case 'quantity':
      return quantity(line.quantity);
    case 'price':
      return moneyOrBlank(line.price);
    case 'stock_quantity':
      return quantity(line.stock_quantity);
    case 'total':
      return moneyOrBlank(line.total);
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------

export const GoodsReturnNotePrint = forwardRef<HTMLDivElement, { note: GoodsReturnPrintPayload }>(
  function GoodsReturnNotePrint({ note }, ref) {
    return (
      <div
        ref={ref}
        style={{
          width: `${PAGE_W}pt`,
          minHeight: `${PAGE_H}pt`,
          position: 'relative',
          background: '#fff',
          color: '#000',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '8pt',
          lineHeight: 1.25,
          padding: `${MARGIN}pt`,
          boxSizing: 'border-box',
        }}
      >
        {/* To / Date-Time-VAT band */}
        <div style={{ display: 'flex', paddingTop: '14pt' }}>
          <div style={{ width: `${RIGHT_LABEL}pt`, display: 'flex' }}>
            <div style={{ width: `${PARTY_INDENT}pt` }}>To</div>
            <div>
              <div style={{ fontSize: '10.5pt', fontWeight: 700 }}>{note.customer_name}</div>
              <div style={{ marginTop: '5pt', fontSize: '7.5pt' }}>
                {note.address_lines.map((line, index) => (
                  <div key={`${line}-${index}`}>{line}</div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <LabelledValue label="Date" value={note.doc_date} />
            <LabelledValue label="Time" value={note.doc_time} gap="12pt" />
            <LabelledValue label="VAT Number:" value={note.vat_number} gap="12pt" />
          </div>
        </div>

        {/* Return <DocNum>            Original */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'baseline',
            gap: '34pt',
            marginTop: '30pt',
          }}
        >
          <div style={{ fontSize: '15pt' }}>Return {note.doc_num}</div>
          <div style={{ fontSize: '12pt' }}>{note.cancelled ? 'Cancelled' : 'Original'}</div>
        </div>

        {/* Item grid */}
        <table
          style={{
            width: `${CONTENT_W}pt`,
            marginTop: '18pt',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <colgroup>
            {COLUMNS.map((column) => (
              <col key={column.key} style={{ width: `${column.width}pt` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  style={{
                    border: RULE,
                    padding: '2pt 3pt',
                    textAlign: 'left',
                    verticalAlign: 'bottom',
                    fontWeight: 700,
                    height: '29pt',
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {note.lines.map((line) => (
              <tr key={`${line.line_no}-${line.item_code}`}>
                {COLUMNS.map((column) => (
                  <td
                    key={column.key}
                    style={{
                      border: RULE,
                      padding: '2pt 3pt',
                      textAlign: column.align ?? 'left',
                      verticalAlign: 'top',
                      wordBreak: 'break-word',
                    }}
                  >
                    {cellValue(line, column.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', marginTop: '17pt', fontWeight: 700 }}>
          <div style={{ width: `${PARTY_INDENT}pt` }}>Due Date</div>
          <div>{note.due_date}</div>
        </div>

        <div style={{ marginTop: '41pt' }}>
          <LabelledRow label="Sales Employee:" value={note.sales_employee} />
          <LabelledRow label="Payment Terms:" value={note.payment_terms} gap="13pt" />
          <div style={{ marginTop: '13pt' }}>{note.comments}</div>
        </div>

        {/* Document total */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '26pt',
            marginTop: '43pt',
          }}
        >
          <div>Total</div>
          <div
            style={{
              width: '90pt',
              border: RULE,
              padding: '4pt 5pt',
              textAlign: 'right',
            }}
          >
            {note.currency} {money(note.doc_total)}
          </div>
        </div>

        {/* Footer, on the page rather than after the content */}
        <div
          style={{
            position: 'absolute',
            left: `${MARGIN}pt`,
            right: `${MARGIN}pt`,
            bottom: '24pt',
          }}
        >
          <div style={{ borderTop: RULE, marginBottom: '3pt' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>Page&nbsp;&nbsp;&nbsp;&nbsp;1</div>
            <div>Printed by SAP Business One</div>
          </div>
        </div>
      </div>
    );
  },
);

function LabelledValue({
  label,
  value,
  gap,
}: {
  label: string;
  value: string;
  gap?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: gap }}>
      <div>{label}</div>
      <div>{value}</div>
    </div>
  );
}

function LabelledRow({ label, value, gap }: { label: string; value: string; gap?: string }) {
  return (
    <div style={{ display: 'flex', marginTop: gap }}>
      <div style={{ width: `${PARTY_INDENT + 42}pt` }}>{label}</div>
      <div>{value}</div>
    </div>
  );
}
