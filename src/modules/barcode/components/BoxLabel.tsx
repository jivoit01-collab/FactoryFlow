import { QRCodeSVG } from 'qrcode.react';
import { forwardRef } from 'react';

import { LABEL_HEIGHT, LABEL_WIDTH } from './labelPrint';

export interface BoxLabelData {
  type: string;
  id: number;
  barcode: string;
  qr_payload: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty: string;
  uom: string;
  mfg_date: string;
  exp_date: string;
  production_line: string;
  warehouse: string;
  g_weight?: string;
  n_weight?: string;
}

interface BoxLabelProps {
  data: BoxLabelData;
}

const BoxLabel = forwardRef<HTMLDivElement, BoxLabelProps>(({ data }, ref) => {
  const qrValue = data.qr_payload || data.barcode;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(2);
    return `${dd}/${mm}/${yy}`;
  };

  const cell = {
    fontSize: '6.1px',
    padding: '0 0 0.42mm 0',
    verticalAlign: 'top',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const;
  const label = {
    ...cell,
    width: '10.5mm',
    fontWeight: 'bold',
  } as const;

  return (
    <div
      ref={ref}
      className="barcode-label bg-white text-black"
      style={{
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        padding: '1.3mm',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontFamily: 'Arial, Helvetica, sans-serif',
        lineHeight: '1.1',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.8mm',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '8px', letterSpacing: 0 }}>JIVO WELLNESS</div>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '6.5px',
            border: '1px solid #000',
            padding: '0.2mm 0.8mm',
          }}
        >
          BOX
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: '1.2mm' }}>
        <div
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.7mm' }}
        >
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '7px',
              lineHeight: '1.12',
              maxHeight: '8mm',
              overflow: 'hidden',
              textTransform: 'uppercase',
            }}
          >
            {data.item_name}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <tbody>
              <tr>
                <td style={label}>QTY</td>
                <td style={cell}>
                  : {data.qty} {data.uom}
                </td>
              </tr>
              <tr>
                <td style={label}>IT.CODE</td>
                <td style={cell}>: {data.item_code}</td>
              </tr>
              <tr>
                <td style={label}>B.NO</td>
                <td style={cell}>: {data.batch_number}</td>
              </tr>
              <tr>
                <td style={label}>MFG</td>
                <td style={cell}>: {formatDate(data.mfg_date)}</td>
              </tr>
              <tr>
                <td style={label}>G/N WT</td>
                <td style={cell}>
                  : {data.g_weight || '-'} / {data.n_weight || '0'}
                </td>
              </tr>
              <tr>
                <td style={label}>WH</td>
                <td style={cell}>: {data.warehouse}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{ width: '24mm', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <QRCodeSVG
            value={qrValue}
            size={90}
            level="M"
            includeMargin={false}
            style={{ width: '23mm', height: '23mm' }}
          />
          <div
            style={{
              marginTop: '0.8mm',
              fontSize: '5.8px',
              fontWeight: 'bold',
              lineHeight: '1.05',
              textAlign: 'center',
              wordBreak: 'break-all',
              maxHeight: '8mm',
              overflow: 'hidden',
            }}
          >
            {data.barcode}
          </div>
        </div>
      </div>
    </div>
  );
});

BoxLabel.displayName = 'BoxLabel';

export default BoxLabel;
