import { forwardRef } from 'react';

import type { GRPOPrintLine, GRPOPrintPayload, GRPOPrintTotalRow } from '../types';

/**
 * SAP's Goods Receipt Note, reproduced from a SAP-generated PDF.
 *
 * The vendor and the stores already hold SAP's copy of this note, so a
 * near-miss is worse than an obvious redesign — anything that reads differently
 * is something somebody has to reconcile. Every measurement below was taken off
 * the printed original (Beverages GRPO 2026088346): the rule positions and
 * column edges come from the PDF's own vector geometry and the text positions
 * and font sizes from its text spans, rather than being estimated off a
 * screenshot.
 *
 * Everything is in POINTS on a 595 x 842pt A4 page. `fontSize: 8.8` in a React
 * style means 8.8 *pixels*, a quarter smaller than the 8.8pt SAP sets, so every
 * size here carries its unit.
 *
 * The document geometry, in page coordinates:
 *
 *   masthead        logo 38.2,18.6 -> 191.9,85.3; title 219.9 underlined at 80.5
 *   frame           30.5, 88.8 -> 575.5, 793.2
 *   header          y 88.8 -> 257.8, split at x 308.8; right rows at 123.7/157.1
 *                   and split again at x 433.2; remarks from y 221.6
 *   item grid       header y 257.8 -> 273.1, then 17.5pt rows
 *   columns         30.5 | 54.5 | 102.8 | 216.5 | 264.5 | 308.8 | 354.5 |
 *                   402.5 | 468.5 | 516.5 | 575.5
 *   totals          y 290.6 -> 384.6, label column from x 325 (x 354.5 on the
 *                   Sub Total row), amounts in the 516.5 column
 *   words           y 384.6 -> 409.9; registrations y 409.9 -> 472.4
 *   footer          y 738.8 -> 793.2, then the disclaimer strip below the frame
 *
 * Two things in the original are deliberately not reproduced, because copying
 * them would read as a defect in this sheet rather than as fidelity:
 *
 * * The tax row carries a stray rectangle from x 71.5 — a Crystal frame drawn
 *   wider than its own row, starting in the middle of an empty cell — and its
 *   amount overflows the page's right rule by 3pt. Both are drawing artifacts,
 *   not information.
 * * SAP's total labels each sit at their own indent (Discount at 328.5, IGST at
 *   344.9, Sub Total at 365.8) because they are separate Crystal fields. They
 *   are aligned to their cell here.
 *
 * What SAP prints and this reproduces exactly, however odd it looks: the
 * literal 9 in "Top 3 Price", the empty "Reff. Po Date", the empty supplier
 * TIN/CST/PAN, "Contact Persion", and "Payment Terms: ... Days" doubling the
 * word. The backend reader's docstring explains where each comes from.
 */

const PAGE_W = 595;
const PAGE_H = 842;

const FRAME_L = 30.5;
const FRAME_R = 575.5;
const FRAME_T = 88.8;
const FRAME_B = 793.2;

/**
 * The 13 columns every row of the sheet is cut from. The item grid, the header
 * split and the totals block all land on these edges, so one table with these
 * widths draws the whole document.
 */
const COL_EDGES = [
  30.5, 54.5, 102.8, 181.2, 216.5, 264.5, 308.8, 325, 354.5, 402.5, 433.2, 468.5, 516.5, 575.5,
];
const COL_WIDTHS = COL_EDGES.slice(1).map((edge, i) => edge - COL_EDGES[i]);

/** Row heights, off the original's horizontal rules. */
const H_HDR_1 = 34.9; // 88.8  -> 123.7  GRPO no. / date
const H_HDR_2 = 33.4; // 123.7 -> 157.1  Reff. PO no. / date
const H_HDR_3 = 64.5; // 157.1 -> 221.6  due date, bill no., terms, GST
const H_HDR_4 = 36.2; // 221.6 -> 257.8  remarks
const H_GRID_HEAD = 15.3; // 257.8 -> 273.1
const H_ITEM = 17.5; // one item row
const H_SUBTOTAL = 21.2; // 290.6 -> 311.8
const H_DISCOUNT = 19.3; // 311.8 -> 331.1
const H_TAX = 23.2; // one tax component row
const H_EXPENSES = 13.3; // 354.3 -> 367.6
const H_GRAND = 17; // 367.6 -> 384.6
const H_WORDS = 25.3; // 384.6 -> 409.9
const H_REGISTRATIONS = 62.5; // 409.9 -> 472.4
const H_FOOTER = 54.4; // 738.8 -> 793.2

const FRAME_H = FRAME_B - FRAME_T;
const H_HEADER = H_HDR_1 + H_HDR_2 + H_HDR_3 + H_HDR_4;

export const GRPO_NOTE_PRINT_STYLE = `
  @page { size: A4 portrait; margin: 0; }
  @media print {
    body { margin: 0; background: #fff !important; }
  }
`;

// ---------------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------------

/** Money and quantities, grouped Indian-style to two places as SAP prints them. */
function n2(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  // Rounding -0.0001 gives "-0.00"; SAP prints "0.00", and a minus sign on a
  // zero charge reads as a credit to whoever checks the note.
  const rounded = Math.abs(n) < 0.005 ? 0 : n;
  return rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "17-Aug-2026" — the dates inside the document body. */
function docDate(value: string | null | undefined): string {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return `${String(d).padStart(2, '0')}-${MONTHS[m - 1]}-${y}`;
}

/** "9/9/2026" — only the "CREATED ON" stamp is written this way. */
function stampDate(value: string | null | undefined): string {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return `${m}/${d}/${y}`;
}

const ONES = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
  'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN',
  'EIGHTEEN', 'NINETEEN',
];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

/** Two digits, hyphenated the way SAP writes them ("TWENTY-ONE"). */
function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const unit = ONES[n % 10];
  return unit ? `${tens}-${unit}` : tens;
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  return [hundreds ? `${ONES[hundreds]} HUNDRED` : '', twoDigits(n % 100)].filter(Boolean).join(' ');
}

/**
 * The grand total spelled out, on the Indian scale SAP uses.
 *
 * Uppercase, currency-prefixed and with the scale words as the original writes
 * them — "LAKHS" plural but "THOUSAND" singular. SAP prints the rupees only and
 * ends with "ONLY"; a note whose amount in words disagrees with its figure is
 * the one error anybody checking it always spots.
 */
function amountInWords(value: string | number, currency: string): string {
  const rupees = Math.round(Number(value ?? 0));
  const prefix = `${currency || 'INR'}  `;
  if (!Number.isFinite(rupees) || rupees === 0) return `${prefix}ZERO ONLY`;

  const scales: [number, string][] = [
    [10_000_000, 'CRORES'],
    [100_000, 'LAKHS'],
    [1_000, 'THOUSAND'],
  ];
  let remainder = Math.abs(rupees);
  const parts: string[] = [];
  for (const [size, name] of scales) {
    const count = Math.floor(remainder / size);
    if (count) {
      parts.push(`${threeDigits(count)} ${name}`);
      remainder %= size;
    }
  }
  if (remainder) parts.push(threeDigits(remainder));
  const words = parts.join(' ').replace(/\s+/g, ' ').trim();
  return `${prefix}${rupees < 0 ? 'MINUS ' : ''}${words} ONLY`;
}

// ---------------------------------------------------------------------------
// cell primitives
// ---------------------------------------------------------------------------

const RULE = '0.6pt solid #000';

type Align = 'left' | 'center' | 'right';

interface CellProps {
  span?: number;
  rowSpan?: number;
  /** Which of the cell's own edges carry one of the sheet's rules. */
  left?: boolean;
  top?: boolean;
  bottom?: boolean;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  align?: Align;
  /** Vertical placement inside the cell; SAP's rows are top-set unless noted. */
  valign?: 'top' | 'middle' | 'bottom';
  padX?: number;
  padY?: number;
  font?: string;
  height?: number;
  children?: React.ReactNode;
}

const ARIAL = 'Arial, Helvetica, sans-serif';
const TAHOMA = 'Tahoma, Geneva, sans-serif';
const CANDARA = 'Candara, Optima, Calibri, sans-serif';

function Cell({
  span = 1,
  rowSpan,
  left,
  top,
  bottom,
  size = 8.8,
  bold,
  italic,
  align = 'left',
  valign = 'middle',
  padX = 2,
  padY = 0,
  font = ARIAL,
  height,
  children,
}: CellProps) {
  return (
    <td
      colSpan={span}
      rowSpan={rowSpan}
      style={{
        borderLeft: left ? RULE : undefined,
        borderTop: top ? RULE : undefined,
        borderBottom: bottom ? RULE : undefined,
        fontFamily: font,
        fontSize: `${size}pt`,
        fontWeight: bold ? 700 : 400,
        fontStyle: italic ? 'italic' : undefined,
        textAlign: align,
        verticalAlign: valign,
        padding: `${padY}pt ${padX}pt`,
        height: height ? `${height}pt` : undefined,
        lineHeight: 1.25,
        color: '#000',
        overflow: 'hidden',
      }}
    >
      {children}
    </td>
  );
}

/** A "Label: value" run, printed as one bold line the way the original does. */
function LabelLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ whiteSpace: 'pre' }}>
      {label}
      {value ?? ''}
    </div>
  );
}

// ---------------------------------------------------------------------------
// pagination
// ---------------------------------------------------------------------------

/**
 * How many item rows fit on a page.
 *
 * The header block and the footer repeat on every page; the totals, the amount
 * in words and the tax-registration block only ever sit under the last item
 * row, which is why the final page holds fewer rows than a continuation one.
 * A single-line receipt is one page, as SAP prints it.
 */
function rowsPerPage(taxRowCount: number, isLast: boolean): number {
  const totals = taxRowCount * H_TAX + H_SUBTOTAL + H_DISCOUNT + H_EXPENSES + H_GRAND;
  const fixed =
    H_HEADER + H_GRID_HEAD + H_FOOTER + (isLast ? totals + H_WORDS + H_REGISTRATIONS : 0);
  return Math.max(1, Math.floor((FRAME_H - fixed) / H_ITEM));
}

/** The item rows split across pages, last page first-class (it carries totals). */
function paginate(lines: GRPOPrintLine[], taxRowCount: number): GRPOPrintLine[][] {
  const lastCapacity = rowsPerPage(taxRowCount, true);
  if (lines.length <= lastCapacity) return [lines];

  const contCapacity = rowsPerPage(taxRowCount, false);
  const pages: GRPOPrintLine[][] = [];
  let rest = [...lines];
  // Fill continuation pages while what is left cannot finish on a last page.
  while (rest.length > lastCapacity) {
    pages.push(rest.slice(0, contCapacity));
    rest = rest.slice(contCapacity);
  }
  pages.push(rest);
  return pages;
}

// ---------------------------------------------------------------------------
// blocks
// ---------------------------------------------------------------------------

function HeaderBlock({ note }: { note: GRPOPrintPayload }) {
  const { company, vendor } = note;
  return (
    <>
      <tr>
        <Cell span={6} rowSpan={2} bottom valign="top" padX={5.5} padY={5}>
          <div style={{ fontSize: '10.5pt', fontWeight: 700 }}>{company.name}</div>
          <div style={{ height: '32pt' }} />
          <LabelLine label="Phone No." value={company.phone ? ` ${company.phone}` : ''} />
        </Cell>
        <Cell span={4} left bottom bold padX={1} height={H_HDR_1}>
          <LabelLine label="GRPO No.:" value={note.doc_num == null ? '' : String(note.doc_num)} />
        </Cell>
        <Cell span={3} left bottom bold padX={1.8}>
          <LabelLine label="GRPO Date: " value={docDate(note.doc_date)} />
        </Cell>
      </tr>

      <tr>
        <Cell span={4} left bottom bold padX={1} height={H_HDR_2}>
          <LabelLine label="Reff. Po No.:" value={note.po_ref_no} />
        </Cell>
        <Cell span={3} left bottom bold padX={1.8}>
          {/* SAP prints the label with no field behind it; see the docstring. */}
          <LabelLine label="Reff. Po Date:" value={docDate(note.po_ref_date)} />
        </Cell>
      </tr>

      <tr>
        <Cell span={6} rowSpan={2} bottom valign="top" padX={5.5} padY={3}>
          <div style={{ display: 'flex', gap: '7pt', fontWeight: 700 }}>
            <span>Vendor :</span>
            <span>{vendor.name}</span>
          </div>
          {vendor.address_lines.map((line, i) => (
            <div key={i} style={{ fontWeight: 700 }}>
              {line}
            </div>
          ))}
          <div style={{ fontWeight: 700, marginTop: '2.5pt' }}>
            {/* SAP's own spelling, on the copy the vendor already holds. */}
            Contact Persion:{vendor.contact_person}
          </div>
          <div style={{ fontWeight: 700, marginTop: '4pt' }}>
            Contact No.:{vendor.contact_no}
          </div>
          <div style={{ fontWeight: 700, marginTop: '4pt' }}>Email Id:{vendor.email}</div>
        </Cell>
        <Cell span={7} left bold valign="top" padX={1.8} padY={2.5} height={H_HDR_3}>
          <LabelLine label="Delivery/Due Date: " value={docDate(note.due_date)} />
          <div style={{ height: '5pt' }} />
          <LabelLine label="Supplier Reff/Bill No.: " value={note.supplier_ref_no} />
          <LabelLine
            label="Payment Terms: "
            // SAP appends the word to a term already named in days.
            value={note.payment_terms ? `${note.payment_terms} Days` : ''}
          />
          <div style={{ display: 'flex' }}>
            <span>Supplier GST No:</span>
            <span style={{ marginLeft: '24pt' }}>{vendor.gst_no}</span>
          </div>
        </Cell>
      </tr>

      <tr>
        <Cell span={7} left top bottom valign="top" padX={3.2} padY={4} height={H_HDR_4}>
          <div style={{ fontSize: '7.2pt', whiteSpace: 'pre-line' }}>
            Remarks:{note.remarks}
          </div>
        </Cell>
      </tr>
    </>
  );
}

/** The italic, smaller trio of columns SAP sets apart: PO no., PO price, Top 3. */
const PO_COL = { size: 6.2, bold: true, italic: true } as const;

function GridHeadRow() {
  return (
    <tr>
      <Cell top bottom size={7.8} bold align="center" padX={0} height={H_GRID_HEAD}>
        S.No.
      </Cell>
      <Cell left top bottom size={7.8} bold padX={2.1}>
        Item No.
      </Cell>
      <Cell span={2} left top bottom size={7.8} bold padX={0.8}>
        Description
      </Cell>
      <Cell left top bottom size={7.8} bold align="center">
        Godown
      </Cell>
      <Cell left top bottom size={7.8} bold align="center">
        Quantity
      </Cell>
      <Cell span={2} left top bottom {...PO_COL} padX={8.4}>
        PO No.
      </Cell>
      <Cell left top bottom {...PO_COL} padX={4.7}>
        PO Price
      </Cell>
      <Cell span={2} left top bottom {...PO_COL} padX={5.5}>
        Top 3 Price
      </Cell>
      <Cell left top bottom size={7.8} bold align="right" padX={5}>
        Price
      </Cell>
      <Cell left top bottom size={7.8} bold align="right" padX={8.7}>
        Amount
      </Cell>
    </tr>
  );
}

function ItemRow({ line, last }: { line: GRPOPrintLine; last: boolean }) {
  return (
    <tr>
      <Cell bottom={last} size={7.2} valign="top" padY={1} height={H_ITEM}>
        {line.sno}
      </Cell>
      <Cell left bottom={last} size={7.2} valign="top" padY={1}>
        {line.item_code}
      </Cell>
      <Cell span={2} left bottom={last} size={7.2} valign="top" padY={1} padX={0.9}>
        {line.description}
      </Cell>
      <Cell left bottom={last} size={7.2} align="center" valign="top" padY={1}>
        {line.warehouse_code}
      </Cell>
      <Cell left bottom={last} size={8.1} align="right" valign="top" padY={1}>
        {n2(line.quantity)}
      </Cell>
      <Cell span={2} left bottom={last} size={6.3} italic valign="top" padY={1} padX={3.2}>
        {line.po_no}
      </Cell>
      <Cell left bottom={last} {...PO_COL} valign="top" padY={1} padX={4.7}>
        {n2(line.po_price)}
      </Cell>
      <Cell span={2} left bottom={last} {...PO_COL} valign="top" padY={1.5} padX={5.5}>
        {/* SAP's stub, not a price; see the docstring. */}
        {line.top3_price}
      </Cell>
      <Cell left bottom={last} size={9.6} bold align="right" valign="top" padY={0.5} padX={5}>
        {n2(line.price)}
      </Cell>
      <Cell left bottom={last} size={8.1} align="right" valign="top" padY={1} padX={1}>
        {n2(line.amount)}
      </Cell>
    </tr>
  );
}

function TotalsBlock({ note }: { note: GRPOPrintPayload }) {
  const t = note.totals;
  const moneyRows: (GRPOPrintTotalRow & { key: string; height: number; bold?: boolean })[] = [
    { key: 'discount', label: 'Discount', amount: t.discount, height: H_DISCOUNT },
    ...t.taxes.map((tax, i) => ({ ...tax, key: `tax-${i}`, height: H_TAX, bold: true })),
    { key: 'expenses', ...t.expenses, height: H_EXPENSES },
    ...(t.round_off ? [{ key: 'round', ...t.round_off, height: H_EXPENSES }] : []),
    { key: 'grand', label: 'Grand Total', amount: t.grand_total, height: H_GRAND },
  ];

  return (
    <>
      {/* Total Qty sits under the Quantity column, Sub Total under Amount. */}
      <tr>
        <Cell span={3} height={H_SUBTOTAL} />
        <Cell span={2} left bottom bold padX={4}>
          Total Qty
        </Cell>
        <Cell left bottom size={6.9} bold align="right">
          {n2(t.total_qty)}
        </Cell>
        <Cell span={2} left bottom />
        <Cell span={4} left bottom bold padX={11.3}>
          Sub Total
        </Cell>
        <Cell left bottom size={8.9} align="right" padX={1.3}>
          {n2(t.sub_total)}
        </Cell>
      </tr>

      {moneyRows.map((row, i) => (
        <tr key={row.key}>
          {/* One tall empty box down the left of the whole money column. */}
          {i === 0 ? <Cell span={7} rowSpan={moneyRows.length} bottom /> : null}
          <Cell
            span={5}
            left
            bottom
            bold={row.bold ?? true}
            padX={3.5}
            height={row.height}
          >
            {row.label}
          </Cell>
          <Cell left bottom size={row.bold ? 8.8 : 8.9} bold={row.bold} align="right" padX={1.3}>
            {n2(row.amount)}
          </Cell>
        </tr>
      ))}

      <tr>
        <Cell span={13} bottom padX={8} height={H_WORDS}>
          <span style={{ fontSize: '7.8pt', fontWeight: 700 }}>Amount in Words:</span>
          <span style={{ fontSize: '8.1pt' }}>
            {amountInWords(t.grand_total, note.currency)}
          </span>
        </Cell>
      </tr>
    </>
  );
}

/** The Company / Supplier TIN-CST-PAN block. */
function RegistrationsBlock({ note }: { note: GRPOPrintPayload }) {
  const side = (title: string, party: { tin_no: string; cst_no: string; pan_no: string }) => (
    <div style={{ display: 'flex', gap: '12pt', fontWeight: 700 }}>
      <span style={{ minWidth: '47pt' }}>{title}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: '9.5pt' }}>
        <span style={{ minWidth: '53pt' }}>Tin No.</span>
        <span>:{party.tin_no}</span>
        <span>CST No.</span>
        <span>:{party.cst_no}</span>
        <span>PAN No.</span>
        <span>:{party.pan_no}</span>
      </div>
    </div>
  );

  return (
    <tr>
      <Cell span={7} bottom valign="top" padX={6.7} padY={4.5} height={H_REGISTRATIONS}>
        {side('Company:', note.company)}
      </Cell>
      <Cell span={6} left bottom valign="top" padX={3} padY={5} height={H_REGISTRATIONS}>
        {side('Supplier:', note.vendor)}
      </Cell>
    </tr>
  );
}

function FooterBlock({ note }: { note: GRPOPrintPayload }) {
  return (
    <tr>
      <Cell span={13} valign="top" padX={1.8} padY={0} height={H_FOOTER}>
        <div style={{ display: 'flex', alignItems: 'baseline', paddingTop: '1.5pt' }}>
          <span style={{ fontWeight: 700 }}>CREATED ON</span>
          <span style={{ fontSize: '8.9pt', marginLeft: '17.9pt' }}>
            {stampDate(note.created_on)}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: TAHOMA,
              fontSize: '6.6pt',
              fontWeight: 700,
              paddingTop: '3pt',
            }}
          >
            For {note.company.name}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: TAHOMA,
            fontSize: '6.6pt',
            fontWeight: 700,
            marginTop: '30pt',
            padding: '0 4.5pt 0 41pt',
          }}
        >
          <span>Received By</span>
          <span>Verified By</span>
          <span>Checked By</span>
          <span>Authorised Signatory</span>
        </div>
      </Cell>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// sheet
// ---------------------------------------------------------------------------

function NotePage({
  note,
  lines,
  isLast,
  page,
  pageCount,
}: {
  note: GRPOPrintPayload;
  lines: GRPOPrintLine[];
  isLast: boolean;
  page: number;
  pageCount: number;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: `${PAGE_W}pt`,
        height: `${PAGE_H}pt`,
        background: '#fff',
        color: '#000',
        overflow: 'hidden',
        breakAfter: page === pageCount ? 'auto' : 'page',
      }}
    >
      {/* ---- masthead ---- */}
      <div
        style={{
          position: 'absolute',
          left: '384pt',
          top: '18.2pt',
          fontFamily: TAHOMA,
          fontSize: '5.8pt',
          fontWeight: 700,
        }}
      >
        FSSAI Lic No. {note.company.fssai_no}
      </div>
      <img
        src="/JivoWellnessLogo.png"
        alt=""
        style={{
          position: 'absolute',
          left: '38.2pt',
          top: '18.6pt',
          width: '153.7pt',
          height: '66.7pt',
          objectFit: 'contain',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '219.9pt',
          top: '62pt',
          fontFamily: ARIAL,
          fontSize: '16.1pt',
          fontWeight: 700,
          borderBottom: '1.7pt solid #000',
          paddingBottom: '0.5pt',
        }}
      >
        Goods Receipt Note
      </div>

      {/* ---- the framed document ---- */}
      <table
        style={{
          position: 'absolute',
          left: `${FRAME_L}pt`,
          top: `${FRAME_T}pt`,
          width: `${FRAME_R - FRAME_L}pt`,
          height: `${FRAME_H}pt`,
          border: RULE,
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}
      >
        <colgroup>
          {COL_WIDTHS.map((w, i) => (
            <col key={i} style={{ width: `${w}pt` }} />
          ))}
        </colgroup>
        <tbody>
          <HeaderBlock note={note} />
          <GridHeadRow />
          {lines.map((line, i) => (
            <ItemRow
              key={`${line.sno}-${line.item_code}`}
              line={line}
              last={i === lines.length - 1}
            />
          ))}
          {isLast ? (
            <>
              <TotalsBlock note={note} />
              <RegistrationsBlock note={note} />
            </>
          ) : null}
          {/* Ruled empty space, exactly as SAP leaves it above the footer.
              This is the row that absorbs the page's remaining height. */}
          <tr style={{ height: '100%' }}>
            <Cell span={13} bottom />
          </tr>
          <FooterBlock note={note} />
        </tbody>
      </table>

      {/* ---- strip below the frame ---- */}
      <div
        style={{
          position: 'absolute',
          left: '194.1pt',
          top: '795.2pt',
          fontFamily: CANDARA,
          fontSize: '6.6pt',
          fontStyle: 'italic',
        }}
      >
        This is a System genrated Purchase Order, It does not requires any Signature.
      </div>
      <div
        style={{
          position: 'absolute',
          left: '524.8pt',
          top: '795.2pt',
          fontFamily: TAHOMA,
          fontSize: '6.6pt',
        }}
      >
        Page {page} of {pageCount}
      </div>
      <div
        style={{
          position: 'absolute',
          left: '433pt',
          top: '809.2pt',
          fontFamily: ARIAL,
          fontSize: '7.2pt',
        }}
      >
        Printed by SAP Business One
      </div>
    </div>
  );
}

/**
 * The whole note, one A4 page per rendered page. Handed to `react-to-print` by
 * ``GRPOPrintButton``; rendered off-screen the rest of the time.
 */
export const GRPOGoodsReceiptNotePrint = forwardRef<HTMLDivElement, { note: GRPOPrintPayload }>(
  function GRPOGoodsReceiptNotePrint({ note }, ref) {
    const pages = paginate(note.lines, note.totals.taxes.length);
    return (
      <div ref={ref} style={{ background: '#fff' }}>
        {pages.map((lines, i) => (
          <NotePage
            key={i}
            note={note}
            lines={lines}
            isLast={i === pages.length - 1}
            page={i + 1}
            pageCount={pages.length}
          />
        ))}
      </div>
    );
  },
);
