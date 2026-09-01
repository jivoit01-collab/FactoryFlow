/** Printable delivery note in the SAP challan layout — the document that travels
 *  with the goods.
 *
 *  Mirrors the posted SAP note field for field (ODLN header, both address blocks, the
 *  GST identity, the e-way bill block and every DLN1 line), because a challan must say
 *  what SAP says rather than what we hoped we posted.
 *
 *  The money is the one place the two disagree. This module posts delivery notes with
 *  quantities only, so every amount on the SAP document is genuinely 0.00. The value
 *  figure therefore comes from JI's own internal bills and says so on its face — the
 *  SAP half and the JI half stay visibly separate rather than blended into a number
 *  nobody can source.
 *
 *  The orders behind the note are summarised as a count, never listed: one bulk note
 *  can cover 300-plus orders and the table ran for pages, burying the goods being
 *  delivered. The CSV export is where that list belongs.
 *
 *  Designed for ink and photocopiers: one dark ink, hairline rules, no fill heavier
 *  than a 4% grey. The item table's header repeats on every page and no row splits
 *  across a page break.
 */
import { forwardRef } from 'react';

import type { DeliveryNotePrint } from '../types/marketplace.types';

export const DN_PRINT_PAGE_STYLE = `
  @page { size: A4 portrait; margin: 12mm 10mm; }
  @media print {
    body { margin: 0; background: #fff !important; }
    .mp-dn { color: #000 !important; }
  }
`;

const dash = (v?: string | number | null) =>
  v === undefined || v === null || v === '' ? '—' : String(v);

const money = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : v;
};

/** SAP's enum-ish codes read badly on paper: ewb_st_Outward → Outward. */
const humanise = (v: string) =>
  (v || '').replace(/^ewb_(st|tt)_/, '').replace(/([a-z])([A-Z])/g, '$1 $2');

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="mp-dn-field">
      <span className="mp-dn-k">{label}</span>
      <span className="mp-dn-v">{dash(value)}</span>
    </div>
  );
}

interface Props {
  dn: DeliveryNotePrint;
}

export const MpDeliveryNotePrint = forwardRef<HTMLDivElement, Props>(({ dn }, ref) => {
  const sellerPlace = [dn.seller.place, dn.seller.zip].filter(Boolean).join(' – ');
  const billRegion = [dn.bill_to.city, dn.bill_to.state, dn.bill_to.zip, dn.bill_to.country]
    .filter(Boolean)
    .join(', ');
  const shipRegion = [dn.ship_to.city, dn.ship_to.state, dn.ship_to.zip, dn.ship_to.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div ref={ref} className="mp-dn">
      <style>{`
        .mp-dn {
          --ink: #111; --mid: #565656; --rule: #b9b9b9; --hair: #e5e5e5;
          font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
          font-size: 9pt; line-height: 1.35; color: var(--ink); background: #fff;
          -webkit-font-smoothing: antialiased;
        }
        .mp-dn * { box-sizing: border-box; }

        /* masthead */
        .mp-dn-band { display: flex; align-items: baseline; justify-content: space-between;
                      gap: 12px; background: var(--ink); color: #fff; padding: 7px 10px; }
        .mp-dn-band h1 { margin: 0; font-size: 14pt; font-weight: 700;
                         letter-spacing: 3.5px; text-transform: uppercase; }
        .mp-dn-docno { font-size: 12pt; font-weight: 700; font-variant-numeric: tabular-nums; }
        .mp-dn-void { border: 1px solid #fff; padding: 1px 6px; font-size: 7.5pt;
                      letter-spacing: 1px; text-transform: uppercase; }

        .mp-dn-seller { display: flex; justify-content: space-between; gap: 16px;
                        padding: 9px 10px; border: 1px solid var(--rule); border-top: none; }
        .mp-dn-seller-name { font-size: 13pt; font-weight: 700; }
        .mp-dn-addr { color: var(--mid); font-size: 8.5pt; }
        .mp-dn-gst { text-align: right; white-space: nowrap; }

        /* label / value */
        .mp-dn-k { display: block; font-size: 6.6pt; letter-spacing: 1px;
                   text-transform: uppercase; color: var(--mid); }
        .mp-dn-v { display: block; font-size: 9pt; }
        .mp-dn-field + .mp-dn-field { margin-top: 5px; }
        .mp-dn-code { font-variant-numeric: tabular-nums; letter-spacing: .2px; }

        .mp-dn-meta { display: grid; grid-template-columns: repeat(4, 1fr);
                      border: 1px solid var(--rule); border-top: none; }
        .mp-dn-meta > div { padding: 6px 10px; }
        .mp-dn-meta > div + div { border-left: 1px solid var(--rule); }
        .mp-dn-meta .mp-dn-v { font-variant-numeric: tabular-nums; }

        /* parties */
        .mp-dn-parties { display: grid; grid-template-columns: 1fr 1fr;
                         border: 1px solid var(--rule); border-top: none; }
        .mp-dn-party { padding: 8px 10px; }
        .mp-dn-party + .mp-dn-party { border-left: 1px solid var(--rule); }
        .mp-dn-cap { font-size: 6.6pt; letter-spacing: 1.3px; text-transform: uppercase;
                     color: var(--mid); margin-bottom: 3px; }
        .mp-dn-party-name { font-size: 10pt; font-weight: 700; }

        /* items */
        table.mp-dn-items { width: 100%; border-collapse: collapse; margin-top: 11px; font-size: 8.5pt; }
        .mp-dn-items thead { display: table-header-group; }
        .mp-dn-items tr { break-inside: avoid; page-break-inside: avoid; }
        .mp-dn-items th { background: var(--ink); color: #fff; font-size: 6.6pt; font-weight: 600;
                          letter-spacing: .9px; text-transform: uppercase; padding: 6px;
                          text-align: left; }
        .mp-dn-items td { padding: 5px 6px; border-bottom: 1px solid var(--hair); vertical-align: top; }
        .mp-dn-items tbody tr:nth-child(even) td { background: #fafafa; }
        .mp-dn-items .n { text-align: right; font-variant-numeric: tabular-nums; }
        .mp-dn-items .c { text-align: center; }
        .mp-dn-desc { font-weight: 500; }
        .mp-dn-sub { color: var(--mid); font-size: 7.2pt; margin-top: 1px; }
        .mp-dn-items tfoot td { border-top: 1.5px solid var(--ink); border-bottom: none;
                                font-weight: 700; padding: 7px 6px; background: #fff; }

        /* summary cards */
        .mp-dn-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
                       margin-top: 11px; break-inside: avoid; page-break-inside: avoid; }
        .mp-dn-card { border: 1px solid var(--rule); padding: 8px 10px; }
        .mp-dn-card h4 { margin: 0 0 6px; font-size: 6.6pt; letter-spacing: 1.3px;
                         text-transform: uppercase; color: var(--mid); font-weight: 600;
                         border-bottom: 1px solid var(--hair); padding-bottom: 4px; }
        .mp-dn-row { display: flex; justify-content: space-between; gap: 8px; font-size: 8.5pt; }
        .mp-dn-row + .mp-dn-row { margin-top: 3px; }
        .mp-dn-row span:last-child { font-variant-numeric: tabular-nums; text-align: right; }
        .mp-dn-figure { font-size: 14pt; font-weight: 700; font-variant-numeric: tabular-nums;
                        letter-spacing: -.3px; margin-bottom: 3px; }
        .mp-dn-fine { color: var(--mid); font-size: 7pt; line-height: 1.35; margin-top: 5px; }

        .mp-dn-remarks { border: 1px solid var(--rule); padding: 8px 10px; margin-top: 8px;
                         break-inside: avoid; }

        /* signatures + footer */
        .mp-dn-sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px;
                      margin-top: 28px; break-inside: avoid; page-break-inside: avoid; }
        .mp-dn-sign div { border-top: 1px solid var(--ink); padding-top: 5px;
                          font-size: 7.2pt; letter-spacing: .6px; text-transform: uppercase;
                          color: var(--mid); text-align: center; }
        .mp-dn-foot { margin-top: 11px; padding-top: 5px; border-top: 1px solid var(--hair);
                      display: flex; justify-content: space-between;
                      color: var(--mid); font-size: 7pt; letter-spacing: .3px; }
      `}</style>

      <header className="mp-dn-band">
        <h1>Delivery Note</h1>
        {dn.cancelled ? <span className="mp-dn-void">Cancelled in SAP</span> : null}
        <span className="mp-dn-docno">{dash(dn.doc_num)}</span>
      </header>

      <section className="mp-dn-seller">
        <div>
          <div className="mp-dn-seller-name">{dash(dn.seller.name)}</div>
          <div className="mp-dn-addr">
            {dn.seller.address.join(', ')}
            {sellerPlace ? `, ${sellerPlace}` : ''}
          </div>
        </div>
        <div className="mp-dn-gst">
          <span className="mp-dn-k">GSTIN</span>
          <span className="mp-dn-v mp-dn-code">
            <strong>{dash(dn.seller.gstin)}</strong>
          </span>
          {dn.seller.state_code ? (
            <div className="mp-dn-addr">State code {dn.seller.state_code}</div>
          ) : null}
        </div>
      </section>

      <section className="mp-dn-meta">
        <div>
          <Field label="Date" value={dn.doc_date} />
          <Field label="Time" value={dn.doc_time ? dn.doc_time.slice(0, 5) : ''} />
        </div>
        <div>
          <Field label="Reference" value={dn.reference} />
          <Field label="Currency" value={dn.currency} />
        </div>
        <div>
          <Field
            label="Branch"
            value={
              dn.branch.name
                ? `${dn.branch.name}${dn.branch.id != null ? ` (${dn.branch.id})` : ''}`
                : dn.branch.id
            }
          />
          <Field label="Place of supply" value={dn.place_of_supply} />
        </div>
        <div>
          <Field label="SAP doc entry" value={dn.doc_entry} />
          <Field label="Series" value={dn.series} />
        </div>
      </section>

      <section className="mp-dn-parties">
        <div className="mp-dn-party">
          <div className="mp-dn-cap">Bill to</div>
          <div className="mp-dn-party-name">{dash(dn.bill_to.name)}</div>
          <div className="mp-dn-addr">
            <div className="mp-dn-code">{dn.bill_to.code}</div>
            {dn.bill_to.address.join(', ')}
            {billRegion ? <div>{billRegion}</div> : null}
          </div>
          <div style={{ marginTop: 4 }}>
            <span className="mp-dn-k">GSTIN</span>
            <span className="mp-dn-v mp-dn-code">{dash(dn.bill_to.gstin)}</span>
          </div>
        </div>
        <div className="mp-dn-party">
          <div className="mp-dn-cap">Ship to</div>
          <div className="mp-dn-party-name">{dash(dn.ship_to.code)}</div>
          <div className="mp-dn-addr">
            {dn.ship_to.address.join(', ')}
            {shipRegion ? <div>{shipRegion}</div> : null}
          </div>
        </div>
      </section>

      <table className="mp-dn-items">
        <thead>
          <tr>
            <th className="c" style={{ width: '4%' }}>#</th>
            <th style={{ width: '13%' }}>Item code</th>
            <th>Description of goods</th>
            <th className="c" style={{ width: '10%' }}>HSN</th>
            <th className="n" style={{ width: '8%' }}>Qty</th>
            <th className="c" style={{ width: '6%' }}>UoM</th>
            <th className="c" style={{ width: '10%' }}>Warehouse</th>
            <th className="c" style={{ width: '10%' }}>Cost centre</th>
            <th className="c" style={{ width: '11%' }}>Tax</th>
          </tr>
        </thead>
        <tbody>
          {dn.lines.map((l) => (
            <tr key={`${l.no}-${l.item_code}`}>
              <td className="c">{l.no}</td>
              <td className="mp-dn-code">{l.item_code}</td>
              <td>
                <div className="mp-dn-desc">{l.item_name}</div>
                {l.batches.length ? (
                  <div className="mp-dn-sub">Batch {l.batches.join(', ')}</div>
                ) : null}
              </td>
              <td className="c mp-dn-code">{l.hsn}</td>
              <td className="n">{l.quantity}</td>
              <td className="c">{l.uom}</td>
              <td className="c mp-dn-code">{l.warehouse}</td>
              <td className="c">{l.cost_centre}</td>
              <td className="c">
                {l.tax_code}
                {l.tax_rate ? <div className="mp-dn-sub">{l.tax_rate}%</div> : null}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} style={{ textAlign: 'right' }}>
              Total — {dn.totals.lines} item{dn.totals.lines === 1 ? '' : 's'}
            </td>
            <td className="n">{dn.totals.quantity}</td>
            <td colSpan={4} />
          </tr>
        </tfoot>
      </table>

      <section className="mp-dn-strip">
        <div className="mp-dn-card">
          <h4>Tax</h4>
          {dn.tax_summary.length ? (
            dn.tax_summary.map((t) => (
              <div className="mp-dn-row" key={t.code}>
                <span>{t.code.replace('@', ' ')}</span>
                <span>{t.rate}%</span>
              </div>
            ))
          ) : (
            <div className="mp-dn-row">
              <span>—</span>
            </div>
          )}
          <div className="mp-dn-fine">
            Rates as posted in SAP. This note carries no line values — it is posted
            quantity-only.
          </div>
        </div>

        <div className="mp-dn-card">
          <h4>Value — JI internal bills</h4>
          <div className="mp-dn-figure">{money(dn.totals.billed_by_ji)}</div>
          <div className="mp-dn-row">
            <span>Orders covered</span>
            <span>{dn.totals.orders}</span>
          </div>
          <div className="mp-dn-fine">
            Billed on JI&apos;s own invoices for these orders; the order-by-order list is
            in the CSV export. SAP&apos;s DocTotal on this note is 0.00.
          </div>
        </div>

        <div className="mp-dn-card">
          <h4>E-way bill</h4>
          <div className="mp-dn-row">
            <span>Document</span>
            <span>{dash(dn.eway.document_type)}</span>
          </div>
          <div className="mp-dn-row">
            <span>Supply</span>
            <span>{dash(humanise(dn.eway.supply_type))}</span>
          </div>
          <div className="mp-dn-row">
            <span>Transaction</span>
            <span>{dash(humanise(dn.eway.transaction_type))}</span>
          </div>
          <div className="mp-dn-row">
            <span>Vehicle</span>
            <span>{dash(dn.eway.vehicle_no)}</span>
          </div>
        </div>
      </section>

      {dn.comments ? (
        <section className="mp-dn-remarks">
          <div className="mp-dn-cap">Remarks</div>
          <div>{dn.comments}</div>
        </section>
      ) : null}

      <section className="mp-dn-sign">
        <div>Prepared by</div>
        <div>Authorised signatory</div>
        <div>Received in good condition</div>
      </section>

      <footer className="mp-dn-foot">
        <span>
          Delivery note {dash(dn.doc_num)} · {dash(dn.doc_date)}
        </span>
        <span>Computer generated · JIVO</span>
      </footer>
    </div>
  );
});

MpDeliveryNotePrint.displayName = 'MpDeliveryNotePrint';
