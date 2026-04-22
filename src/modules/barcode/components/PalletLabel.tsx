import Barcode1D from './Barcode1D';
import { forwardRef } from 'react';

export interface PalletLabelData {
  type: string;
  id: number;
  barcode: string;
  qr_payload: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  box_count: number;
  total_qty: string;
  uom: string;
  mfg_date: string;
  exp_date: string;
  production_line: string;
  warehouse: string;
}

interface PalletLabelProps {
  data: PalletLabelData;
}

/**
 * Pallet label — larger format with Code 128 barcode.
 * Same field layout as box but with pallet-specific info.
 */
const PalletLabel = forwardRef<HTMLDivElement, PalletLabelProps>(({ data }, ref) => {
  const barcodeValue = `P${data.barcode.replace(/[^A-Za-z0-9]/g, '')}`;

  return (
    <div
      ref={ref}
      className="bg-white text-black font-sans"
      style={{
        width: '4in',
        height: '6in',
        padding: '10px 14px',
        pageBreakAfter: 'always',
        fontSize: '11px',
        lineHeight: '1.4',
      }}
    >
      {/* Header Banner */}
      <div style={{
        fontWeight: 'bold', fontSize: '14px', textAlign: 'center',
        backgroundColor: '#000', color: '#fff', padding: '4px 0', marginBottom: '6px',
        letterSpacing: '3px',
      }}>
        PALLET
      </div>

      {/* Company */}
      <div style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>
        JIVO WELLNESS
      </div>

      {/* Product Name */}
      <div style={{ fontWeight: 'bold', fontSize: '11px', textAlign: 'center', marginBottom: '10px' }}>
        {data.item_name.toUpperCase()}
      </div>

      {/* Details */}
      <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: 'bold', paddingRight: '6px', whiteSpace: 'nowrap', paddingBottom: '3px' }}>IT.CODE</td>
            <td style={{ paddingBottom: '3px' }}>: {data.item_code}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', paddingRight: '6px', whiteSpace: 'nowrap', paddingBottom: '3px' }}>B.NO</td>
            <td style={{ paddingBottom: '3px' }}>: {data.batch_number}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', paddingRight: '6px', whiteSpace: 'nowrap', paddingBottom: '3px' }}>BOXES</td>
            <td style={{ paddingBottom: '3px' }}>: {data.box_count}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', paddingRight: '6px', whiteSpace: 'nowrap', paddingBottom: '3px' }}>TOTAL QTY</td>
            <td style={{ paddingBottom: '3px' }}>: {data.total_qty} {data.uom}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', paddingRight: '6px', whiteSpace: 'nowrap', paddingBottom: '3px' }}>MFG DATE</td>
            <td style={{ paddingBottom: '3px' }}>: {data.mfg_date}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', paddingRight: '6px', whiteSpace: 'nowrap', paddingBottom: '3px' }}>EXP DATE</td>
            <td style={{ paddingBottom: '3px' }}>: {data.exp_date}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', paddingRight: '6px', whiteSpace: 'nowrap', paddingBottom: '3px' }}>WH</td>
            <td style={{ paddingBottom: '3px' }}>: {data.warehouse}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', paddingRight: '6px', whiteSpace: 'nowrap', paddingBottom: '3px' }}>PALLET ID</td>
            <td style={{ paddingBottom: '3px' }}>: {data.barcode}</td>
          </tr>
        </tbody>
      </table>

      {/* Barcode */}
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <Barcode1D value={barcodeValue} width={2} height={60} fontSize={10} />
      </div>
    </div>
  );
});

PalletLabel.displayName = 'PalletLabel';

export default PalletLabel;
