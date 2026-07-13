import { QRCodeSVG } from 'qrcode.react';
import { type CSSProperties, forwardRef } from 'react';

import { LABEL_HEIGHT, LABEL_WIDTH, MONO_LABEL_TYPE_STYLES } from './labelPrint';

export interface PalletLabelData {
  type: string;
  id: number;
  barcode: string;
  qr_payload: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  box_count: number;
  max_box_count?: number;
  total_qty: string;
  uom: string;
  mfg_date: string;
  exp_date: string;
  production_line: string;
  warehouse: string;
  g_weight?: string;
  n_weight?: string;
}

interface PalletLabelProps {
  data: PalletLabelData;
}

const EMPTY_VALUE = '-';
const LABEL_BORDER = '0.25mm solid #111';
const OUTER_BORDER = '0.35mm solid #000';
const EMPHASIS_WEIGHT = 700;
const HEADER_WEIGHT = 800;
const PALLET_MARKS = MONO_LABEL_TYPE_STYLES.PALLET;

const formatNumber = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return numericValue.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: numericValue % 1 === 0 ? 0 : 2,
  });
};

const compactText = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  return String(value).trim() || EMPTY_VALUE;
};

const joinValue = (...parts: Array<string | number | null | undefined>) =>
  parts
    .map((part) => compactText(part))
    .filter((part) => part !== EMPTY_VALUE)
    .join(' ') || EMPTY_VALUE;

const getItemNameFontSize = (name: string) => {
  if (name.length > 74) return '9px';
  if (name.length > 54) return '10px';
  if (name.length > 34) return '10.8px';
  return '11.8px';
};

const itemNameStyle = (name: string): CSSProperties => ({
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  wordBreak: 'break-word',
  fontSize: getItemNameFontSize(name),
  fontWeight: EMPHASIS_WEIGHT,
  lineHeight: 1.08,
  letterSpacing: 0,
  textTransform: 'uppercase',
});

function PalletIcon() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: '6.4mm',
        height: '4.8mm',
        position: 'relative',
        display: 'inline-block',
        flex: '0 0 auto',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '0.2mm',
          height: '1mm',
          background: '#fff',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '1.9mm',
          height: '1mm',
          background: '#fff',
        }}
      />
      {[0.2, 2.65, 5.1].map((left) => (
        <span
          key={left}
          style={{
            position: 'absolute',
            left: `${left}mm`,
            bottom: '0.2mm',
            width: '0.9mm',
            height: '1.4mm',
            background: '#fff',
          }}
        />
      ))}
    </span>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns: '20mm 3mm 1fr',
        alignItems: 'center',
        borderBottom: LABEL_BORDER,
        padding: '0 1.2mm',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontSize: '9px',
          fontWeight: HEADER_WEIGHT,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '9px',
          fontWeight: HEADER_WEIGHT,
          textAlign: 'center',
        }}
      >
        :
      </span>
      <span
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'left',
          fontSize: strong ? '10.8px' : '9.6px',
          fontWeight: strong ? HEADER_WEIGHT : EMPHASIS_WEIGHT,
          textTransform: 'uppercase',
        }}
      >
        {value || EMPTY_VALUE}
      </span>
    </div>
  );
}

const PalletLabel = forwardRef<HTMLDivElement, PalletLabelProps>(({ data }, ref) => {
  const qrValue = data.qr_payload || data.barcode;
  const itemCode = data.item_code ? String(data.item_code).trim() : '';
  const itemName = compactText(
    [itemCode ? `(${itemCode})` : '', data.item_name ? String(data.item_name).trim() : '']
      .filter(Boolean)
      .join(' '),
  );
  const boxCount = compactText(data.box_count);
  const totalQty = joinValue(formatNumber(data.total_qty), data.uom);

  return (
    <div
      ref={ref}
      className="barcode-label bg-white text-black font-sans"
      style={{
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        padding: 0,
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        color: '#000',
        overflow: 'hidden',
        fontFamily: 'Arial, Helvetica, sans-serif',
        lineHeight: 1,
        display: 'grid',
        gridTemplateColumns: '34mm 66mm',
        alignItems: 'stretch',
        border: PALLET_MARKS.outerBorder,
      }}
    >
      <div
        style={{
          minWidth: 0,
          display: 'grid',
          gridTemplateRows: '30mm 1fr',
          borderRight: OUTER_BORDER,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            padding: '0.9mm',
            borderTop: PALLET_MARKS.scanTopBorder,
          }}
        >
          <QRCodeSVG
            value={qrValue}
            size={148}
            level="H"
            includeMargin={false}
            style={{ width: '28mm', height: '28mm', display: 'block' }}
          />
        </div>
        <div
          style={{
            minWidth: 0,
            borderTop: OUTER_BORDER,
            padding: '0.55mm 0.8mm',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35mm',
            textAlign: 'center',
            overflow: 'hidden',
            backgroundColor: PALLET_MARKS.scanBackground,
          }}
        >
          <div
            style={{
              fontSize: '6.2px',
              fontWeight: HEADER_WEIGHT,
              lineHeight: 1,
              color: PALLET_MARKS.scanTextColor,
            }}
          >
            SCAN PALLET
          </div>
          <div
            style={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'Consolas, monospace',
              fontSize: '6.3px',
              fontWeight: EMPHASIS_WEIGHT,
              lineHeight: 1,
              letterSpacing: 0,
              color: PALLET_MARKS.scanTextColor,
            }}
          >
            {compactText(data.barcode)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: '6mm 11mm 1fr',
          minWidth: 0,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1mm',
            backgroundColor: PALLET_MARKS.headerBackground,
            color: PALLET_MARKS.headerColor,
            minWidth: 0,
            padding: '0 1.2mm',
            fontSize: '13px',
            fontWeight: HEADER_WEIGHT,
            lineHeight: 1,
            letterSpacing: 0,
            borderBottom: PALLET_MARKS.headerBorderBottom,
          }}
        >
          <PalletIcon />
          <span>PALLET</span>
          <span
            style={{
              marginLeft: 'auto',
              border: `0.3mm solid ${PALLET_MARKS.headerColor}`,
              padding: '0.3mm 1mm',
              fontSize: '6.4px',
              fontWeight: HEADER_WEIGHT,
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            MASTER
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            borderBottom: OUTER_BORDER,
            borderLeft: PALLET_MARKS.identityAccentBorder,
            padding: '0.8mm 1mm',
            overflow: 'hidden',
          }}
        >
          <div style={itemNameStyle(itemName)}>{itemName}</div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'repeat(5, 1fr)',
            overflow: 'hidden',
          }}
        >
          <DetailRow label="Pallet" value={compactText(data.barcode)} strong />
          <DetailRow label="Batch" value={compactText(data.batch_number)} />
          <DetailRow label="Boxes" value={boxCount} strong />
          <DetailRow label="Total Qty" value={totalQty} strong />
          <DetailRow label="Warehouse" value={compactText(data.warehouse)} />
        </div>
      </div>
    </div>
  );
});

PalletLabel.displayName = 'PalletLabel';

export default PalletLabel;
