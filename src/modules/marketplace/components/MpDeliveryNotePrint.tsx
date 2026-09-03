/** The delivery note in SAP's own print layout — the document that travels with
 *  the goods.
 *
 *  This is a replica, not a redesign. It reproduces the SAP Business One delivery
 *  note field for field and box for box: the letterhead and doc-meta header, BILL
 *  TO / SHIP TO, the customer strip, the item grid, amount in words, the totals
 *  ladder and the three signature blocks. A warehouse or a checkpost comparing
 *  this against a note printed from SAP should not be able to tell them apart,
 *  which is the whole point — the same layout the business already reads.
 *
 *  Every figure is SAP's. These notes are posted quantity-only, so the amounts are
 *  usually 0.00; where SAP does hold a price it is printed as SAP holds it. What we
 *  billed on our own invoices is deliberately NOT on this page — it is not part of
 *  the SAP document, and the CSV export beside it carries the order-by-order list.
 *
 *  Designed for ink and photocopiers: black hairlines, one grey fill for header
 *  bands, no half-tones. The item header repeats on every page and no row, block
 *  or signature panel splits across a page break.
 */
import { forwardRef } from 'react';

import type { DeliveryNotePrint } from '../types/marketplace.types';

export const DN_PRINT_PAGE_STYLE = `
  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    body { margin: 0; background: #fff !important; }
    .sapdn { color: #000 !important; }
  }
`;

const dash = (v?: string | number | null) =>
  v === undefined || v === null || v === '' ? '' : String(v);

/** SAP prints dates as 02.09.2026. Split by parts, never through Date — a date-only
 *  value has no timezone, and `new Date('2026-09-02')` is UTC midnight, which reads
 *  as the 1st anywhere west of Greenwich. */
const fmtDate = (iso: string) => {
  const [y, m, d] = (iso || '').split('-');
  return y && m && d ? `${d}.${m}.${y}` : (iso ?? '');
};

/** SAP prints quantities to three decimals: 7 → 7.000. */
const qty = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : v;
};

/** Amounts print grouped, two decimals: 161086 → 161,086.00. */
const amt = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v;
};

/** SAP annotates an unregistered buyer rather than printing a bare code. */
const gstin = (v: string) => (v.toUpperCase() === 'URP' ? 'URP (Unregistered)' : dash(v));

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <tr>
      <th>{label}</th>
      <td>{dash(value)}</td>
    </tr>
  );
}

interface Props {
  dn: DeliveryNotePrint;
  /** Total sheets, measured from the rendered height before printing. */
  pages?: number;
}

export const MpDeliveryNotePrint = forwardRef<HTMLDivElement, Props>(({ dn, pages = 1 }, ref) => {
  const taxRows = dn.tax_summary ?? [];
  const money = dn.money;
  const warehouse = [dn.warehouse?.code, dn.warehouse?.name].filter(Boolean).join(' – ');
  const eway = dn.eway ?? null;
  const hasEway = Boolean(eway?.vehicle_no);

  return (
    <div ref={ref} className="sapdn">
      <style>{`
        .sapdn {
          --ink: #000; --rule: #000; --band: #ececec;
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          font-size: 8.5pt; line-height: 1.25; color: var(--ink); background: #fff;
          -webkit-font-smoothing: antialiased;
        }
        .sapdn * { box-sizing: border-box; }
        .sapdn table { width: 100%; border-collapse: collapse; }
        .sapdn .n { text-align: right; font-variant-numeric: tabular-nums; }
        .sapdn .c { text-align: center; }
        .sapdn .b { font-weight: 700; }

        /* ── letterhead + document meta ── */
        .sapdn-top { display: flex; border: 1px solid var(--rule); }
        .sapdn-top-l { flex: 1 1 58%; padding: 7px 9px; }
        .sapdn-top-r { flex: 0 0 42%; border-left: 1px solid var(--rule); padding: 7px 9px; }
        .sapdn-co { font-size: 14pt; font-weight: 700; letter-spacing: .2px; }
        .sapdn-addr { font-size: 7.8pt; margin-top: 2px; }
        .sapdn-gst { font-size: 8.2pt; margin-top: 3px; }
        .sapdn-gap { margin-left: 14px; }
        .sapdn-doctype { font-size: 15pt; font-weight: 700; letter-spacing: 4px;
                         text-align: right; text-transform: uppercase; }
        .sapdn-void { display: block; font-size: 8pt; font-weight: 700; letter-spacing: 1px;
                      text-align: right; border: 1px solid var(--rule); padding: 1px 4px;
                      margin-top: 3px; }
        .sapdn-docmeta { margin-top: 4px; }
        .sapdn-docmeta th { text-align: left; font-size: 7.6pt; font-weight: 700;
                            letter-spacing: .3px; padding: 1px 0; white-space: nowrap; }
        .sapdn-docmeta td { text-align: right; font-size: 8.4pt; padding: 1px 0;
                            font-variant-numeric: tabular-nums; }

        /* ── parties ── */
        .sapdn-parties { display: flex; border: 1px solid var(--rule); border-top: none; }
        .sapdn-party { flex: 1 1 50%; }
        .sapdn-party + .sapdn-party { border-left: 1px solid var(--rule); }
        .sapdn-band { background: var(--band); border-bottom: 1px solid var(--rule);
                      padding: 2px 9px; font-size: 7.4pt; font-weight: 700; letter-spacing: .8px; }
        .sapdn-party-body { padding: 5px 9px 6px; }
        .sapdn-party-name { font-size: 9.5pt; }
        .sapdn-party-sub { font-size: 7.8pt; margin-top: 3px; }

        /* ── customer / posting strip ── */
        .sapdn-strip { display: flex; border: 1px solid var(--rule); border-top: none; }
        .sapdn-strip > div { flex: 1 1 50%; padding: 5px 9px; }
        .sapdn-strip > div + div { border-left: 1px solid var(--rule); }
        .sapdn-strip th { text-align: left; font-size: 7.6pt; font-weight: 700;
                          letter-spacing: .3px; padding: 1px 0; width: 42%; white-space: nowrap; }
        .sapdn-strip td { font-size: 8.4pt; padding: 1px 0; }

        /* ── items ── */
        .sapdn-items { border: 1px solid var(--rule); border-top: none; }
        .sapdn-items thead { display: table-header-group; }
        .sapdn-items tr { break-inside: avoid; page-break-inside: avoid; }
        .sapdn-items th { background: var(--band); font-size: 7.6pt; font-weight: 700;
                          padding: 3px 4px; border: 1px solid var(--rule); border-top: none;
                          text-align: center; }
        .sapdn-items td { padding: 2.5px 4px; border: 1px solid var(--rule); vertical-align: top; }
        .sapdn-items tbody tr:first-child td { border-top: none; }
        .sapdn-batch { font-size: 7pt; }
        .sapdn-items tfoot td { padding: 3px 4px; border: 1px solid var(--rule); font-weight: 700; }

        /* ── words / remarks / totals ── */
        .sapdn-lower { display: flex; align-items: flex-start; gap: 0;
                       break-inside: avoid; page-break-inside: avoid; margin-top: 7px; }
        .sapdn-lower-l { flex: 1 1 56%; }
        .sapdn-lower-r { flex: 0 0 44%; padding-left: 10px; }
        .sapdn-box { border: 1px solid var(--rule); }
        .sapdn-box + .sapdn-box { margin-top: 6px; }
        .sapdn-box-body { padding: 4px 9px 6px; font-size: 8.4pt; }
        .sapdn-totals th { text-align: right; font-weight: 400; font-size: 8.4pt;
                           padding: 2px 8px 2px 0; border-bottom: 1px solid #d0d0d0; }
        .sapdn-totals td { text-align: right; font-size: 8.4pt; padding: 2px 9px;
                           border: 1px solid var(--rule); border-top: none;
                           font-variant-numeric: tabular-nums; width: 38%; }
        .sapdn-totals tr:first-child td { border-top: 1px solid var(--rule); }
        .sapdn-totals tr.due th { font-size: 10pt; font-weight: 700; border-bottom: none;
                                  padding-top: 4px; }
        .sapdn-totals tr.due td { font-size: 10pt; font-weight: 700;
                                  border-top: 2px solid var(--rule); }

        /* ── signatures + footnote ── */
        .sapdn-sign { display: flex; border: 1px solid var(--rule); margin-top: 16px;
                      break-inside: avoid; page-break-inside: avoid; }
        .sapdn-sign > div { flex: 1 1 33.33%; height: 62px; padding: 4px 8px;
                            display: flex; flex-direction: column; justify-content: flex-end;
                            text-align: center; font-size: 8.2pt; }
        .sapdn-sign > div + div { border-left: 1px solid var(--rule); }
        .sapdn-foot { margin-top: 5px; text-align: center; font-size: 7.4pt; }
      `}</style>

      <section className="sapdn-top">
        <div className="sapdn-top-l">
          <div className="sapdn-co">{dash(dn.seller.name)}</div>
          <div className="sapdn-addr">{(dn.seller.address ?? []).join(', ')}</div>
          <div className="sapdn-gst">
            <span className="b">GSTIN:</span> {dash(dn.seller.gstin)}
            {dn.seller.state ? (
              <span className="sapdn-gap">
                <span className="b">State:</span> {dn.seller.state}
              </span>
            ) : null}
          </div>
        </div>
        <div className="sapdn-top-r">
          <div className="sapdn-doctype">Delivery</div>
          {dn.cancelled ? <span className="sapdn-void">Cancelled in SAP</span> : null}
          <table className="sapdn-docmeta">
            <tbody>
              <tr>
                <th>DOC. NO.</th>
                <td className="b">{dash(dn.doc_num)}</td>
              </tr>
              <Row label="DOC. DATE" value={fmtDate(dn.doc_date)} />
              <Row label="SERIES" value={dn.series_name || dn.series} />
              <Row label="PAGE" value={`1 of ${pages}`} />
            </tbody>
          </table>
        </div>
      </section>

      <section className="sapdn-parties">
        <div className="sapdn-party">
          <div className="sapdn-band">BILL TO</div>
          <div className="sapdn-party-body">
            <div className="sapdn-party-name">{dash(dn.bill_to.name)}</div>
            {(dn.bill_to.place_lines?.length
              ? dn.bill_to.place_lines
              : (dn.bill_to.address ?? [])
            ).map((l) => (
              <div key={l}>{l}</div>
            ))}
            <div className="sapdn-party-sub">
              GSTIN: {gstin(dn.bill_to.gstin)}
              {dn.bill_to.state ? (
                <span className="sapdn-gap">State: {dn.bill_to.state}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="sapdn-party">
          <div className="sapdn-band">SHIP TO</div>
          <div className="sapdn-party-body">
            <div className="sapdn-party-name">{dash(dn.ship_to.code)}</div>
            {(dn.ship_to.place_lines?.length
              ? dn.ship_to.place_lines
              : (dn.ship_to.address ?? [])
            ).map((l) => (
              <div key={l}>{l}</div>
            ))}
            <div className="sapdn-party-sub">
              {dn.place_of_supply ? `Place of Supply: ${dn.place_of_supply}` : ''}
            </div>
          </div>
        </div>
      </section>

      <section className="sapdn-strip">
        <div>
          <table>
            <tbody>
              <Row label="CUSTOMER NO." value={dn.bill_to.code} />
              <Row label="CUSTOMER REF. NO." value={dn.reference} />
              <Row label="SALES EMPLOYEE" value={dn.sales_employee} />
            </tbody>
          </table>
        </div>
        <div>
          <table>
            <tbody>
              <Row label="POSTING DATE" value={fmtDate(dn.posting_date || dn.doc_date)} />
              <Row label="DELIVERY DATE" value={fmtDate(dn.delivery_date || dn.doc_date)} />
              <Row label="WAREHOUSE" value={warehouse} />
            </tbody>
          </table>
        </div>
      </section>

      <table className="sapdn-items">
        <thead>
          <tr>
            <th style={{ width: '3.5%' }}>#</th>
            <th style={{ width: '9.5%' }}>Item No.</th>
            <th>Item Description</th>
            <th style={{ width: '9%' }}>HSN / SAC</th>
            <th style={{ width: '7.5%' }}>Quantity</th>
            <th style={{ width: '4.5%' }}>UoM</th>
            <th style={{ width: '8.5%' }}>Tax Code</th>
            <th style={{ width: '9%' }}>Unit Price</th>
            <th style={{ width: '10%' }}>Total (LC)</th>
          </tr>
        </thead>
        <tbody>
          {dn.lines.map((l) => (
            <tr key={`${l.no}-${l.item_code}`}>
              <td className="c">{l.no}</td>
              <td>{l.item_code}</td>
              <td>
                {l.item_name}
                {l.batches.length ? (
                  <div className="sapdn-batch">Batch: {l.batches.join(', ')}</div>
                ) : null}
              </td>
              <td className="c">{l.hsn}</td>
              <td className="n">{qty(l.quantity)}</td>
              <td className="c">{l.uom}</td>
              <td>{l.tax_code}</td>
              <td className="n">{amt(l.unit_price)}</td>
              <td className="n">{amt(l.line_total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="n">
              Total Quantity
            </td>
            <td className="n">{qty(dn.totals.quantity)}</td>
            <td colSpan={3} />
            <td className="n">{amt(money.before_discount)}</td>
          </tr>
        </tfoot>
      </table>

      <section className="sapdn-lower">
        <div className="sapdn-lower-l">
          <div className="sapdn-box">
            <div className="sapdn-band">AMOUNT IN WORDS</div>
            <div className="sapdn-box-body">{dash(money.amount_in_words)}</div>
          </div>
          {dn.comments ? (
            <div className="sapdn-box">
              <div className="sapdn-band">REMARKS</div>
              <div className="sapdn-box-body">{dn.comments}</div>
            </div>
          ) : null}
          {hasEway ? (
            <div className="sapdn-box">
              <div className="sapdn-band">E-WAY BILL</div>
              <div className="sapdn-box-body">Vehicle No.: {dash(eway?.vehicle_no)}</div>
            </div>
          ) : null}
        </div>

        <div className="sapdn-lower-r">
          <table className="sapdn-totals">
            <tbody>
              <tr>
                <th>Total Before Discount</th>
                <td>{amt(money.before_discount)}</td>
              </tr>
              <tr>
                <th>Discount</th>
                <td>{amt(money.discount)}</td>
              </tr>
              <tr>
                <th>Freight</th>
                <td>{amt(money.freight)}</td>
              </tr>
              {taxRows.map((t) => (
                <tr key={t.code}>
                  <th>{t.label}</th>
                  <td>{amt(t.amount)}</td>
                </tr>
              ))}
              <tr>
                <th>Rounding</th>
                <td>{amt(money.rounding)}</td>
              </tr>
              <tr className="due">
                <th>Total Payment Due ({dash(dn.currency) || 'INR'})</th>
                <td>{amt(money.doc_total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="sapdn-sign">
        <div>Prepared By</div>
        <div>
          <div>Authorised Signatory</div>
          <div className="b">For {dash(dn.seller.name)}</div>
        </div>
        <div>
          <div>Received the above goods in good condition</div>
          <div>Receiver&rsquo;s Signature</div>
        </div>
      </section>

      <div className="sapdn-foot">
        This is a delivery document and not a tax invoice. Goods once delivered are subject to the
        terms agreed with the customer.
      </div>
    </div>
  );
});

MpDeliveryNotePrint.displayName = 'MpDeliveryNotePrint';
