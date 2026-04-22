import Barcode1D from './Barcode1D';
import { forwardRef } from 'react';

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
  const barcodeValue = `B${data.barcode.replace(/[^A-Za-z0-9]/g, '')}`;

  // Format date as DD/MM/YY to match factory labels
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(2);
    return `${dd}/${mm}/${yy}`;
  };

  const td = { fontSize: '8px', padding: '1px 0', verticalAlign: 'top' } as const;
  const label = { ...td, fontWeight: 'bold' as const, whiteSpace: 'nowrap' as const, paddingRight: '2px' };

  return (
    <div
      ref={ref}
      className="bg-white text-black"
      style={{
        width: '2.5in',
        padding: '6px 8px',
        pageBreakAfter: 'always',
        fontFamily: 'Arial, Helvetica, sans-serif',
        lineHeight: '1.3',
      }}
    >
      {/* Header */}
      <div style={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'center', marginBottom: '2px' }}>
        JIVO WELLNESS
      </div>

      {/* Product Name */}
      <div style={{ fontWeight: 'bold', fontSize: '8px', textAlign: 'center', marginBottom: '4px' }}>
        {data.item_name.toUpperCase()}
      </div>

      {/* 2-column layout: 3 rows each */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={label}>QTY</td>
            <td style={td}>: {data.qty}</td>
            <td style={{ ...label, paddingLeft: '8px' }}>MFG DATE</td>
            <td style={td}>: {formatDate(data.mfg_date)}</td>
          </tr>
          <tr>
            <td style={label}>IT.CODE</td>
            <td style={td}>: {data.item_code}</td>
            <td style={{ ...label, paddingLeft: '8px' }}>G.WEIGHT</td>
            <td style={td}>: {data.g_weight || ''}</td>
          </tr>
          <tr>
            <td style={label}>B.NO</td>
            <td style={td}>: {data.batch_number}</td>
            <td style={{ ...label, paddingLeft: '8px' }}>N.WEIGHT</td>
            <td style={td}>: {data.n_weight || '0'}</td>
          </tr>
        </tbody>
      </table>

      {/* Barcode */}
      <div style={{ textAlign: 'center', marginTop: '6px' }}>
        <Barcode1D value={barcodeValue} width={1.5} height={40} fontSize={8} />
      </div>
    </div>
  );
});

BoxLabel.displayName = 'BoxLabel';

export default BoxLabel;
