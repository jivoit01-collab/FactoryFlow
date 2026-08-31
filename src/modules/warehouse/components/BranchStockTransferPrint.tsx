import JsBarcode from 'jsbarcode';
import { forwardRef, useEffect, useRef } from 'react';

import type { WarehousePrintAddress, WarehousePrintInfo } from '../types';

/**
 * A printable Branch Stock Transfer document modelled on SAP B1's Crystal
 * print (the layout operators already know): letterhead with the company's
 * legal name and a barcode, Billed To / Consignee blocks, the document-detail
 * cell grid, and an item table with Quantity / Box columns.
 *
 * Deliberately prints WITHOUT rates or amounts — inventory transfers carry no
 * price in this app, and even SAP's own print totals 0.00 for them.
 *
 * Shared by the transfer-request and BST detail pages; each maps its own
 * record into `BranchTransferPrintData`. Letterhead addresses/GST come from
 * the /warehouse/print-info/ endpoint and are optional — the document still
 * prints with those cells blank when SAP is unreachable.
 */

export const BST_DOC_PRINT_PAGE_STYLE = `
  @page {
    size: A4 portrait;
    margin: 5mm;
  }

  @media print {
    body {
      margin: 0;
      background: #ffffff !important;
    }

    .bst-doc-print-host {
      position: static !important;
      left: auto !important;
      top: auto !important;
      width: 100% !important;
    }
  }
`;

export interface BranchTransferPrintLine {
  description: string;
  hsn?: string;
  quantity: number;
  uom: string;
  boxes?: number | null;
}

export interface BranchTransferPrintData {
  /** SAP document number — the "Invoice No." cell. */
  docNum: string;
  /** SAP DocEntry, rendered as the barcode; no barcode when absent. */
  docEntry?: number | null;
  docDate?: string | null;
  /** The app's own entry number, printed in the Delivery Note cell. */
  reference?: string;
  fromWarehouse: string;
  toWarehouse: string;
  vehicleNo?: string | null;
  transporterName?: string | null;
  biltyNo?: string | null;
  biltyDate?: string | null;
  dispatchDate?: string | null;
  destination?: string | null;
  lines: BranchTransferPrintLine[];
}

interface BranchStockTransferPrintProps {
  data: BranchTransferPrintData;
  printInfo?: WarehousePrintInfo | null;
  /** Fallback letterhead name while print-info hasn't loaded. */
  companyName?: string;
}

export const BranchStockTransferPrint = forwardRef<HTMLDivElement, BranchStockTransferPrintProps>(
  ({ data, printInfo, companyName }, ref) => {
    const fromInfo = printInfo?.warehouses?.[data.fromWarehouse];
    const toInfo = printInfo?.warehouses?.[data.toWarehouse];
    const legalName = printInfo?.company_name || companyName || '';
    const totalQty = data.lines.reduce((sum, line) => sum + toNumber(line.quantity), 0);
    const totalBoxes = data.lines.reduce((sum, line) => sum + toNumber(line.boxes), 0);
    const uom = data.lines[0]?.uom || 'PCS';

    return (
      <div ref={ref} className="bst-doc-print">
        <div className="bst-doc-masthead">
          <div className="bst-doc-company-name">{legalName || ' '}</div>
          <div className="bst-doc-copy">Original</div>
        </div>

        <div className="bst-doc-subhead">
          <div className="bst-doc-company-address">
            <AddressLines info={fromInfo} />
          </div>
          <div className="bst-doc-title">Branch Stock Transfer</div>
          <div className="bst-doc-barcode">
            {data.docEntry ? <DocBarcode value={String(data.docEntry)} /> : null}
          </div>
        </div>

        <div className="bst-doc-box">
          <div className="bst-doc-parties">
            <div className="bst-doc-party-left">
              <div className="bst-doc-strong">Billed To</div>
              <div className="bst-doc-strong">{legalName}</div>
              <AddressLines info={toInfo} withState />
              <div className="bst-doc-gst-row">
                <span className="bst-doc-strong">GST: {toInfo?.gstin || ''}</span>
                <span className="bst-doc-strong">STATE</span>
                <span className="bst-doc-strong">{toInfo?.state_name || ''}</span>
              </div>
              <div className="bst-doc-strong">
                E-Mail :{printInfo?.company_email || ''}
              </div>

              <div className="bst-doc-consignee">
                <div className="bst-doc-consignee-label">Consignee</div>
                <AddressLines info={toInfo} withState={false} />
                <div className="bst-doc-gst-row">
                  <span className="bst-doc-strong">GST {toInfo?.gstin || ''}</span>
                  <span className="bst-doc-strong">STATE</span>
                  <span className="bst-doc-strong">{toInfo?.state_name || ''}</span>
                </div>
              </div>
            </div>

            <div className="bst-doc-cellgrid">
              <Cell label="Invoice No." value={data.docNum} strongValue />
              <Cell label="Date:" value={formatDocDate(data.docDate)} />
              <Cell label="Delivery Note" value={data.reference} />
              <Cell label="Mode/ Terms of Payment" />
              <Cell label="Buyer's Order No." />
              <Cell label="Dated" value={formatDocDate(data.docDate)} />
              <Cell label="Dispatch Document No" />
              <Cell label="Dispatch Dated" value={formatDocDate(data.dispatchDate)} />
              <Cell label="Despatch through" value={data.transporterName} />
              <Cell label="Destination" value={data.destination} />
              <div className="bst-doc-cell bst-doc-cell-wide">
                <div className="bst-doc-cell-label">Bilty Date : {data.biltyDate || ''}</div>
                <div className="bst-doc-cell-label">Bilty Number : {data.biltyNo || ''}</div>
                <div className="bst-doc-cell-label">Vehicle No : {data.vehicleNo || ''}</div>
                <div className="bst-doc-cell-label">
                  Dispatch Date : {formatDocDate(data.dispatchDate)}
                </div>
                <div className="bst-doc-cell-label">
                  Transporter Name : {data.transporterName || ''}
                </div>
              </div>
            </div>
          </div>

          <table className="bst-doc-items">
            <colgroup>
              <col className="bst-doc-col-sno" />
              <col className="bst-doc-col-desc" />
              <col className="bst-doc-col-hsn" />
              <col className="bst-doc-col-qty" />
              <col className="bst-doc-col-box" />
              <col className="bst-doc-col-rate" />
              <col className="bst-doc-col-per" />
              <col className="bst-doc-col-amount" />
            </colgroup>
            <thead>
              <tr>
                <th>Sl.No</th>
                <th>Description</th>
                <th>HSN</th>
                <th>Quantity</th>
                <th>Box</th>
                <th>Rate</th>
                <th>Per</th>
                <th>
                  Total Amount
                  <br />
                  INR
                </th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((line, index) => (
                <tr key={`${line.description}-${index}`}>
                  <td className="bst-doc-center">{index + 1}</td>
                  <td className="bst-doc-strong">{line.description}</td>
                  <td className="bst-doc-center">{line.hsn || ''}</td>
                  <td className="bst-doc-num">
                    {formatNumber(line.quantity)} {line.uom}
                  </td>
                  <td className="bst-doc-num">
                    {line.boxes != null && line.boxes > 0 ? formatNumber(line.boxes) : ''}
                  </td>
                  <td className="bst-doc-num" />
                  <td className="bst-doc-center">{line.uom}</td>
                  <td className="bst-doc-num" />
                </tr>
              ))}
              <tr className="bst-doc-items-filler">
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
              </tr>
              <tr className="bst-doc-total-row">
                <td colSpan={2}>
                  <span className="bst-doc-strong">Litter:</span>
                  {'  '}From <span className="bst-doc-strong">{data.fromWarehouse}</span> To{' '}
                  <span className="bst-doc-strong">{data.toWarehouse}</span>
                </td>
                <td className="bst-doc-center bst-doc-strong">Total</td>
                <td className="bst-doc-num bst-doc-strong">{formatNumber(totalQty)}</td>
                <td className="bst-doc-num bst-doc-strong">
                  {totalBoxes > 0 ? formatWhole(totalBoxes) : ''}
                </td>
                <td colSpan={2} className="bst-doc-center bst-doc-strong">
                  Total Amount
                </td>
                <td className="bst-doc-num bst-doc-strong">0.00</td>
              </tr>
            </tbody>
          </table>

          <div className="bst-doc-words">
            <span className="bst-doc-strong">Amount Chargeable in Words (INR) :</span> RUPEES ONLY
          </div>

          <div className="bst-doc-filler" />

          <div className="bst-doc-declaration">
            <div className="bst-doc-strong">Declaration : -</div>
            <div>
              We declare that this document shows the actual description of the goods and that
              all particulars are true and correct.
            </div>
            <div className="bst-doc-for">For {legalName}</div>
          </div>

          <div className="bst-doc-signatures">
            <div>Received By</div>
            <div>Verified By</div>
            <div>Checked By</div>
            <div>Authorised Signatory</div>
          </div>
        </div>

        <div className="bst-doc-footer">
          <div className="bst-doc-footer-row">
            <span>Printed By JI</span>
            <span>Page 1 of 1</span>
          </div>
          <div className="bst-doc-footer-center">
            This is a Computer Generated Document &amp; doesn't require any signature.
          </div>
          <div className="bst-doc-footer-center">
            {toNumber(totalQty) > 0 ? `Quantity: ${formatNumber(totalQty)} ${uom}` : ' '}
          </div>
        </div>
      </div>
    );
  },
);

BranchStockTransferPrint.displayName = 'BranchStockTransferPrint';

function DocBarcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !value) return;
    try {
      // CODE39 matches the *DocEntry* barcode on SAP's own print.
      JsBarcode(svg, value, {
        format: 'CODE39',
        width: 1.1,
        height: 34,
        displayValue: false,
        margin: 0,
      });
    } catch {
      // Invalid barcode value — leave the corner empty.
    }
  }, [value]);

  return <svg ref={svgRef} />;
}

function AddressLines({
  info,
  withState = false,
}: {
  info?: WarehousePrintAddress;
  withState?: boolean;
}) {
  if (!info) return null;

  const cityLine = [
    [info.block, info.city].filter(Boolean).join(', '),
    info.zip_code,
  ]
    .filter(Boolean)
    .join(' ');
  const country = info.country === 'IN' ? 'INDIA' : info.country;

  return (
    <>
      {info.street ? <div>{info.street}</div> : null}
      {cityLine ? (
        <div>
          {cityLine}
          {country ? `, ${country}` : ''}
          {withState && info.state_name ? `  ${info.state_name}` : ''}
        </div>
      ) : null}
    </>
  );
}

function Cell({
  label,
  value,
  strongValue,
}: {
  label: string;
  value?: string | number | null;
  strongValue?: boolean;
}) {
  return (
    <div className="bst-doc-cell">
      <div className="bst-doc-cell-label">{label}</div>
      <div className={strongValue ? 'bst-doc-cell-value bst-doc-strong' : 'bst-doc-cell-value'}>
        {value ?? ' '}
      </div>
    </div>
  );
}

function formatDocDate(value?: string | null) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${match[3]}-${months[Number(match[2]) - 1]}-${match[1]}`;
}

function formatNumber(value?: string | number | null) {
  return toNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWhole(value?: string | number | null) {
  return toNumber(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return 0;
  const numberValue = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(numberValue) ? numberValue : 0;
}
