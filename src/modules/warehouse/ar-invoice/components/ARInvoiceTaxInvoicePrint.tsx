import { forwardRef, useEffect, useRef } from 'react';

import JsBarcode from 'jsbarcode';

import type { ARInvoicePrintLine, ARInvoicePrintPayload } from '../types';

/**
 * SAP's TAX INVOICE, reproduced from a SAP-generated PDF.
 *
 * The customer already holds SAP's copy of this bill, so a near-miss is worse
 * than an obvious redesign — anything that reads differently is something
 * somebody has to reconcile. Every measurement below was taken off the printed
 * original (invoice 626090225): the rule positions and column edges come from
 * the PDF's own vector geometry and the text positions from its text spans,
 * rather than being estimated off a screenshot.
 *
 * Everything is in POINTS on a 595 x 842pt A4 page. `fontSize: 8.8` in a React
 * style means 8.8 *pixels*, a quarter smaller than the 8.8pt SAP sets, so every
 * size here carries its unit.
 *
 * The document geometry, in page coordinates:
 *
 *   frame            18, 18 -> 577.3, 819.2   (last page ends at 799)
 *   masthead         y 18 -> 164.3, logo left of 456.2, barcode box right
 *   banded row       y 164.3 -> 184.1, split at x 196 and 365.2
 *   detail block     y 184.1 -> 250, middle column split again at y 215.8
 *   bill/ship band   y 250 -> 263, parties y 263 -> 394.1, divided at x 306
 *   item grid        header 39.6pt tall, then 12pt rows
 *   columns          39 | 174.5 | 204 | 258 | 348 | 390 | 444 | 468 | 522
 *
 * Pagination is computed rather than left to the browser, because SAP's own
 * page breaks are load-bearing: the grid is ruled all the way down whether or
 * not there are rows to put in it, and the summary always starts on a fresh
 * page. Reproducing that is why a one-line invoice prints on two pages here —
 * the same two pages SAP prints.
 */

const PAGE_W = 595;
const PAGE_H = 842;

const FRAME_L = 18;
const FRAME_R = 577.3;
const FRAME_T = 18;
/** Where the frame stops on a page that still has more invoice below it. */
const FRAME_B = 819.2;
/** Where it stops on the page carrying the summary, which has footnotes under it. */
const FRAME_B_LAST = 799;

const RULE = '0.75pt solid #000';
const HAIRLINE = '0.5pt solid #000';

/** Column edges, page coordinates. */
const COL_EDGES = [FRAME_L, 39, 174.5, 204, 258, 348, 390, 444, 468, 522, FRAME_R];
const COL_WIDTHS = COL_EDGES.slice(1).map((edge, i) => edge - COL_EDGES[i]);

/** The item grid's own metrics. */
const GRID_HEADER_H = 39.6;
const ROW_H = 12;
/** Description column width, minus its padding, over the width of a character
 *  at 8.1pt Arial — how a long description is known to wrap onto a second line. */
const DESC_CHARS_PER_LINE = 28;

/** Line slots in the grid on each kind of page (see the pagination note above). */
const SLOTS_FIRST_PAGE = Math.floor((FRAME_B - 433.7) / ROW_H); // 32
const SLOTS_MIDDLE_PAGE = Math.floor((FRAME_B - 57.6) / ROW_H); // 63
const SLOTS_SUMMARY_PAGE = Math.floor((433.9 - 57.6) / ROW_H); // 31

/**
 * The parts of the sheet that live only in SAP's Crystal layout.
 *
 * These are not on the document and not in any table the invoice reads — the
 * layout has them typed in. `OADM` carries a different phone (the call centre)
 * and no usable postal address, so there is nowhere else to get them. Note that
 * the letterhead address, GST number, PAN and FSSAI licence are NOT here: those
 * are real per-branch data and arrive on the payload, which is why a Delhi bill
 * and a Ganaur bill print different addresses.
 */
const STATIC_LETTERHEAD = {
  title: 'TAX INVOICE',
  copy: 'Original Copy',
  name: 'Jivo Wellness Pvt Ltd',
  customerContact: 'Customer C.No: +91 98107 38738',
  email: 'Email : info@jivo.in',
  website: 'Website : www.jivo.in',
  cin: 'CIN No.U01100DL2010PTC207768',
  customerCare: 'Customer Care No. 1800 137 4433',
  registeredOffice:
    'Registered Office:  J-3/190, GF Rajouri Garden, New Delhi - 110027, India',
  jurisdiction: 'Subject to DELHI Jurisdiction',
  computerGenerated: 'This is a Computer Generated invoice, Signature is not required.',
  signatory: 'For Jivo Wellness Pvt. Ltd.',
  terms:
    "Terms and Conditions: 1)All payment shall be made in advance unless otherwise agreed in writing. Late payments shall attract interest at " +
    "18% p.a. until cleared.2) All cheques must be A/c Payee in favour of 'Jivo Wellness Pvt. Ltd'. " +
    '3) Any statutory taxes or duties imposed after the date of this Invoice, shall be borne by respective Parties, as per its applicability .4) ' +
    'Goods once sold will not be taken back.5) We hereby certify that food/foods mentioned in this invoice is/are warranted to be of the nature ' +
    "and quality which it/these purports/purported to be.6) All returns and replacements shall be subject to the applicable Company's policy. " +
    "The Company's liability shall not exceed the corresponding invoice value in any case.7) The company isn't liable for delays from " +
    'uncontrollable events including those arising from force Majeure circumstances. In such cases, obligations may be suspended or ' +
    'extended without liability.8)All disputes are subject to New Delhi court jurisdiction.9) These terms and conditions constitute a binding and ' +
    'unconditional agreement between the Parties.10) W.e.f 22.09.2025, due to amendment in GST rates, our M.R.P. has been revised. Please ' +
    'visit  https://jivo.in/gstrevision/ to know more',
};

export const AR_INVOICE_PRINT_STYLE = `
  @page { size: A4 portrait; margin: 0; }
  @media print {
    body { margin: 0; background: #fff !important; }
  }
`;

// ---------------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------------

function n2(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  // Rounding -0.0001 gives "-0.00"; SAP prints "0.00", and a minus sign on a
  // zero round-off reads as a credit to whoever checks the bill.
  const rounded = Math.abs(n) < 0.005 ? 0 : n;
  return rounded.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function n4(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.0000';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

/** Whole pieces, as the totals row writes them: "0 Box", "5 PCS". */
function nWhole(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? String(Math.round(n)) : '0';
}

/** SAP writes the invoice date D/M/YYYY and every other date DD/MM/YYYY. */
function sapDate(value?: string | null, pad = true): string {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  if (!pad) return `${day}/${month}/${d.getFullYear()}`;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${d.getFullYear()}`;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** Two digits, hyphenated the way SAP writes them ("Twenty-Five"). */
function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const unit = ONES[n % 10];
  return unit ? `${tens}-${unit}` : tens;
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', twoDigits(rest)]
    .filter(Boolean)
    .join(' ');
}

/**
 * The grand total spelled out, on the Indian scale SAP uses (lakh, crore).
 *
 * SAP prints the rupees only and ends with "Only"; a bill whose amount in words
 * disagrees with its figure is the one error a customer always spots.
 */
function amountInWords(value: string | number): string {
  const rupees = Math.round(Number(value ?? 0));
  if (!Number.isFinite(rupees) || rupees === 0) return 'Zero Only';

  const scales: [number, string][] = [
    [10_000_000, 'Crore'],
    [100_000, 'Lakh'],
    [1_000, 'Thousand'],
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
  return `${rupees < 0 ? 'Minus ' : ''}${words} Only`;
}

// ---------------------------------------------------------------------------
// pagination
// ---------------------------------------------------------------------------

/** 12pt lines the description alone takes once it has wrapped. */
function descriptionLines(line: ARInvoicePrintLine): number {
  const text = line.description || line.item_code;
  return Math.max(1, Math.ceil(text.length / DESC_CHARS_PER_LINE));
}

/** 12pt lines one item occupies in the grid, batch note included. */
function rowLines(line: ARInvoicePrintLine): number {
  return descriptionLines(line) + (line.batch_no ? 1 : 0);
}

/**
 * Split the items across pages the way SAP does.
 *
 * The grid on page 1 is ruled to the bottom of the page whatever it holds, and
 * the summary needs more room than is left under it, so the summary always
 * lands on a page of its own — which is why a one-line invoice is two pages.
 */
function paginate(lines: ARInvoicePrintLine[]): ARInvoicePrintLine[][] {
  const cost = new Map(lines.map((line) => [line.line_num, rowLines(line)]));
  const pages: ARInvoicePrintLine[][] = [];
  let page: ARInvoicePrintLine[] = [];
  let used = 0;
  let capacity = SLOTS_FIRST_PAGE;

  for (const line of lines) {
    const need = cost.get(line.line_num) ?? 1;
    if (used + need > capacity && page.length) {
      pages.push(page);
      page = [];
      used = 0;
      capacity = SLOTS_MIDDLE_PAGE;
    }
    page.push(line);
    used += need;
  }
  if (page.length) pages.push(page);

  // The summary's own page. Rows only join it if they were going to fit above
  // the totals row anyway; otherwise it carries an empty grid, as SAP's does.
  const last = pages[pages.length - 1];
  const lastCost = last
    ? last.reduce((sum, line) => sum + (cost.get(line.line_num) ?? 1), 0)
    : 0;
  if (!last || lastCost > SLOTS_SUMMARY_PAGE || pages.length === 1) {
    pages.push([]);
  }
  return pages;
}

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------

export const ARInvoiceTaxInvoicePrint = forwardRef<
  HTMLDivElement,
  { invoice: ARInvoicePrintPayload }
>(function ARInvoiceTaxInvoicePrint({ invoice }, ref) {
  const pages = paginate(invoice.lines);

  return (
    <div
      ref={ref}
      style={{
        background: '#fff',
        color: '#000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        lineHeight: 1.1,
      }}
    >
      {pages.map((pageLines, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;
        return (
          <Page key={pageIndex} last={isLast} breakAfter={!isLast}>
            {isFirst ? <Masthead invoice={invoice} /> : null}
            <Grid
              lines={pageLines}
              startNumber={
                pages.slice(0, pageIndex).reduce((sum, p) => sum + p.length, 0) + 1
              }
              top={isFirst ? 394.1 : FRAME_T}
              bottom={isLast ? 433.9 : FRAME_B}
              closed={isLast}
            />
            {isLast ? <Summary invoice={invoice} /> : null}
            <Footnotes page={pageIndex + 1} of={pages.length} show={isLast} />
          </Page>
        );
      })}
    </div>
  );
});

/** One A4 sheet with the outer frame drawn on it. */
function Page({
  children,
  last,
  breakAfter,
}: {
  children: React.ReactNode;
  last: boolean;
  breakAfter: boolean;
}) {
  const bottom = last ? FRAME_B_LAST : FRAME_B;
  return (
    <div
      style={{
        position: 'relative',
        width: `${PAGE_W}pt`,
        height: `${PAGE_H}pt`,
        overflow: 'hidden',
        breakAfter: breakAfter ? 'page' : 'auto',
        pageBreakAfter: breakAfter ? 'always' : 'auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${FRAME_L}pt`,
          top: `${FRAME_T}pt`,
          width: `${FRAME_R - FRAME_L}pt`,
          height: `${bottom - FRAME_T}pt`,
          border: RULE,
          boxSizing: 'border-box',
        }}
      />
      {children}
    </div>
  );
}

/** Absolute placement in page coordinates — every block on the sheet uses it. */
function At({
  x,
  y,
  w,
  h,
  children,
  size = 5.8,
  bold = false,
  italic = false,
  align = 'left',
  font,
  style,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  children?: React.ReactNode;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  font?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}pt`,
        top: `${y}pt`,
        ...(w != null ? { width: `${w}pt` } : {}),
        ...(h != null ? { height: `${h}pt` } : {}),
        fontSize: `${size}pt`,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        textAlign: align,
        ...(font ? { fontFamily: font } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A horizontal rule at a measured position. */
function HRule({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x1}pt`,
        top: `${y}pt`,
        width: `${x2 - x1}pt`,
        borderTop: RULE,
      }}
    />
  );
}

/** A vertical rule at a measured position. */
function VRule({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}pt`,
        top: `${y1}pt`,
        height: `${y2 - y1}pt`,
        borderLeft: RULE,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// masthead — everything above the item grid, page 1 only
// ---------------------------------------------------------------------------

function Masthead({ invoice }: { invoice: ARInvoicePrintPayload }) {
  const { company, bill_to: billTo, ship_to: shipTo } = invoice;
  const TAHOMA = 'Tahoma, Verdana, sans-serif';

  return (
    <>
      {/* ---- top strip: copy marker, customer strip, barcode ---- */}
      <At x={17.5} y={17.6} size={7.4} bold font={TAHOMA}>
        {STATIC_LETTERHEAD.copy}
      </At>
      <At x={330} y={16.3} w={222.3} size={7.4} bold align="right" font={TAHOMA}>
        {[invoice.customer_code, invoice.trade, invoice.state_group].filter(Boolean).join(' - ')}
      </At>
      <At x={552.3} y={18.2} size={5.8} bold font={TAHOMA}>
        ({invoice.doc_entry})
      </At>
      <div style={{ position: 'absolute', left: '422.7pt', top: '22pt' }}>
        <DocBarcode value={String(invoice.doc_entry)} />
      </div>

      {/* ---- letterhead ---- */}
      <At x={46} y={36} size={12.2} bold font="'Comic Sans MS', 'Segoe Print', cursive">
        {STATIC_LETTERHEAD.title}
      </At>
      <img
        src="/JivoWellnessLogo.png"
        alt=""
        style={{
          position: 'absolute',
          left: '52pt',
          top: '52pt',
          width: '104pt',
          height: '50pt',
          objectFit: 'contain',
        }}
      />
      <At x={170} y={33.5} w={266} size={12.2} bold align="center">
        {STATIC_LETTERHEAD.name}
      </At>
      <At x={170} y={51} w={266} size={6.9} bold align="center" style={{ lineHeight: 1.4 }}>
        {company.address}
      </At>

      <At x={38.1} y={112.5} size={8.8} bold>
        {STATIC_LETTERHEAD.customerContact}
      </At>
      <At x={198} y={111} size={8.8} bold>
        {STATIC_LETTERHEAD.email}
      </At>
      <At x={301.8} y={111} size={8.8} bold>
        {STATIC_LETTERHEAD.website}
      </At>

      {/* The e-invoicing block. Empty on a bill that was never e-invoiced —
          which is what SAP prints too, rather than hiding the rows. */}
      <At x={20.5} y={129} size={8.8} bold>
        IRN : {invoice.irn}
      </At>
      <At x={18} y={147} size={8.8} bold>
        Ack. No : {invoice.ack_no}
      </At>
      <At x={211.8} y={147} size={8.8} bold>
        Ack. Date : {sapDate(invoice.ack_date)}
      </At>

      <HRule x1={FRAME_L} x2={456} y={126.2} />
      <VRule x={456.2} y1={54} y2={164.1} />
      <HRule x1={456} x2={FRAME_R} y={54.2} />
      <HRule x1={FRAME_L} x2={FRAME_R} y={164.3} />

      {/* ---- banded row ---- */}
      <div
        style={{
          position: 'absolute',
          left: `${FRAME_L}pt`,
          top: '164.3pt',
          width: `${FRAME_R - FRAME_L}pt`,
          height: '19.8pt',
          background: '#d9d9d9',
        }}
      />
      <At x={19} y={164.5} size={8.3} bold font={TAHOMA}>
        Invoice Number : {invoice.doc_num ?? ''}
      </At>
      <At x={197.2} y={165.2} size={5.8} bold font={TAHOMA}>
        PO No. : {invoice.customer_ref}
      </At>
      <At x={366} y={164.5} size={8.3} bold font={TAHOMA}>
        Invoice Date : <span style={{ fontSize: '8.8pt' }}>{sapDate(invoice.doc_date, false)}</span>
      </At>
      <HRule x1={FRAME_L} x2={FRAME_R} y={184.1} />
      <VRule x={196} y1={164.1} y2={250} />
      <VRule x={365.2} y1={164.1} y2={250} />

      {/* ---- detail block ---- */}
      <DetailColumn
        x={20}
        rows={[
          ['GSTIN Number : ', company.gstin],
          ['Company PAN : ', company.pan],
          ['Tax Is Payable On Reverse Charge : ', invoice.reverse_charge],
          [STATIC_LETTERHEAD.cin, ''],
          [`FSSAI Lic No. ${company.fssai_no}`, ''],
          [STATIC_LETTERHEAD.customerCare, ''],
        ]}
        tops={[184.5, 194.2, 204.5, 215.7, 228, 239.5]}
      />
      <DetailColumn
        x={199.5}
        rows={[
          ['Payment Due Date: ', sapDate(invoice.due_date)],
          ['Shipping Terms: ', ''],
          ['Payment Terms : ', invoice.payment_terms],
        ]}
        tops={[185.5, 195.5, 205]}
      />
      <HRule x1={195.8} x2={365} y={215.8} />
      <DetailColumn
        x={199.5}
        rows={[
          ['Name : ', invoice.contact_name],
          ['Cust. Contact No: ', invoice.contact_mobile],
          ['Email Id: ', invoice.contact_email],
        ]}
        tops={[217.5, 227, 238.2]}
      />
      <At x={367} y={184.5} size={5.8} bold font={TAHOMA}>
        Transportation Mode: (Apply for Supply of Goods only)
      </At>
      <At x={367} y={200.5} size={5.8} bold font={TAHOMA}>
        Veh.No : {invoice.vehicle_no}
      </At>
      <At x={367} y={213} size={6.6} bold font={TAHOMA}>
        Dispatch Date: {sapDate(invoice.dispatch_date)}
      </At>
      <DetailColumn
        x={367}
        rows={[['Place of Supply : ', invoice.place_of_supply]]}
        tops={[226]}
      />
      <At x={367} y={236.4} size={5.8} bold font={TAHOMA}>
        Way Bill No.:{invoice.way_bill_no}
      </At>
      <HRule x1={FRAME_L} x2={FRAME_R} y={250} />

      {/* ---- Bill to / Ship to ---- */}
      <At x={FRAME_L} y={252} w={306 - FRAME_L} size={8.3} bold align="center" font={TAHOMA}>
        Bill to
      </At>
      <At x={306} y={252} w={FRAME_R - 306} size={8.3} bold align="center" font={TAHOMA}>
        Ship to
      </At>
      <HRule x1={FRAME_L} x2={FRAME_R} y={263} />
      <VRule x={306} y1={250} y2={394.1} />

      <PartyBlock x={24} labelX={24} valueX={66} party={billTo} addressValueX={65.1} />
      <PartyBlock x={312} labelX={312} valueX={354} party={shipTo} addressValueX={346.8} />

      {/* The customer's own FSSAI licence, which SAP prints on the bill-to
          side only. Blank for a partner that has not given one. */}
      <At x={25.2} y={355.5} size={8.8} bold>
        FSSAI No:{invoice.customer_fssai ? ` ${invoice.customer_fssai}` : ''}
      </At>
      <At x={24} y={368.5} size={7.4} bold font={TAHOMA}>
        State : {billTo.state_name}
        {' '.repeat(11)}State Code : {billTo.state_code}
      </At>
      <At x={312} y={368.5} size={7.4} bold font={TAHOMA}>
        State Code : {shipTo.state_code} &amp; State Name : {shipTo.state_name}
      </At>
      <At x={24} y={381.5} size={7.4} bold font={TAHOMA}>
        GSTIN Number : {billTo.gstin}
      </At>
      <At x={312} y={381.5} size={7.4} bold font={TAHOMA}>
        GSTIN Number : {shipTo.gstin}
      </At>
    </>
  );
}

/** A stack of `label: value` lines at measured tops, as the detail cells set them. */
function DetailColumn({
  x,
  rows,
  tops,
}: {
  x: number;
  rows: [string, string][];
  tops: number[];
}) {
  return (
    <>
      {rows.map(([label, value], i) => (
        <At key={label + i} x={x} y={tops[i]} size={5.8} bold font="Tahoma, Verdana, sans-serif">
          {label}
          {value ? <span style={{ fontWeight: 'normal' }}>{value}</span> : null}
        </At>
      ))}
    </>
  );
}

function PartyBlock({
  labelX,
  valueX,
  addressValueX,
  party,
}: {
  x: number;
  labelX: number;
  valueX: number;
  addressValueX: number;
  party: { name: string; address: string };
}) {
  return (
    <>
      <At x={labelX} y={262.5} size={8.8} bold>
        Name :
      </At>
      <At x={valueX} y={262.5} w={FRAME_R - valueX - 6} size={8.8} bold>
        {party.name}
      </At>
      <At x={labelX} y={277} size={8.3} bold font="Tahoma, Verdana, sans-serif">
        Address :
      </At>
      <At
        x={addressValueX}
        y={278}
        w={(labelX < 300 ? 306 : FRAME_R) - addressValueX - 4}
        size={6.6}
        bold
        font="Tahoma, Verdana, sans-serif"
      >
        {party.address}
      </At>
    </>
  );
}

// ---------------------------------------------------------------------------
// item grid
// ---------------------------------------------------------------------------

/**
 * The ruled item grid: a header band, the rows, then empty ruled space down to
 * `bottom`. The verticals run the full height whether or not there are rows,
 * which is what makes SAP's sheet look the way it does.
 */
function Grid({
  lines,
  startNumber,
  top,
  bottom,
  closed,
}: {
  lines: ARInvoicePrintLine[];
  startNumber: number;
  top: number;
  bottom: number;
  closed: boolean;
}) {
  const bodyTop = top + GRID_HEADER_H;
  let cursor = bodyTop;

  return (
    <>
      <HRule x1={FRAME_L} x2={FRAME_R} y={top} />
      <HRule x1={FRAME_L} x2={FRAME_R} y={bodyTop} />
      {COL_EDGES.slice(1, -1).map((x) => (
        <VRule key={x} x={x} y1={top} y2={bottom} />
      ))}
      {closed ? <HRule x1={FRAME_L} x2={FRAME_R} y={bottom} /> : null}

      <GridHeader top={top} />

      {lines.map((line, i) => {
        const y = cursor;
        cursor += rowLines(line) * ROW_H;
        return <GridRow key={line.line_num} line={line} number={startNumber + i} y={y} />;
      })}
    </>
  );
}

function GridHeader({ top }: { top: number }) {
  const TAHOMA = 'Tahoma, Verdana, sans-serif';
  const cell = (i: number) => ({ x: COL_EDGES[i], w: COL_WIDTHS[i] });
  const head = (i: number, children: React.ReactNode, size = 8.3, dy = 0) => {
    const { x, w } = cell(i);
    return (
      <At
        x={x}
        y={top + 1.5 + dy}
        w={w}
        size={size}
        bold
        align="center"
        font={TAHOMA}
        style={{ lineHeight: 1.45 }}
      >
        {children}
      </At>
    );
  };

  return (
    <>
      {head(0, <>S.<br />No</>, 7.4)}
      <At x={COL_EDGES[1] + 3} y={top + 2.5} size={8.3} bold font={TAHOMA}>
        Description of Goods
      </At>
      {head(2, <>God<br />own</>)}
      {head(3, <>HSN/SAC<br />Code</>)}
      {head(4, 'Box + Loose')}
      {head(5, <>Total<br />Qty</>)}
      {head(6, <>Rate<br />Per<br />Bottle</>)}
      {head(7, <>Dis.<br />%</>)}
      {head(8, <>Net Rate<br />Per<br />Bottle</>)}
      {head(9, <>Taxable<br />value<br />[INR]</>)}
    </>
  );
}

function GridRow({
  line,
  number,
  y,
}: {
  line: ARInvoicePrintLine;
  number: number;
  y: number;
}) {
  const TAHOMA = 'Tahoma, Verdana, sans-serif';
  /** Right-aligned figure in column `i`, inset by its measured right padding. */
  const num = (i: number, text: string, pad: number) => (
    <At
      x={COL_EDGES[i]}
      y={y + 1.3}
      w={COL_WIDTHS[i] - pad}
      size={8.1}
      align="right"
      font="Arial, Helvetica, sans-serif"
    >
      {text}
    </At>
  );

  return (
    <>
      <At x={COL_EDGES[0]} y={y + 1.2} w={COL_WIDTHS[0]} size={8.3} align="center" font={TAHOMA}>
        {number}
      </At>
      <At x={COL_EDGES[1] + 1.3} y={y + 1.3} w={COL_WIDTHS[1] - 3} size={8.1}>
        {line.description || line.item_code}
      </At>
      {line.batch_no ? (
        <At
          x={COL_EDGES[1] + 1.3}
          y={y + descriptionLines(line) * ROW_H + 1.3}
          w={COL_WIDTHS[1] - 3}
          size={6.2}
          bold
          italic
        >
          (Batch No: {line.batch_no})
        </At>
      ) : null}
      <At x={COL_EDGES[2]} y={y + 1.5} w={COL_WIDTHS[2]} size={6.6} align="center" font={TAHOMA}>
        {line.warehouse_code}
      </At>
      {num(3, line.hsn, 0)}

      {/* Box + Loose is one column with four pieces at measured offsets, not
          four sub-columns: SAP rules no verticals inside it. */}
      <At x={COL_EDGES[4]} y={y + 1.3} w={18} size={8.1} align="right">
        {nWhole(line.boxes)}
      </At>
      <At x={COL_EDGES[4] + 24} y={y + 1.5} size={7.8} bold>
        Box
      </At>
      <At x={COL_EDGES[4] + 37} y={y + 1.5} w={18.2} size={8.1} align="right">
        {n2(line.loose_qty)}
      </At>
      <At x={COL_EDGES[4] + 69} y={y + 1.4} size={7} bold italic>
        {line.loose_uom}
      </At>

      {num(5, n2(line.quantity), 3.2)}
      {num(6, n2(line.rate_per_bottle), 0)}
      {num(7, n2(line.discount_pct), 0)}
      {num(8, n2(line.net_rate_per_bottle), 0)}
      {num(9, n2(line.taxable_value), 4)}
    </>
  );
}

// ---------------------------------------------------------------------------
// summary — the last page, below the grid
// ---------------------------------------------------------------------------

function Summary({ invoice }: { invoice: ARInvoicePrintPayload }) {
  const TAHOMA = 'Tahoma, Verdana, sans-serif';
  const t = invoice.totals;

  /* The totals row merges Total Qty with Rate, and Net Rate with Taxable, so it
     rules no vertical at x 390 or 522 — the empty Dis. % cell either side of
     x 444/468 is still ruled. */
  const TOTALS_TOP = 433.9;
  const TOTALS_BOTTOM = 447.5;

  const taxRows = invoice.tax_summary;
  const TAX_TOP = 478.6;
  const TAX_ROW_H = 15.3;
  const ROUND_OFF_TOP = 573;
  const TOTAL_TOP = 598.6;
  const TCS_TOP = 610.6;
  const GRAND_TOP = 622.6;
  const BLOCKS_TOP = 634.8;

  return (
    <>
      {/* ---- totals row ---- */}
      <HRule x1={FRAME_L} x2={FRAME_R} y={TOTALS_BOTTOM} />
      {[COL_EDGES[1], COL_EDGES[2], COL_EDGES[3], COL_EDGES[4], COL_EDGES[7], COL_EDGES[8]].map(
        (x) => (
          <VRule key={`t${x}`} x={x} y1={TOTALS_TOP} y2={TOTALS_BOTTOM} />
        ),
      )}
      <At x={210} y={TOTALS_TOP + 1.5} size={8.3} bold font={TAHOMA}>
        Total :
      </At>
      <At x={COL_EDGES[4] + 42} y={TOTALS_TOP + 0.8} size={8.8} bold>
        {nWhole(t.boxes)} Box
      </At>
      <At x={COL_EDGES[5] + 6} y={TOTALS_TOP + 2} size={8.8} bold>
        {nWhole(t.loose_qty)} {t.loose_uom}
      </At>
      <At x={COL_EDGES[8]} y={TOTALS_TOP + 2.2} w={FRAME_R - COL_EDGES[8] - 2.4} size={7.4} bold
        align="right" font={TAHOMA}>
        {n2(t.taxable_value)}
      </At>

      {/* ---- amount in words / amount before freight ---- */}
      <At x={24} y={447.8} size={5.8} font={TAHOMA}>
        Amount(Words):&nbsp; {amountInWords(t.grand_total)}
      </At>
      <At x={388.4} y={446.5} size={7.4} bold font={TAHOMA}>
        Amt before freight &amp; Disc [INR
      </At>
      <At x={507.5} y={448} w={FRAME_R - 507.5 - 2.4} size={7.4} bold align="right" font={TAHOMA}>
        {n2(t.taxable_value)}
      </At>
      <HRule x1={FRAME_L} x2={FRAME_R} y={460.5} />

      {/* ---- HSN table (left) ---- */}
      <At x={24} y={464.3} size={6.9} bold>
        HSN Code
      </At>
      <At x={123.9} y={462.5} size={6.9} bold>
        Taxable Value
      </At>
      <At x={223.9} y={462.5} size={6.9} bold>
        Tax Rate %
      </At>
      <At x={300} y={462.5} w={73.9} size={6.9} bold align="right">
        Total Tax
      </At>
      <HRule x1={FRAME_L} x2={FRAME_R} y={TAX_TOP} />
      {invoice.hsn_summary.map((row, i) => (
        <div key={row.hsn || i}>
          <At x={23} y={TAX_TOP + 1.7 + i * 12} size={7.2}>
            {row.hsn}
          </At>
          <At x={100} y={TAX_TOP + 1.7 + i * 12} w={56.6} size={7.2} align="right">
            {n2(row.taxable_value)}
          </At>
          <At x={190} y={TAX_TOP + 1.7 + i * 12} w={53.6} size={7.2} align="right">
            {n2(row.tax_rate)}
          </At>
          <At x={310} y={TAX_TOP + 1.7 + i * 12} w={63.9} size={7.2} align="right">
            {n2(row.total_tax)}
          </At>
        </div>
      ))}

      {/* ---- money stack (right) ---- */}
      <VRule x={377} y1={460.5} y2={BLOCKS_TOP} />
      <VRule x={507.5} y1={460.5} y2={BLOCKS_TOP} />
      <MoneyRow y={462.8} label="Discount INR" value={n2(t.discount)} />
      {taxRows.map((row, i) => (
        <MoneyRow
          key={row.label || i}
          y={TAX_TOP + 0.5 + i * TAX_ROW_H}
          label={row.label}
          value={n2(row.amount)}
          arial
        />
      ))}
      <MoneyRow y={ROUND_OFF_TOP} label="Round Off [INR]" value={n2(t.round_off)} />
      <HRule x1={378} x2={FRAME_R} y={TOTAL_TOP} />
      <MoneyRow y={TOTAL_TOP + 1.2} label="Total" value={n2(t.total)} />
      <HRule x1={378} x2={FRAME_R} y={TCS_TOP} />
      <MoneyRow y={TCS_TOP + 1.2} label={"TCS  0.1%"} value={n2(t.tcs)} />
      <HRule x1={378} x2={FRAME_R} y={GRAND_TOP} />
      <MoneyRow y={GRAND_TOP + 1.2} label="Grand Total [INR]" value={n2(t.grand_total)} />
      <HRule x1={FRAME_L} x2={FRAME_R} y={BLOCKS_TOP} />

      {/* ---- product category / bank / remarks ---- */}
      <At x={48} y={634.6} size={8.9}>
        ▼&nbsp; Product Category&nbsp; ▼
      </At>
      <HRule x1={FRAME_L} x2={174} y={649.8} />
      <VRule x={174} y1={635.1} y2={778.1} />
      <div
        style={{
          position: 'absolute',
          left: '18.5pt',
          top: '656.8pt',
          width: '151pt',
          height: '38.1pt',
          border: HAIRLINE,
          boxSizing: 'border-box',
        }}
      />
      <At x={23} y={658.6} size={8.8} bold>
        Category
      </At>
      <At x={76.5} y={658.6} size={8.8} bold>
        Litre
      </At>
      <At x={110} y={658.6} size={8.8} bold>
        Gross Wt
      </At>
      {invoice.category_summary.map((row, i) => (
        <div key={row.category || i}>
          <At x={23} y={670.3 + i * 10} size={7.2}>
            {row.category}
          </At>
          <At x={62} y={671.8 + i * 10} w={30} size={7.2} align="right">
            {n4(row.litres)}
          </At>
          <At x={132} y={671.8 + i * 10} w={38} size={7.2} align="right">
            {n4(row.gross_weight)}
          </At>
        </div>
      ))}
      <At x={23} y={681.7} size={7.8} bold>
        Total
      </At>
      <At x={70} y={681.7} w={34.5} size={7.8} bold align="right">
        {n2(invoice.totals.litres)}
      </At>
      <At x={130} y={681.7} w={34.3} size={7.8} bold align="right">
        {n2(invoice.totals.gross_weight)}
      </At>

      <At x={179.5} y={638.5} size={6.6} bold italic font={TAHOMA}
        style={{ borderBottom: HAIRLINE, display: 'inline-block' }}>
        RTGS/NEFT Details:
      </At>
      {['Bank Name', 'A/c No.', 'IFSC Code', 'Bank Address'].map((label, i) => (
        <At key={label} x={179.5} y={650.5 + i * 12} size={7.4} italic font={TAHOMA}>
          {label}
        </At>
      ))}
      <VRule x={408} y1={634.1} y2={705} />
      <At x={414} y={638.6} w={FRAME_R - 418} size={6.6} bold font={TAHOMA}>
        Remarks :- {invoice.comments}
      </At>

      <HRule x1={180} x2={FRAME_R} y={700.2} />
      <At
        x={174}
        y={699.9}
        w={FRAME_R - 174 - 6}
        size={5.2}
        bold
        // Justified, as SAP sets it — the block's ragged right edge is the most
        // obvious tell that a sheet is not the one the customer received.
        style={{ lineHeight: 1.42, textAlign: 'justify' }}
      >
        {STATIC_LETTERHEAD.terms}
      </At>

      {/* ---- footer inside the frame ---- */}
      <HRule x1={FRAME_L} x2={FRAME_R} y={778.1} />
      <At x={24} y={779.8} size={6.6} font={TAHOMA}>
        Verified By
      </At>
      <At x={330} y={779} size={7.2}>
        Received By
      </At>
      <At x={484.6} y={779.5} size={6.9} bold>
        {STATIC_LETTERHEAD.signatory}
      </At>
      <At x={FRAME_L} y={786.3} w={FRAME_R - FRAME_L} size={8.8} bold align="center">
        {STATIC_LETTERHEAD.registeredOffice}
      </At>
      <At x={510} y={790.4} size={5.4}>
        Authorised Signatory
      </At>
    </>
  );
}

function MoneyRow({
  y,
  label,
  value,
  arial = false,
}: {
  y: number;
  label: string;
  value: string;
  arial?: boolean;
}) {
  const font = arial ? undefined : 'Tahoma, Verdana, sans-serif';
  return (
    <>
      <At x={384} y={y} size={arial ? 8.8 : 8.3} bold font={font}>
        {label}
      </At>
      <At
        x={507.5}
        y={y}
        w={FRAME_R - 507.5 - 2.4}
        size={arial ? 8.8 : 8.3}
        bold
        align="right"
        font={font}
      >
        {value}
      </At>
    </>
  );
}

/** The lines below the frame, on the summary page only. */
function Footnotes({ page, of, show }: { page: number; of: number; show: boolean }) {
  if (!show) return null;
  return (
    <>
      <At x={FRAME_L} y={800.5} w={FRAME_R - FRAME_L} size={5.4} align="center">
        {STATIC_LETTERHEAD.computerGenerated}
      </At>
      <At x={FRAME_L} y={807.6} w={FRAME_R - FRAME_L} size={5.4} align="center">
        {STATIC_LETTERHEAD.jurisdiction}
      </At>
      <At x={500} y={800.4} w={65.7} size={5.4} align="right">
        Page {page} of {of}
      </At>
    </>
  );
}

/** CODE39 over the DocEntry — the same barcode SAP puts in the corner. */
function DocBarcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !value) return;
    try {
      JsBarcode(svg, value, {
        format: 'CODE39',
        width: 1.35,
        height: 28,
        displayValue: false,
        margin: 0,
      });
    } catch {
      // Not a value CODE39 can carry — leave the corner empty rather than
      // printing a barcode that scans as something else.
    }
  }, [value]);

  return <svg ref={svgRef} />;
}
