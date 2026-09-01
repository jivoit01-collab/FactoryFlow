import { forwardRef } from 'react';

import type { BillSummaryDetail } from '../../api';

export const BILL_SUMMARY_PRINT_STYLE = `
  @page { size: A4 portrait; margin: 0; }
  @media print {
    body { margin: 0; background: #fff !important; }
  }
`;

/**
 * SAP's Bill Summary, reproduced from the printed original.
 *
 * The floor has been handed SAP's sheet for years, so a near-miss is worse than
 * an obvious redesign: it makes people stop and check whether they are holding
 * the right document. Every measurement below was taken off a SAP-generated PDF
 * (invoice 626080518) — text spans, rule positions and the placed logo — rather
 * than estimated from a screenshot.
 *
 * The whole document is ONE FRAMED BOX, which is the thing a text-only reading
 * of the PDF misses entirely:
 *
 *   frame          14.4, 11.5  ->  564.6, 338.7   (550 x 327pt)
 *   logo           20, 18      ->  182, 86
 *   banded row     y 87 -> 106.5, split at x 195.9 and 390.3
 *   detail block   y 106.5 -> 200.5, divided at x 314.9
 *   item table     x 15.1 -> 563.2, top 200.5, header split 212.5, ends 236.5
 *   columns        35.4 | 254.4 | (298.1 | 344.4) | 386.4 | 519.6
 *
 * Everything is in POINTS on a 595 x 842pt page. `fontSize: 8.8` in a React
 * style means 8.8 *pixels*, a quarter smaller than the 8.8pt SAP sets — getting
 * that wrong is what made an earlier attempt look shrunken.
 */

/**
 * Hardcoded because SAP hardcodes it: `OADM` holds a different phone
 * (18001374433, the call centre) and `OBPL` carries no street address, so this
 * block lives only inside SAP's Crystal layout. The GST is the one part that
 * varies and is read per branch from `OBPL.TaxIdNum`.
 */
const LETTERHEAD = {
  name: 'Jivo Wellness Pvt. Ltd.',
  addressLines: [
    'Khasra No 20//9/2 & 10/1/2, KH No 12//23/2/2/2 &20//3/2/2/1 &',
    '3/2/2/2 & 8/1, Bhakharpur, Ganaur,Sonipat 131101 (Haryana)',
  ],
  phone: 'Phone: 9910836550',
};

const PAGE_W = 595;
const FRAME_L = 14.4;
const FRAME_R = 564.6;
const FRAME_W = FRAME_R - FRAME_L; // 550.2

const RULE = '0.75pt solid #000';

/** Column edges (page coords) turned into widths as a share of the frame. */
const COL_EDGES = [35.4, 254.4, 298.1, 344.4, 386.4, 519.6, 563.2];
const COL_WIDTHS = COL_EDGES.map((edge, i) => {
  const from = i === 0 ? 15.1 : COL_EDGES[i - 1];
  return `${(((edge - from) / (563.2 - 15.1)) * 100).toFixed(3)}%`;
});

function n2(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Boxes print whole on a line and with decimals on the total row. */
function nWhole(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('en-IN') : '0';
}

/** SAP writes dates D/M/YYYY. */
function sapDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** The bilty date carries a midnight stamp: `8/27/2026  12:00:00AM`. */
function sapDateTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}  12:00:00AM`;
}

/** SAP stores the ship-to with carriage returns between its lines. */
function addressLines(value: string): string[] {
  return String(value || '')
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export const BillSummaryPrint = forwardRef<
  HTMLDivElement,
  { summary: BillSummaryDetail }
>(function BillSummaryPrint({ summary }, ref) {
  const t = summary.totals;
  const delivery = addressLines(summary.delivery_address);

  return (
    <div
      ref={ref}
      style={{
        width: `${PAGE_W}pt`,
        background: '#fff',
        color: '#000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '8.8pt',
        lineHeight: 1.18,
        boxSizing: 'border-box',
        paddingTop: '11.5pt',
        paddingLeft: `${FRAME_L}pt`,
      }}
    >
      {/* ================= the frame the whole document sits in ============= */}
      <div style={{ width: `${FRAME_W}pt`, border: RULE, boxSizing: 'border-box' }}>
        {/* ---- masthead: logo left, title + letterhead right ---- */}
        <div style={{ display: 'flex', height: '75.5pt', boxSizing: 'border-box' }}>
          <div style={{ flex: '0 0 168pt', padding: '6.5pt 0 0 5.6pt' }}>
            <img
              src="/JivoWellnessLogo.png"
              alt=""
              style={{ width: '162pt', height: '68pt', objectFit: 'contain' }}
            />
          </div>
          <div style={{ flex: 1, paddingRight: '12pt' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10.5pt', fontWeight: 'bold' }}>Bill Summary</span>
              <span style={{ fontSize: '10.5pt', fontWeight: 'bold' }}>{LETTERHEAD.name}</span>
            </div>
            <div style={{ fontSize: '8.9pt', textAlign: 'right', lineHeight: 1.32 }}>
              {LETTERHEAD.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div>{LETTERHEAD.phone}</div>
              <div>GST No. {summary.branch_gstin}</div>
            </div>
          </div>
        </div>

        {/* ---- banded row: three bordered cells ---- */}
        <div
          style={{
            display: 'flex',
            borderTop: RULE,
            borderBottom: RULE,
            fontSize: '8.3pt',
            fontWeight: 'bold',
          }}
        >
          <div style={{ flex: '0 0 181.5pt', borderRight: RULE, padding: '3pt 0 3pt 5pt' }}>
            Invoice Number : {summary.sap_invoice_doc_num}
          </div>
          <div style={{ flex: '0 0 194.4pt', borderRight: RULE, padding: '3pt 0 3pt 5pt' }}>
            Invoice Date :{sapDate(summary.invoice_date)}
          </div>
          <div style={{ flex: 1, padding: '3pt 0 3pt 5pt' }}>
            Dispatch Date: {sapDate(summary.dispatch_date)}
          </div>
        </div>

        {/* ---- detail block, divided at x 314.9 ---- */}
        <div style={{ display: 'flex', minHeight: '94pt' }}>
          <div style={{ flex: '0 0 300.5pt', borderRight: RULE, padding: '4pt 0 0 5pt' }}>
            <Row label="Customer Name" labelW={92} value={summary.customer_name || summary.customer_code} bold />
            <Row
              label="Delivery Address"
              labelW={92}
              value={delivery[0] ?? ''}
              extraLines={delivery.slice(1)}
              bold
            />
            {/* SAP prints this second, always-empty contact line. */}
            <Row label="Contact No" labelW={92} value="" bold />
          </div>
          <div style={{ flex: 1, padding: '4pt 0 0 8pt' }}>
            <Row label="Transporter Name" labelW={99} value={summary.transporter_name} />
            <Row label="Bilty No" labelW={99} value={summary.bilty_no} />
            <Row label="Bilty Date" labelW={99} value={sapDateTime(summary.bilty_date)} />
            <Row label="Vehicle No" labelW={99} value={summary.vehicle_no} />
            <Row label="Driver Contact No" labelW={99} value={summary.driver_mobile} />
            {/* SAP's own label, trailing full stop and all. */}
            <Row label="DriverName." labelW={99} value={summary.driver_name} />
          </div>
        </div>

        {/* ---- item table ---- */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            fontSize: '8.8pt',
          }}
        >
          <colgroup>
            {COL_WIDTHS.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <Th rowSpan={2} style={{ height: '12pt' }}>
                S.
                <br />
                No
              </Th>
              <Th rowSpan={2}>Description of Goods</Th>
              <Th colSpan={3} align="center">
                Box &amp; Pieces
              </Th>
              {/* Not a rowSpan: SAP splits this label across the two rows. */}
              <Th align="center">Godown</Th>
              <Th rowSpan={2} align="center">
                Gross
                <br />
                Weight
                <br />
                (KGS)
              </Th>
            </tr>
            <tr>
              <Th align="center" style={{ height: '24pt' }}>
                Qty Pcs
              </Th>
              <Th align="center">Box</Th>
              <Th align="center">Loose Qty</Th>
              <Th align="center">Warehouse</Th>
            </tr>
          </thead>
          <tbody>
            {summary.lines.map((line, i) => (
              <tr key={line.id}>
                <Td align="center">{i + 1}</Td>
                <Td>{line.item_name || line.item_code}</Td>
                <Td align="right">{n2(line.dispatch_qty)}</Td>
                <Td align="right">{nWhole(line.boxes)}</Td>
                <Td align="right">{n2(line.loose_qty)}</Td>
                <Td style={{ paddingLeft: '20pt' }}>{line.warehouse_code}</Td>
                <Td align="right">{n2(line.gross_weight)}</Td>
              </tr>
            ))}
            <tr>
              <Td />
              <Td bold>Total :</Td>
              <Td align="right" bold>
                {n2(t.dispatch_qty)}
              </Td>
              <Td align="right" bold>
                {n2(t.boxes)}
              </Td>
              <Td align="right" bold>
                {n2(t.loose_qty)}
              </Td>
              <Td />
              <Td />
            </tr>
          </tbody>
        </table>

        {/* ---- footer, inside the frame ---- */}
        <div style={{ position: 'relative', padding: '3pt 12pt 8pt 6pt' }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <div style={{ flex: 1, fontSize: '10.5pt' }}>
              Bill Amount: {n2(summary.bill_amount)}
            </div>
            <div style={{ fontSize: '6.9pt', display: 'flex', gap: '78pt', paddingRight: '4pt' }}>
              <span>Dispatched By</span>
              <span>For {LETTERHEAD.name}</span>
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: '9pt', fontSize: '10.5pt' }}>
            <div style={{ flex: '0 0 262pt' }}>Total Liter: {n2(t.litres)}</div>
            <div>
              Total Gross Weight: <span style={{ fontSize: '9.9pt' }}>KGS</span>
              <span style={{ fontSize: '8.8pt' }}>{n2(t.gross_weight)}</span>
            </div>
          </div>

          <div style={{ marginTop: '9pt' }}>Remarks: {summary.remarks}</div>

          <div style={{ position: 'absolute', right: '12pt', bottom: '4pt', fontSize: '6.2pt' }}>
            Authorised Signatory
          </div>
        </div>
      </div>
    </div>
  );
});

/** A `label : value` row, colon in its own column, exactly as SAP sets it. */
function Row({
  label,
  value,
  labelW,
  bold = false,
  extraLines = [],
}: {
  label: string;
  value: string;
  labelW: number;
  bold?: boolean;
  extraLines?: string[];
}) {
  return (
    <div style={{ display: 'flex', minHeight: '12pt' }}>
      <div style={{ width: `${labelW}pt`, fontWeight: 'bold', flexShrink: 0 }}>{label}</div>
      <div style={{ width: '12pt', fontWeight: 'bold', flexShrink: 0 }}>:</div>
      <div style={{ flex: 1, fontWeight: bold ? 'bold' : 'normal' }}>
        <div>{value}</div>
        {extraLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function Th({
  children,
  colSpan,
  rowSpan,
  align = 'left',
  style,
}: {
  children?: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={{
        border: RULE,
        padding: '1pt 3pt',
        fontWeight: 'bold',
        verticalAlign: 'middle',
        textAlign: align,
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  bold = false,
  style,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        border: RULE,
        padding: '3pt',
        textAlign: align,
        fontWeight: bold ? 'bold' : 'normal',
        verticalAlign: 'top',
        wordBreak: 'break-word',
        ...style,
      }}
    >
      {children}
    </td>
  );
}
