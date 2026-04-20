import { QRCodeSVG } from 'qrcode.react';
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

const PalletLabel = forwardRef<HTMLDivElement, PalletLabelProps>(({ data }, ref) => {
  return (
    <div
      ref={ref}
      className="w-[6in] h-[4in] border-2 border-black p-4 bg-white font-sans text-black"
      style={{ pageBreakAfter: 'always' }}
    >
      {/* Header Banner */}
      <div className="text-center bg-black text-white py-1 mb-3">
        <p className="text-sm font-bold tracking-widest uppercase">Pallet</p>
      </div>

      {/* Company */}
      <p className="text-[10px] text-center text-gray-500 uppercase tracking-wider mb-2">
        Jivo Wellness
      </p>

      {/* Item Info */}
      <p className="text-base font-bold leading-tight truncate">{data.item_name}</p>
      <div className="grid grid-cols-2 gap-x-4 mt-2 text-[10px]">
        <p><span className="text-gray-500">Item:</span> {data.item_code}</p>
        <p><span className="text-gray-500">Batch:</span> {data.batch_number}</p>
        <p><span className="text-gray-500">Boxes:</span> <span className="font-bold">{data.box_count}</span></p>
        <p><span className="text-gray-500">Total:</span> <span className="font-bold">{data.total_qty} {data.uom}</span></p>
        <p><span className="text-gray-500">MFG:</span> {data.mfg_date}</p>
        <p><span className="text-gray-500">EXP:</span> {data.exp_date}</p>
      </div>

      {/* QR + Pallet ID row */}
      <div className="flex items-end justify-between mt-4 pt-3 border-t border-gray-300">
        <QRCodeSVG value={data.qr_payload} size={100} level="M" />
        <div className="text-right">
          <p className="text-[9px] text-gray-500 uppercase">Pallet ID</p>
          <p className="text-lg font-mono font-bold">{data.barcode}</p>
          {data.production_line && (
            <p className="text-[9px] text-gray-500">Line: {data.production_line}</p>
          )}
          <p className="text-[9px] text-gray-500">WH: {data.warehouse}</p>
        </div>
      </div>
    </div>
  );
});

PalletLabel.displayName = 'PalletLabel';

export default PalletLabel;
