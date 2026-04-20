import { QRCodeSVG } from 'qrcode.react';
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
}

interface BoxLabelProps {
  data: BoxLabelData;
}

const BoxLabel = forwardRef<HTMLDivElement, BoxLabelProps>(({ data }, ref) => {
  return (
    <div
      ref={ref}
      className="w-[4in] h-[3in] border border-gray-300 p-3 bg-white font-sans text-black"
      style={{ pageBreakAfter: 'always' }}
    >
      {/* Header */}
      <div className="text-center border-b border-gray-400 pb-1 mb-2">
        <p className="text-[10px] font-bold tracking-wider uppercase">Jivo Wellness</p>
      </div>

      {/* Item Info */}
      <p className="text-[11px] font-bold leading-tight truncate">{data.item_name}</p>
      <p className="text-[9px] text-gray-600 mt-0.5">Item: {data.item_code}</p>
      <p className="text-[9px] text-gray-600">Batch: {data.batch_number}</p>
      <p className="text-[9px] text-gray-600">
        Qty: {data.qty} {data.uom}
      </p>

      {/* Dates */}
      <div className="flex justify-between mt-1 text-[8px] text-gray-500">
        <span>MFG: {data.mfg_date}</span>
        <span>EXP: {data.exp_date}</span>
      </div>

      {/* QR + Box ID row */}
      <div className="flex items-end justify-between mt-2">
        <QRCodeSVG value={data.qr_payload} size={72} level="M" />
        <div className="text-right">
          <p className="text-[8px] text-gray-500">Box</p>
          <p className="text-[10px] font-mono font-bold">{data.barcode}</p>
          {data.production_line && (
            <p className="text-[8px] text-gray-500">Line: {data.production_line}</p>
          )}
        </div>
      </div>
    </div>
  );
});

BoxLabel.displayName = 'BoxLabel';

export default BoxLabel;
