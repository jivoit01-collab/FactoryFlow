/** Printable delivery note in the SAP layout — the challan that travels with the goods.
 *
 *  Mirrors the posted SAP document field for field (ODLN header, both address blocks,
 *  the GST identity, the e-way bill block and every DLN1 line), because a printed
 *  challan must say what SAP says.
 *
 *  The money is the one place the two disagree. This module posts delivery notes with
 *  quantities only, so every amount on the SAP document is genuinely 0.00. The value
 *  block therefore comes from JI's own internal bills and says so on its face — the
 *  SAP half and the JI half are kept visibly separate rather than blended.
 */
import { forwardRef } from 'react';

import type { DeliveryNotePrint } from '../types/marketplace.types';

export const DN_PRINT_PAGE_STYLE = `
  @page { size: A4 portrait; margin: 8mm; }
  @media print {
    body { margin: 0; background: #fff !important; }
    .mp-dn-print { color: #000 !important; }
  }
`;

const dash = (v?: string | number | null) =>
  v === undefined || v === null || v === '' ? '—' : String(v);

interface Props {
  dn: DeliveryNotePrint;
}

export const MpDeliveryNotePrint = forwardRef<HTMLDivElement, Props>(({ dn }, ref) => {
  const gstLine = [dn.place_of_supply && `Place of supply: ${dn.place_of_supply}`]
    .filter(Boolean)
    .join('   ');

  return (
    <div ref={ref} className="mp-dn-print">
      <style>{`
        .mp-dn-print { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #000; background: #fff; }
        .mp-dn-print table { width: 100%; border-collapse: collapse; }
        .mp-dn-print th, .mp-dn-print td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
        .mp-dn-title { text-align: center; font-size: 13pt; font-weight: bold; letter-spacing: 1px;
                       border: 1px solid #000; border-bottom: none; padding: 5px; }
        .mp-dn-seller { border: 1px solid #000; padding: 6px 8px; }
        .mp-dn-seller-name { font-size: 12pt; font-weight: bold; }
        .mp-dn-seller-addr { white-space: pre-line; font-size: 8.5pt; }
        .mp-dn-meta { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #000;
                      border-top: none; font-size: 8.5pt; }
        .mp-dn-meta > div { padding: 3px 8px; border-right: 1px solid #ddd; }
        .mp-dn-parties { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; border-top: none; }
        .mp-dn-party { padding: 6px 8px; }
        .mp-dn-party + .mp-dn-party { border-left: 1px solid #000; }
        .mp-dn-party h4 { margin: 0 0 3px; font-size: 8pt; text-transform: uppercase; letter-spacing: .5px; }
        .mp-dn-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .4px; color: #444; }
        .mp-dn-items { margin-top: 6px; font-size: 8.5pt; }
        .mp-dn-items th { background: #eee; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .3px; }
        .mp-dn-num { text-align: right; font-variant-numeric: tabular-nums; }
        .mp-dn-c { text-align: center; }
        .mp-dn-batch { font-size: 7.5pt; color: #333; }
        .mp-dn-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
        .mp-dn-box { border: 1px solid #000; padding: 6px 8px; font-size: 8.5pt; }
        .mp-dn-box h4 { margin: 0 0 4px; font-size: 8pt; text-transform: uppercase; letter-spacing: .5px; }
        .mp-dn-note { font-size: 7.5pt; color: #444; font-style: italic; }
        .mp-dn-orders { margin-top: 6px; font-size: 7.5pt; }
        .mp-dn-orders td { padding: 2px 5px; }
        .mp-dn-sign { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 14px; gap: 6px; }
        .mp-dn-sign div { border-top: 1px solid #000; padding-top: 3px; font-size: 8pt; text-align: center; }
        .mp-dn-cancel { color: #b00; font-weight: bold; }
        .mp-dn-mono { font-family: 'Courier New', monospace; }
      `}</style>

      <div className="mp-dn-title">
        DELIVERY NOTE {dn.cancelled ? <span className="mp-dn-cancel">— CANCELLED IN SAP</span> : null}
      </div>

      {/* Seller / dispatch-from — SAP's e-way bill "Bill From" block */}
      <div className="mp-dn-seller">
        <div className="mp-dn-seller-name">{dash(dn.seller.name)}</div>
        <div className="mp-dn-seller-addr">{dn.seller.address.join('\n')}</div>
        <div className="mp-dn-seller-addr">
          {[dn.seller.place, dn.seller.zip].filter(Boolean).join(' - ')}
        </div>
        <div>
          <strong>GSTIN:</strong> <span className="mp-dn-mono">{dash(dn.seller.gstin)}</span>
          {dn.seller.state_code ? `   State code: ${dn.seller.state_code}` : ''}
        </div>
      </div>

      <div className="mp-dn-meta">
        <div>
          <span className="mp-dn-label">Doc no.</span>
          <div className="mp-dn-mono">
            <strong>{dash(dn.doc_num)}</strong>
          </div>
        </div>
        <div>
          <span className="mp-dn-label">Date / time</span>
          <div>
            {dash(dn.doc_date)} {dn.doc_time ? dn.doc_time.slice(0, 5) : ''}
          </div>
        </div>
        <div>
          <span className="mp-dn-label">Branch</span>
          <div>
            {dash(dn.branch.name)}
            {dn.branch.id != null ? ` (${dn.branch.id})` : ''}
          </div>
        </div>
        <div>
          <span className="mp-dn-label">Reference</span>
          <div className="mp-dn-mono">{dash(dn.reference)}</div>
        </div>
        <div>
          <span className="mp-dn-label">SAP DocEntry / series</span>
          <div className="mp-dn-mono">
            {dash(dn.doc_entry)} / {dash(dn.series)}
          </div>
        </div>
        <div>
          <span className="mp-dn-label">Currency</span>
          <div>{dash(dn.currency)}</div>
        </div>
      </div>

      <div className="mp-dn-parties">
        <div className="mp-dn-party">
          <h4>Bill to</h4>
          <div>
            <strong>{dash(dn.bill_to.name)}</strong>
          </div>
          <div className="mp-dn-mono">{dash(dn.bill_to.code)}</div>
          <div className="mp-dn-seller-addr">{dn.bill_to.address.join('\n')}</div>
          <div>
            {[dn.bill_to.city, dn.bill_to.state, dn.bill_to.zip, dn.bill_to.country]
              .filter(Boolean)
              .join(', ')}
          </div>
          <div>
            <strong>GSTIN:</strong> <span className="mp-dn-mono">{dash(dn.bill_to.gstin)}</span>
          </div>
        </div>
        <div className="mp-dn-party">
          <h4>Ship to</h4>
          <div>
            <strong>{dash(dn.ship_to.code)}</strong>
          </div>
          <div className="mp-dn-seller-addr">{dn.ship_to.address.join('\n')}</div>
          <div>
            {[dn.ship_to.city, dn.ship_to.state, dn.ship_to.zip, dn.ship_to.country]
              .filter(Boolean)
              .join(', ')}
          </div>
          {gstLine ? <div>{gstLine}</div> : null}
        </div>
      </div>

      <table className="mp-dn-items">
        <thead>
          <tr>
            <th className="mp-dn-c">#</th>
            <th>Item code</th>
            <th>Description of goods</th>
            <th className="mp-dn-c">HSN</th>
            <th className="mp-dn-num">Qty</th>
            <th className="mp-dn-c">UoM</th>
            <th className="mp-dn-c">Warehouse</th>
            <th className="mp-dn-c">Cost centre</th>
            <th className="mp-dn-c">Tax code</th>
            <th className="mp-dn-num">Tax %</th>
          </tr>
        </thead>
        <tbody>
          {dn.lines.map((l) => (
            <tr key={`${l.no}-${l.item_code}`}>
              <td className="mp-dn-c">{l.no}</td>
              <td className="mp-dn-mono">{l.item_code}</td>
              <td>
                {l.item_name}
                {l.batches.length ? (
                  <div className="mp-dn-batch">Batch: {l.batches.join(', ')}</div>
                ) : null}
              </td>
              <td className="mp-dn-c mp-dn-mono">{l.hsn || ''}</td>
              <td className="mp-dn-num">{l.quantity}</td>
              <td className="mp-dn-c">{l.uom}</td>
              <td className="mp-dn-c mp-dn-mono">{l.warehouse}</td>
              <td className="mp-dn-c">{l.cost_centre}</td>
              <td className="mp-dn-c">{l.tax_code}</td>
              <td className="mp-dn-num">{l.tax_rate}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>
              Total ({dn.totals.lines} item{dn.totals.lines === 1 ? '' : 's'})
            </td>
            <td className="mp-dn-num" style={{ fontWeight: 'bold' }}>
              {dn.totals.quantity}
            </td>
            <td colSpan={5} />
          </tr>
        </tbody>
      </table>

      <div className="mp-dn-strip">
        <div className="mp-dn-box">
          <h4>Tax</h4>
          {dn.tax_summary.length ? (
            dn.tax_summary.map((t) => (
              <div key={t.code}>
                {t.code} — {t.rate}%
              </div>
            ))
          ) : (
            <div>—</div>
          )}
          <div className="mp-dn-note">
            Rates as posted on the SAP document. This note carries no line values: it is
            posted quantity-only.
          </div>
        </div>
        <div className="mp-dn-box">
          <h4>Value (JI internal bills)</h4>
          <div>
            Orders on this note: <strong>{dn.totals.orders}</strong>
          </div>
          <div>
            Billed: <strong>₹{Number(dn.totals.billed_by_ji).toLocaleString('en-IN')}</strong>
          </div>
          <div className="mp-dn-note">
            From JI&apos;s own invoices for these orders. SAP&apos;s DocTotal on this
            delivery note is 0.00.
          </div>
        </div>
      </div>

      <div className="mp-dn-strip">
        <div className="mp-dn-box">
          <h4>E-way bill</h4>
          <div>Document type: {dash(dn.eway.document_type)}</div>
          <div>Supply type: {dash(dn.eway.supply_type)}</div>
          <div>Transaction: {dash(dn.eway.transaction_type)}</div>
          <div>Vehicle no.: {dash(dn.eway.vehicle_no)}</div>
        </div>
        <div className="mp-dn-box">
          <h4>Remarks</h4>
          <div>{dn.comments || '—'}</div>
        </div>
      </div>

      {dn.orders.length ? (
        <>
          <div className="mp-dn-label" style={{ marginTop: 8 }}>
            Orders covered by this delivery note ({dn.orders.length})
          </div>
          <table className="mp-dn-orders">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Buyer</th>
                <th>JI invoice</th>
                <th className="mp-dn-num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {dn.orders.map((o) => (
                <tr key={o.order_id}>
                  <td className="mp-dn-mono">{o.order_id}</td>
                  <td>{o.buyer_name}</td>
                  <td className="mp-dn-mono">{o.invoice_number}</td>
                  <td className="mp-dn-num">{o.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <div className="mp-dn-sign">
        <div>Prepared by</div>
        <div>Authorised signatory</div>
        <div>Received in good condition</div>
      </div>
    </div>
  );
});

MpDeliveryNotePrint.displayName = 'MpDeliveryNotePrint';
