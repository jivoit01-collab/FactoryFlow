import { forwardRef } from 'react';

import type { POPrintHSNRow, POPrintLine, POPrintPayload, POPrintTotalRow } from '../types';

/**
 * SAP's Purchase Order, reproduced from a SAP-generated PDF.
 *
 * The vendor and the stores already hold SAP's copy of this order, so a
 * near-miss is worse than an obvious redesign — anything that reads differently
 * is something somebody has to reconcile. Every measurement below was taken off
 * the printed original (Beverages PO 826228032): the rule positions and column
 * edges come from the PDF's own vector geometry and the text positions and font
 * sizes from its text spans, rather than being estimated off a screenshot.
 *
 * Everything is in POINTS on a 595 x 842pt A4 page. `fontSize: 8.75` in a React
 * style means 8.75 *pixels*, a quarter smaller than the 8.75pt SAP sets, so
 * every size here carries its unit.
 *
 * The document geometry, in page coordinates:
 *
 *   frame           12, 13.8 -> 570, 793.5
 *   masthead        title 18,19.8; logo 18,48 -> 110.2,88.5; address centred on
 *                   298; registrations right-aligned to 563.7; rules 143.6/149.3
 *   header block    y 149.3 -> 334.8, split at x 306.5; the left column divided
 *                   again at y 233.6 (Bill From above, Ship To below)
 *   approval        box 306,305 -> 484.8,333.8; approver right of x 456.5
 *   item grid       header y 334.8 -> 372, then 17.5pt rows
 *   totals          grid total row -> 467.3, "before freight" -> 480.3, words
 *                   and discount -> 512.5, HSN strip and tax -> 560.5,
 *                   invoice total -> 578
 *   terms           y 607 -> 757, split at x 228.5; signatures -> 775.3;
 *                   registered office -> 793.5, then the strip below the frame
 *
 * Three sets of vertical rules run down this sheet and they do not line up with
 * each other, which is why ``COL_EDGES`` below is their union rather than the
 * item grid's own edges:
 *
 *   item grid       33 | 192 | 276 | 321.2 | 366 | 426 | 456 | 510
 *   grid total row  33 | 192 |             | 366 | 426 | 456 | 510
 *   money rows      371 | 492.5   (starting at y 480.8 and 483.8)
 *   header split    306.5, and the terms block's 228.5
 *
 * The last two never move with the number of item lines, so they are drawn as
 * placed rules rather than cell borders; everything else is a cell edge.
 *
 * Three things in the original are deliberately not reproduced, because copying
 * them would read as a defect in this sheet rather than as fidelity:
 *
 * * Crystal clips the state names to their field width, so the printed original
 *   says "DADRA AND NAGAR HAVELI AND DA" twice. The full name is printed here.
 * * A vertical rule at x 426 starts at y 327.5, seven points above the grid it
 *   belongs to — a Crystal frame drawn taller than its own row. Drawn from the
 *   grid's top edge here.
 * * The x 492.5 divider runs behind the boxed tax rows, which are a Crystal
 *   frame drawn over it. The box wins here and the divider stops at it.
 *
 * What SAP prints and this reproduces exactly, however odd it looks: the empty
 * "Packing Slip No.", "Payment Due Date" and ship-to contact lines, the
 * "Qty (Unit)" column that prints no unit, a `Disc. %` cell left blank rather
 * than zeroed, and "Amount(Words)" pluralising lakhs but not thousands. The
 * backend reader's docstring explains where each comes from.
 */

const PAGE_W = 595;
const PAGE_H = 842;

const FRAME_L = 12;
const FRAME_R = 570;
const FRAME_T = 13.8;
const FRAME_B = 793.5;

const RULE = '0.6pt solid #000';

const ARIAL = 'Arial, Helvetica, sans-serif';
const ARIAL_BLACK = '"Arial Black", Arial, Helvetica, sans-serif';
const TAHOMA = 'Tahoma, Geneva, sans-serif';

/**
 * The union of every vertical rule on the sheet (see the note above), so one
 * table can draw the item grid, its total row and the money rows below it.
 */
const COL_EDGES = [12, 33, 192, 276, 321.2, 366, 371, 426, 456, 492.5, 510, 570];
const COL_WIDTHS = COL_EDGES.slice(1).map((edge, i) => edge - COL_EDGES[i]);

/** Spans over ``COL_EDGES`` for the three sets of columns. */
const GRID = { sno: 1, desc: 1, details: 1, hsn: 1, qty: 1, rate: 2, disc: 1, net: 2, value: 1 };
/** 12 -> 371, 371 -> 492.5, 492.5 -> 570: the money rows under the grid. */
const MONEY = { left: 6, label: 3, amount: 2 };

/** Row heights, off the original's horizontal rules. */
const H_MASTHEAD = 129.8; // 13.8  -> 143.6
const H_RULE_BAND = 5.7; // 143.6 -> 149.3  the masthead's double rule
const H_HEADER = 185.5; // 149.3 -> 334.8
const H_GRID_HEAD = 37.2; // 334.8 -> 372
const H_ITEM = 17.5; // one item row
const H_GRID_TOTAL = 12.8; // 454.5 -> 467.3  the grid's own column totals
const H_MONEY_ROW = 13; // 467.3 -> 480.3  and each charge row under it
const H_DISCOUNT = 32.2; // 480.3 -> 512.5  amount in words beside it
const H_TAX_REGION = 48; // 512.5 -> 560.5  HSN strip beside the tax rows
const H_GRAND = 17.5; // 560.5 -> 578
const H_TERMS_GAP = 29; // 578   -> 607  unruled band above the terms
const H_TERMS = 150; // 607   -> 757
const H_SIGNATURES = 18.3; // 757   -> 775.3
const H_REGISTERED = 18.2; // 775.3 -> 793.5

/** The stacked rows inside the tax region, which is why it can outgrow 48pt. */
const H_HSN_HEAD = 13.9; // 512.5 -> 526.4
const H_HSN_ROW = 18.5; // one HSN row, and one tax row

/** Where the Bill From block gives way to Ship To, within the header block. */
const HEADER_SPLIT_Y = 233.6;
/** Where the header block's own two columns divide. */
const HEADER_SPLIT_X = 306.5;

const FRAME_H = FRAME_B - FRAME_T;

export const PO_PRINT_STYLE = `
  @page { size: A4 portrait; margin: 0; }
  @media print {
    body { margin: 0; background: #fff !important; }
  }
`;

/**
 * The parts of the sheet that live only in SAP's Crystal layout.
 *
 * These are not on the document and not in any table the order reads. `OADM`
 * carries the trading name rather than this one ("(BEVERAGE UNIT) JIVO WELLNESS
 * PVT LTD") and no usable postal address, so there is nowhere else to get them.
 * Note that the letterhead address, GST number, PAN and FSSAI licence are NOT
 * here: those are real per-location data and arrive on the payload, which is
 * why a Ganaur order and a Delhi one print different addresses.
 */
const STATIC_LETTERHEAD = {
  title: 'Purchase Order',
  name: ' Jivo Wellness Pvt. Ltd.',
  cin: 'CIN No. U01100DL2010PTC207768',
  customerCare:
    '  Customer Care No. :1800 137 4433              Email : info@jivo.in                Website: www.jivo.in',
  registeredOfficeLabel: 'Registered Office:',
  registeredOffice: 'J-3/190, GF Rajouri Garden, New Delhi - 110027, India',
  jurisdiction: 'Subject to DELHI Jurisdiction',
  computerGenerated: 'This is a Computer Generated invoice, Signature is not required.',
  signatory: 'For Jivo Wellness Pvt. Ltd.',
  signatures: ['Received By', 'Verified By', 'Checked By'],
  authorisedSignatory: 'Authorised Signatory',
  terms:
    'Terms & condition:1) Any loss of GST input credit shall be recovered from the supplier.' +
    '2) Any taxes or duties imposed after the date of this order shall be borne by the respective ' +
    'parties, as applicable. 3) All invoices must be submitted along with all supporting documents ' +
    'to avoid delays.4) Any delay must be communicated promptly; failure to do so may result in a ' +
    'penalty.5) The Company is not liable for delays caused by uncontrollable events, and payment ' +
    'timelines may be suspended, extended, or cancelled without liability. 6) The Company may ' +
    'cancel or modify this order at its discretion without penalty. However, cancellation of this ' +
    'order by the supplier shall be subject to any cancellation or incidental charges. 7)These ' +
    'terms and conditions constitute a binding and unconditional agreement between the parties. ' +
    '8) All disputes are subject to New Delhi court jurisdiction.',
};

/**
 * The banner over the masthead, which is layout text and differs per company.
 *
 * Only the Beverages sheet has been seen printed, so only Beverages carries
 * one. Guessing a wording for the other two would put a made-up line on a
 * document that goes to a vendor.
 */
const COMPANY_BANNER: Record<string, string> = {
  JIVO_BEVERAGES: 'ONLY FOR BEVERAGES',
};

// ---------------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------------

/** Money, grouped Indian-style to two places as the GST strip prints it. */
function n2(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  // Rounding -0.0001 gives "-0.00"; SAP prints "0.00", and a minus sign on a
  // zero charge reads as a credit to whoever checks the order.
  const rounded = Math.abs(n) < 0.005 ? 0 : n;
  return rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Rates, to the four places the Rate and Net Rate columns carry. */
function n4(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.0000';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

/** Two places and no separators — how the totals column itself prints. */
function plain2(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  return (Math.abs(n) < 0.005 ? 0 : n).toFixed(2);
}

/** Whole quantities, as the grid's total row writes them. */
function nWhole(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? String(Math.round(n)) : '0';
}

/** "10.08.2026" — how the PO date prints. */
function dottedDate(value?: string | null): string {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  if (!y || !m || !d) return String(value);
  return `${d}.${m}.${y}`;
}

/** "10/8/2026" — how the ship date prints, unpadded. */
function slashDate(value?: string | null): string {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** Two digits, hyphenated the way SAP writes them ("Twenty-One"). */
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
 * The grand total spelled out, on the Indian scale SAP uses.
 *
 * This layout pluralises the big scales and not the small ones — the reference
 * sheet reads "Twenty-One Lakhs Eighty-Five Thousand Five Hundred Ninety-Six
 * Only", with "Lakhs" plural and "Thousand" singular. "Crores" is the
 * consistent inference from that; no printed order large enough to show it has
 * been seen. Note this differs from the A/R invoice sheet, which writes "Lakh"
 * — the two Crystal layouts spell it differently and each is reproduced as it
 * prints.
 */
function amountInWords(value: string | number): string {
  const rupees = Math.round(Number(value ?? 0));
  if (!Number.isFinite(rupees) || rupees === 0) return 'Zero Only';

  const scales: [number, string][] = [
    [10_000_000, 'Crores'],
    [100_000, 'Lakhs'],
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

/** How tall the tax region is: the taller of the GST strip and the tax box. */
function taxRegionHeight(taxRowCount: number, hsnRowCount: number): number {
  return Math.max(
    H_TAX_REGION,
    H_HSN_HEAD + H_HSN_ROW * Math.max(1, hsnRowCount),
    H_HSN_ROW * Math.max(1, taxRowCount),
  );
}

/**
 * How tall everything under the last item row is, for the order in hand.
 *
 * The unruled band above the terms belongs to this measurement, not to the
 * grid: SAP's totals sit at a fixed distance off the bottom of the frame, so
 * the empty space on a short order collects *inside* the item grid (see
 * ``OrderPage``). Getting that the wrong way round floats the totals up under
 * the single line of a one-item order, which is most of them.
 */
function summaryHeight(order: POPrintPayload): number {
  const charges = (order.totals.expenses ? 1 : 0) + (order.totals.round_off ? 1 : 0);
  return (
    H_GRID_TOTAL +
    H_MONEY_ROW * (1 + charges) +
    H_DISCOUNT +
    taxRegionHeight(order.totals.taxes.length, order.hsn_summary.length) +
    H_GRAND +
    H_TERMS_GAP
  );
}

/**
 * Description-column width minus its padding, over the width of a character at
 * 8.1pt Arial — how a long description is known to wrap onto a second line.
 */
const DESC_CHARS_PER_LINE = 33;

/** 17.5pt slots one item occupies in the grid once its description has wrapped. */
function rowSlots(line: POPrintLine): number {
  const text = line.description || line.item_code;
  return Math.max(1, Math.ceil(text.length / DESC_CHARS_PER_LINE));
}

/**
 * How many 17.5pt slots the grid has on a page.
 *
 * The masthead, the header block and the whole bottom of the sheet — terms,
 * signatures, registered office — repeat on every page; the totals, the amount
 * in words and the GST strip only ever sit under the last item row, which is
 * why the final page holds fewer rows than a continuation one. A single-line
 * order is one page, as SAP prints it.
 */
function slotsPerPage(summary: number, isLast: boolean): number {
  const fixed =
    H_MASTHEAD +
    H_RULE_BAND +
    H_HEADER +
    H_GRID_HEAD +
    H_TERMS +
    H_SIGNATURES +
    H_REGISTERED +
    (isLast ? summary : 0);
  return Math.max(1, Math.floor((FRAME_H - fixed) / H_ITEM));
}

const slotsOf = (lines: POPrintLine[]): number =>
  lines.reduce((sum, line) => sum + rowSlots(line), 0);

/** The item rows split across pages, last page first-class (it carries totals). */
function paginate(lines: POPrintLine[], summary: number): POPrintLine[][] {
  const lastCapacity = slotsPerPage(summary, true);
  if (slotsOf(lines) <= lastCapacity) return [lines];

  const contCapacity = slotsPerPage(summary, false);
  const pages: POPrintLine[][] = [];
  let rest = [...lines];

  // Fill continuation pages while what is left cannot finish on a last page.
  while (slotsOf(rest) > lastCapacity) {
    const taken: POPrintLine[] = [];
    let used = 0;
    while (rest.length) {
      const slots = rowSlots(rest[0]);
      // Always take one, so a description too tall for a page still prints.
      if (taken.length && used + slots > contCapacity) break;
      taken.push(rest[0]);
      used += slots;
      rest = rest.slice(1);
    }
    pages.push(taken);
  }
  pages.push(rest);
  return pages;
}

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------

type Align = 'left' | 'center' | 'right';

interface CellProps {
  span?: number;
  /** Which of the cell's own edges carry one of the sheet's rules. */
  left?: boolean;
  right?: boolean;
  top?: boolean;
  bottom?: boolean;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  align?: Align;
  valign?: 'top' | 'middle' | 'bottom';
  padX?: number;
  padY?: number;
  font?: string;
  height?: number;
  children?: React.ReactNode;
}

function Cell({
  span = 1,
  left,
  right,
  top,
  bottom,
  size = 8.1,
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
      style={{
        borderLeft: left ? RULE : undefined,
        borderRight: right ? RULE : undefined,
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
        lineHeight: 1.2,
        color: '#000',
        overflow: 'hidden',
      }}
    >
      {children}
    </td>
  );
}

/** One absolutely-placed run of text, at its measured position on the page. */
function At({
  x,
  y,
  size = 8.75,
  bold,
  font = ARIAL,
  width,
  align,
  children,
}: {
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
  font?: string;
  width?: number;
  align?: Align;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}pt`,
        top: `${y}pt`,
        width: width ? `${width}pt` : undefined,
        textAlign: align,
        fontFamily: font,
        fontSize: `${size}pt`,
        fontWeight: bold ? 700 : 400,
        lineHeight: 1.2,
        whiteSpace: width ? 'normal' : 'pre',
        color: '#000',
      }}
    >
      {children}
    </div>
  );
}

/** A label on the left of its cell and an amount on the right of it. */
function LabelAmount({
  label,
  amount,
  labelPad = 6,
  amountPad = 1.1,
  size = 7.45,
  amountSize,
}: {
  label: string;
  amount: string;
  labelPad?: number;
  amountPad?: number;
  size?: number;
  amountSize?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: TAHOMA,
        fontWeight: 700,
        padding: `0 ${amountPad}pt 0 ${labelPad}pt`,
      }}
    >
      <span style={{ fontSize: `${size}pt` }}>{label}</span>
      <span style={{ fontSize: `${amountSize ?? size}pt` }}>{amount}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// placed rules — the lines that never move with the number of item lines
// ---------------------------------------------------------------------------

function PlacedRules() {
  return (
    <>
      {/* The header block's two columns. */}
      <div
        style={{
          position: 'absolute',
          left: `${HEADER_SPLIT_X}pt`,
          top: '149.3pt',
          height: '185.5pt',
          borderLeft: RULE,
        }}
      />
      {/* Bill From above, Ship To below — the left column only. */}
      <div
        style={{
          position: 'absolute',
          left: `${FRAME_L}pt`,
          top: `${HEADER_SPLIT_Y}pt`,
          width: `${HEADER_SPLIT_X - FRAME_L}pt`,
          borderTop: RULE,
        }}
      />
      {/* The terms block's own divider. */}
      <div
        style={{
          position: 'absolute',
          left: '228.5pt',
          top: '607pt',
          height: `${H_TERMS}pt`,
          borderLeft: RULE,
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// blocks
// ---------------------------------------------------------------------------

/** Above the frame's first rule: logo, title, the location's letterhead. */
function Masthead({ order }: { order: POPrintPayload }) {
  const { company } = order;
  const banner = COMPANY_BANNER[order.company_code] ?? '';
  const reg = { size: 5.8, bold: true, font: TAHOMA, width: 200, align: 'right' } as const;
  return (
    <>
      <At x={18} y={19.8} size={13.4} bold>
        {STATIC_LETTERHEAD.title}
      </At>
      <At x={216} y={19.8} size={14.3} bold>
        {STATIC_LETTERHEAD.name}
      </At>
      {banner ? (
        <At x={456} y={26.7} size={5.65} bold font={ARIAL_BLACK}>
          {banner}
        </At>
      ) : null}
      <img
        src="/JivoWellnessLogo.png"
        alt=""
        style={{
          position: 'absolute',
          left: '18pt',
          top: '48pt',
          width: '92.2pt',
          height: '40.5pt',
          objectFit: 'contain',
        }}
      />
      {/* The receiving location's postal address, centred on x 298. */}
      <At x={150} y={49.5} size={7.45} bold font={TAHOMA} width={296} align="center">
        {company.address}
      </At>
      {/* The registrations, right-aligned to 563.7. */}
      <At x={363.7} y={85.1} {...reg}>
        {STATIC_LETTERHEAD.cin}
      </At>
      <At x={363.7} y={97.1} {...reg}>
        FSSAI Lic No.: {company.fssai_no}
      </At>
      <At x={363.7} y={109.1} {...reg}>
        GSTIN Number : {company.gst_no}
      </At>
      <At x={363.7} y={121.1} {...reg}>
        Company PAN : {company.pan_no}
      </At>
      <At x={12} y={129.2} size={7.8} bold>
        {STATIC_LETTERHEAD.customerCare}
      </At>
      {/* SAP's own vendor stamp: the code, two empty fields, then the DocEntry. */}
      <At x={493} y={133.1} size={5.8} font={TAHOMA}>
        <span style={{ fontWeight: 700 }}>{order.vendor.code} - - (</span>
        {order.doc_entry}
        <span style={{ fontWeight: 700 }}>)</span>
      </At>
    </>
  );
}

/** The two-column block between the masthead and the item grid. */
function HeaderBlock({ order }: { order: POPrintPayload }) {
  const { company, vendor } = order;
  const ship = { size: 7.45, font: TAHOMA } as const;
  return (
    <>
      {/* ---- left column: Bill From ---- */}
      <At x={14} y={150.7} size={8.3} bold font={TAHOMA}>
        Bill From:
      </At>
      <At x={68} y={150.5} size={6.6} bold font={TAHOMA} width={234}>
        {vendor.name}
      </At>
      <At x={12} y={174.2} size={6.95} bold>
        Address{' '}
      </At>
      <At x={41.7} y={174} size={7.15} width={260}>
        : {vendor.address}
      </At>
      <At x={12} y={198.5} size={6.6} bold font={TAHOMA}>
        FSSAI Lic No. {vendor.fssai_no}
      </At>
      <At x={13} y={210.6} {...ship}>
        GSTIN Number : {vendor.gst_no}
      </At>
      <At x={13} y={222.6} {...ship} width={288}>
        State Code :{vendor.state_code}  &amp; State Name : {vendor.state_name}
      </At>

      {/* ---- left column: Ship To ---- */}
      <At x={14} y={234.7} size={8.3} bold font={TAHOMA}>
        Ship To:
      </At>
      <At x={12} y={246.6} {...ship} width={290}>
        Address : {company.address}
      </At>
      <At x={13} y={284.8} {...ship}>
        GSTIN Number :  {company.gst_no}
      </At>
      <At x={13} y={293.8} {...ship} width={288}>
        State Code : {company.state_code} &amp; State Name:{company.state_name}
      </At>
      {/* Both print blank on SAP's own sheet; see the module docstring. */}
      <At x={13} y={303.6} {...ship}>
        Contact Person :{company.contact_person}
      </At>
      <At x={13} y={312.6} {...ship}>
        Cust. Contact No:{company.contact_no}
      </At>
      <At x={13.5} y={323.7} size={6.6} bold font={TAHOMA}>
        FSSAI Lic No. {company.fssai_no}
      </At>

      {/* ---- right column ---- */}
      <At x={312} y={150.4} bold>
        PO No. : {order.doc_num ?? ''}
      </At>
      <At x={426} y={150.7} size={8.3} bold font={TAHOMA}>
        PO Date :{dottedDate(order.doc_date)}
      </At>
      <At x={312} y={161} bold>
        Unit
      </At>
      <At x={331.4} y={160.7} size={8.3} font={TAHOMA}>
        : {order.unit}
      </At>
      <At x={312} y={170.6} bold width={250}>
        Supplier Ref No. : {order.supplier_ref_no}
      </At>
      <At x={312} y={182.6} bold width={256}>
        Payment Terms : {order.payment_terms}
      </At>
      <At x={312} y={192.4} bold>
        Bank Acct : {vendor.bank_account}
      </At>
      <At x={312} y={204.4} bold>
        Bank IFSC : {vendor.bank_ifsc}
      </At>
      {/* A label SAP prints with nothing behind it. */}
      <At x={432} y={216.4} bold>
        Payment Due Date:{' '}
      </At>
      <At x={312} y={218.6} bold>
        Ship Date: {slashDate(order.ship_date)}
      </At>
      <At x={312} y={228.4} bold width={252}>
        Place of Supply : {order.place_of_supply}
      </At>
      <At x={312} y={242.6} bold>
        Packing Slip No.:{order.packing_slip_no}
      </At>
      <At x={445.2} y={242.6} bold>
        Veh.No :{order.vehicle_no}
      </At>
      <At x={312} y={252.4} bold width={252}>
        Shipping Terms: {order.shipping_terms}
      </At>
      <At x={312} y={266.6} size={7.8} bold width={175}>
        Contact Person:{vendor.contact_person}
      </At>
      <At x={491.8} y={266.6} size={7.8} bold>
        Mob No:{vendor.contact_no}
      </At>
      <At x={312} y={276.8} size={7.8} bold width={250}>
        Email Id: {vendor.email}
      </At>
      <At x={312} y={288.4} bold>
        Transportation Mode: {order.transportation_mode}
      </At>
      <At x={403.9} y={288.2} size={8.95}>
        (Apply for Supply of Goods only)
      </At>

      {/* ---- approval box ---- */}
      <div
        style={{
          position: 'absolute',
          left: '306pt',
          top: '305pt',
          width: `${484.8 - 306}pt`,
          height: `${333.8 - 305}pt`,
          border: RULE,
        }}
      />
      <At x={306} y={315.1} bold>
        {' '}
        Digitaly:
      </At>
      {order.approval.is_approved ? (
        <At x={345.5} y={306.9} size={17.9}>
          Approved
        </At>
      ) : null}
      {/* The approver's signature block, right of the box's own divider. */}
      <div
        style={{
          position: 'absolute',
          left: `${456.5}pt`,
          top: '305pt',
          height: `${325.5 - 305}pt`,
          borderLeft: RULE,
        }}
      />
      <At x={514.8} y={305.8} size={7.8} bold>
        Approver
      </At>
      <div
        style={{
          position: 'absolute',
          left: '480pt',
          top: '317.5pt',
          width: `${567 - 480}pt`,
          borderTop: RULE,
        }}
      />
      <At x={486} y={318.4} bold width={84}>
        {order.approval.approver}
      </At>
    </>
  );
}

/** The two-line grid head, centred over its columns the way SAP sets it. */
function GridHeadRow() {
  const head = {
    size: 8.3,
    bold: true,
    font: TAHOMA,
    top: true,
    bottom: true,
    valign: 'top',
  } as const;
  return (
    <tr>
      <Cell {...head} span={GRID.sno} size={7.45} align="center" padX={0} padY={2} height={H_GRID_HEAD}>
        S.
        <br />
        No
      </Cell>
      <Cell {...head} span={GRID.desc} left padX={2.3} padY={4}>
        Description of Goods
      </Cell>
      <Cell {...head} span={GRID.details} left align="center" padY={4}>
        Details
      </Cell>
      <Cell {...head} span={GRID.hsn} left size={7.45} align="center" padY={2}>
        HSN/SAC
        <br />
        Code
      </Cell>
      <Cell {...head} span={GRID.qty} left align="center" padY={2}>
        Qty
        <br />
        (Unit)
      </Cell>
      <Cell {...head} span={GRID.rate} left align="center" padY={2}>
        Rate
      </Cell>
      <Cell {...head} span={GRID.disc} left align="center" padY={2}>
        Disc.
        <br />%
      </Cell>
      <Cell {...head} span={GRID.net} left align="center" padY={4}>
        Net Rate
      </Cell>
      <Cell {...head} span={GRID.value} left align="center" padY={4}>
        Taxable
        <br />
        value
        <span style={{ display: 'block', fontSize: '6.6pt' }}>[INR]</span>
      </Cell>
    </tr>
  );
}

function ItemRow({ line }: { line: POPrintLine }) {
  const cell = { valign: 'top', padY: 2.5 } as const;
  return (
    <tr>
      <Cell
        span={GRID.sno}
        size={8.3}
        font={TAHOMA}
        align="center"
        padX={0}
        padY={3}
        valign="top"
        height={H_ITEM}
      >
        {line.sno}
      </Cell>
      <Cell {...cell} span={GRID.desc} left padX={3.5}>
        {line.description || line.item_code}
      </Cell>
      <Cell {...cell} span={GRID.details} left padX={3}>
        {line.details}
      </Cell>
      <Cell span={GRID.hsn} left size={7.2} italic padX={6} valign="top" padY={1.5}>
        {line.hsn_code}
      </Cell>
      <Cell span={GRID.qty} left size={7.15} align="right" padX={2.1} valign="top" padY={1.5}>
        {n2(line.quantity)}
      </Cell>
      <Cell {...cell} span={GRID.rate} left align="right" padX={1.2}>
        {n4(line.rate)}
      </Cell>
      {/* SAP leaves the cell empty rather than printing a zero discount. */}
      <Cell {...cell} span={GRID.disc} left align="right" padX={2}>
        {Number(line.discount_percent) ? n2(line.discount_percent) : ''}
      </Cell>
      <Cell {...cell} span={GRID.net} left align="right" padX={0}>
        {n4(line.net_rate)}
      </Cell>
      <Cell {...cell} span={GRID.value} left align="right" padX={2.3}>
        {plain2(line.taxable_value)}
      </Cell>
    </tr>
  );
}

/** The GST summary strip, in the left half of the tax region. */
function HSNStrip({ rows }: { rows: POPrintHSNRow[] }) {
  const cols = [14.9, 110, 175, 260, 369.9];
  const widths = cols.slice(1).map((edge, i) => edge - cols[i]);
  const body = { size: 8.95, top: true, bottom: true, height: H_HSN_ROW } as const;
  return (
    <>
      {/* The strip's head is ruled across the whole cell, not just the strip. */}
      <div
        style={{
          height: `${H_HSN_HEAD}pt`,
          borderBottom: RULE,
          position: 'relative',
          fontFamily: ARIAL,
          fontSize: '7.15pt',
        }}
      >
        <At x={15.7} y={0.3} size={7.15}>
          HSN Code
        </At>
        <At x={109.5} y={0.3} size={7.15}>
          Taxable Value
        </At>
        <At x={217.4} y={0.3} size={7.15}>
          Tax Rate %
        </At>
        <At x={323.4} y={0.3} size={7.15}>
          Total Tax
        </At>
      </div>
      <table
        style={{
          width: `${369.9 - 14.9}pt`,
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          marginLeft: '2.9pt',
          marginTop: '0.9pt',
        }}
      >
        <colgroup>
          {widths.map((w, i) => (
            <col key={i} style={{ width: `${w}pt` }} />
          ))}
        </colgroup>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.hsn_code}-${row.tax_rate}`}>
              <Cell {...body} left padX={4.5}>
                {row.hsn_code}
              </Cell>
              <Cell {...body} align="right" padX={9}>
                {n2(row.taxable_value)}
              </Cell>
              <Cell {...body} align="right" padX={6}>
                {n2(row.tax_rate)}
              </Cell>
              <Cell {...body} right align="right" padX={3.9}>
                {n2(row.total_tax)}
              </Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** The boxed tax components, in the right half of the tax region. */
function TaxBox({ rows }: { rows: POPrintTotalRow[] }) {
  return (
    <div style={{ marginLeft: '0.5pt', width: `${567.8 - 371.5}pt`, border: RULE }}>
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            height: `${H_HSN_ROW}pt`,
            alignItems: 'center',
            fontFamily: ARIAL,
            fontSize: '8.95pt',
            padding: '0 4.1pt 0 4.5pt',
            borderTop: i ? RULE : undefined,
          }}
        >
          <span>{row.label}</span>
          <span>{n2(row.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function TotalsBlock({ order }: { order: POPrintPayload }) {
  const { totals } = order;
  const taxRegion = taxRegionHeight(totals.taxes.length, order.hsn_summary.length);

  /** A charge row: full width, no dividers, the way SAP sets the freight line. */
  const chargeRow = (row: POPrintTotalRow, key: string, top?: boolean) => (
    <tr key={key}>
      <Cell span={MONEY.left} top={top} height={H_MONEY_ROW} />
      <Cell span={MONEY.label + MONEY.amount} top={top} padX={0}>
        <LabelAmount label={row.label} amount={plain2(row.amount)} labelPad={1.9} />
      </Cell>
    </tr>
  );

  return (
    <>
      {/* The grid's own column totals. The rules under Details and HSN stop
          short of this row in the original, so one cell spans across them. */}
      <tr>
        <Cell span={GRID.sno} top height={H_GRID_TOTAL} />
        <Cell span={GRID.desc} left top />
        <Cell span={GRID.details + GRID.hsn + GRID.qty} left top padX={0}>
          <LabelAmount
            label="Total :"
            amount={nWhole(totals.total_qty)}
            labelPad={42.8}
            amountPad={1}
            size={8.3}
            amountSize={8.75}
          />
        </Cell>
        <Cell span={GRID.rate} left top />
        <Cell span={GRID.disc} left top />
        <Cell span={GRID.net} left top />
        <Cell span={GRID.value} left top size={6.6} bold font={TAHOMA} align="right" padX={2.3}>
          {plain2(totals.amount_before_freight)}
        </Cell>
      </tr>

      <tr>
        <Cell span={MONEY.left} top height={H_MONEY_ROW} />
        <Cell span={MONEY.label + MONEY.amount} top padX={0}>
          <LabelAmount
            label="Amount before freight & Disc [INR]"
            amount={plain2(totals.amount_before_freight)}
            labelPad={1.9}
          />
        </Cell>
      </tr>

      {totals.expenses ? chargeRow(totals.expenses, 'expenses') : null}
      {totals.round_off ? chargeRow(totals.round_off, 'round-off') : null}

      <tr>
        <Cell span={MONEY.left} top height={H_DISCOUNT} valign="top" padY={5.4} padX={4.3}>
          <span style={{ fontFamily: TAHOMA, fontSize: '5.8pt', fontWeight: 700 }}>
            Amount(Words):  {amountInWords(totals.grand_total)}
          </span>
        </Cell>
        <Cell
          span={MONEY.label}
          left
          top
          size={7.45}
          bold
          font={TAHOMA}
          valign="top"
          padY={4.2}
          padX={6}
        >
          Discount INR
        </Cell>
        <Cell
          span={MONEY.amount}
          left
          top
          size={8.3}
          bold
          font={TAHOMA}
          align="right"
          valign="top"
          padY={4.4}
          padX={1.1}
        >
          {plain2(totals.discount)}
        </Cell>
      </tr>

      <tr>
        <Cell span={MONEY.left} top height={taxRegion} valign="top" padX={0} padY={0}>
          <HSNStrip rows={order.hsn_summary} />
        </Cell>
        <Cell
          span={MONEY.label + MONEY.amount}
          left
          top
          valign="top"
          padX={0}
          padY={0}
        >
          <TaxBox rows={totals.taxes} />
        </Cell>
      </tr>

      <tr>
        <Cell span={MONEY.left} top height={H_GRAND} />
        <Cell span={MONEY.label} left top size={7.45} bold font={TAHOMA} padX={6}>
          Invoice Total [INR]
        </Cell>
        <Cell
          span={MONEY.amount}
          left
          top
          size={8.3}
          bold
          font={TAHOMA}
          align="right"
          padX={1.5}
        >
          {plain2(totals.grand_total)}
        </Cell>
      </tr>
    </>
  );
}

/** Terms, the signature strip and the registered office — on every page. */
function FooterBlock() {
  const cols = COL_EDGES.length - 1;
  return (
    <>
      <tr>
        <Cell span={cols} top height={H_TERMS} padX={0} valign="top">
          <div style={{ position: 'relative', height: `${H_TERMS}pt` }}>
            <div
              style={{
                position: 'absolute',
                left: '222pt',
                top: '12.7pt',
                width: '338pt',
                fontFamily: ARIAL,
                fontSize: '6.95pt',
                fontWeight: 700,
                lineHeight: 1.38,
                textAlign: 'justify',
              }}
            >
              {STATIC_LETTERHEAD.terms}
            </div>
          </div>
        </Cell>
      </tr>

      <tr>
        <Cell span={cols} top height={H_SIGNATURES} padX={0} valign="top">
          <div style={{ position: 'relative', height: `${H_SIGNATURES}pt` }}>
            <At x={4.2} y={3.8} size={6.95} bold>
              {STATIC_LETTERHEAD.signatures[0]}
            </At>
            <At x={157.5} y={3.8} size={6.95} bold>
              {STATIC_LETTERHEAD.signatures[1]}
            </At>
            <At x={309.2} y={3.8} size={6.95} bold>
              {STATIC_LETTERHEAD.signatures[2]}
            </At>
            <At x={466.6} y={0.7} size={6.95} bold>
              {STATIC_LETTERHEAD.signatory}
            </At>
          </div>
        </Cell>
      </tr>

      <tr>
        <Cell span={cols} top height={H_REGISTERED} padX={0} valign="top">
          <div style={{ position: 'relative', height: `${H_REGISTERED}pt` }}>
            <At x={91.3} y={5} bold>
              {STATIC_LETTERHEAD.registeredOfficeLabel}
            </At>
            <At x={169.1} y={4} size={9.85}>
              {STATIC_LETTERHEAD.registeredOffice}
            </At>
            <At x={497.7} y={6.5} size={5.4}>
              {STATIC_LETTERHEAD.authorisedSignatory}
            </At>
          </div>
        </Cell>
      </tr>
    </>
  );
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------

function OrderPage({
  order,
  lines,
  isLast,
  page,
  pageCount,
}: {
  order: POPrintPayload;
  lines: POPrintLine[];
  isLast: boolean;
  page: number;
  pageCount: number;
}) {
  const cols = COL_EDGES.length - 1;
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
          {/* The masthead's and header block's own bands; their content is
              placed over them, because neither is laid out on any column. */}
          <tr>
            <Cell span={cols} height={H_MASTHEAD} />
          </tr>
          <tr>
            <Cell span={cols} top bottom height={H_RULE_BAND} />
          </tr>
          <tr>
            <Cell span={cols} height={H_HEADER} />
          </tr>

          <GridHeadRow />
          {lines.map((line) => (
            <ItemRow key={`${line.sno}-${line.item_code}`} line={line} />
          ))}
          {/* The grid's own empty space, with its column rules running on
              through it, exactly as SAP leaves it under a short order. This is
              the row that absorbs the page's remaining height, which is why
              the totals below stay pinned to their measured position. */}
          <tr style={{ height: '100%' }}>
            <Cell span={GRID.sno} />
            <Cell span={GRID.desc} left />
            <Cell span={GRID.details} left />
            <Cell span={GRID.hsn} left />
            <Cell span={GRID.qty} left />
            <Cell span={GRID.rate} left />
            <Cell span={GRID.disc} left />
            <Cell span={GRID.net} left />
            <Cell span={GRID.value} left />
          </tr>
          {isLast ? (
            <>
              <TotalsBlock order={order} />
              {/* The unruled band between the totals and the terms. */}
              <tr>
                <Cell span={cols} top height={H_TERMS_GAP} />
              </tr>
            </>
          ) : null}
          <FooterBlock />
        </tbody>
      </table>

      <PlacedRules />
      <Masthead order={order} />
      <HeaderBlock order={order} />

      {/* ---- strip below the frame ---- */}
      <At x={470} y={794.6} size={5.4} width={100} align="right">
        Page {page} of {pageCount}
      </At>
      <At x={215.1} y={804.3} size={5.4}>
        {STATIC_LETTERHEAD.computerGenerated}
      </At>
      <At x={257.1} y={811.3} size={5.4}>
        {STATIC_LETTERHEAD.jurisdiction}
      </At>
      <At x={427.3} y={818.6} size={7.15}>
        Printed by SAP Business One
      </At>
    </div>
  );
}

/**
 * The whole order, one A4 page per rendered page. Handed to `react-to-print` by
 * ``POPrintButton``; rendered off-screen the rest of the time.
 */
export const POPurchaseOrderPrint = forwardRef<HTMLDivElement, { order: POPrintPayload }>(
  function POPurchaseOrderPrint({ order }, ref) {
    const pages = paginate(order.lines, summaryHeight(order));
    return (
      <div ref={ref} style={{ background: '#fff' }}>
        {pages.map((lines, i) => (
          <OrderPage
            key={i}
            order={order}
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
