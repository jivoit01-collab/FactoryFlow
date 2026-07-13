import { QRCodeSVG } from 'qrcode.react';
import { type CSSProperties, forwardRef } from 'react';

import { LABEL_HEIGHT, LABEL_WIDTH, MONO_LABEL_TYPE_STYLES } from './labelPrint';

export interface BoxLabelData {
  type: string;
  id: number;
  barcode: string;
  qr_payload: string;
  pallet_id?: string;
  box_number?: number | null;
  box_count?: number | null;
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

const EMPTY_VALUE = '-';
const LABEL_BORDER = '0.25mm solid #111';
const OUTER_BORDER = '0.35mm solid #000';
const TEXT_WEIGHT = 600;
const EMPHASIS_WEIGHT = 700;
const HEADER_WEIGHT = 800;
const BOX_MARKS = MONO_LABEL_TYPE_STYLES.BOX;

const formatDate = (dateStr: string) => {
  if (!dateStr) return EMPTY_VALUE;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
};

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

interface LabelField {
  label: string;
  value: string;
  strong?: boolean;
}

function InfoCell({ label, value, strong = false }: LabelField) {
  return (
    <div
      style={{
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '0.8mm',
        borderRight: LABEL_BORDER,
        borderBottom: LABEL_BORDER,
        padding: '0.55mm 0.9mm',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          flex: '0 0 auto',
          fontSize: '7px',
          fontWeight: TEXT_WEIGHT,
          lineHeight: 1,
          letterSpacing: 0,
          color: '#111',
        }}
      >
        {label}:
      </span>
      <div
        style={{
          minWidth: 0,
          flex: '1 1 auto',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: strong ? '8.2px' : '7.4px',
          fontWeight: strong ? EMPHASIS_WEIGHT : TEXT_WEIGHT,
          lineHeight: 1,
          letterSpacing: 0,
          color: '#000',
          textTransform: 'uppercase',
        }}
      >
        {value || EMPTY_VALUE}
      </div>
    </div>
  );
}

function BoxIcon({ color = '#fff' }: { color?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: '4.8mm',
        height: '4.8mm',
        border: `0.45mm solid ${color}`,
        display: 'inline-block',
        position: 'relative',
        flex: '0 0 auto',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: '1.9mm',
          top: 0,
          bottom: 0,
          width: '0.35mm',
          background: color,
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '1.9mm',
          height: '0.35mm',
          background: color,
        }}
      />
    </span>
  );
}

const BoxLabel = forwardRef<HTMLDivElement, BoxLabelProps>(({ data }, ref) => {
  const qrValue = data.qr_payload || data.barcode;
  const itemCode = data.item_code ? String(data.item_code).trim() : '';
  const itemName = compactText(
    [itemCode ? `(${itemCode})` : '', data.item_name ? String(data.item_name).trim() : '']
      .filter(Boolean)
      .join(' '),
  );
  const boxSequence =
    data.box_number && data.box_count ? `${data.box_number}/${data.box_count}` : 'ITEM';
  const boxCount = data.box_count ? compactText(data.box_count) : compactText(data.box_number);
  const fields: LabelField[] = [
    { label: 'Batch', value: compactText(data.batch_number) },
    { label: 'Total Qty', value: joinValue(formatNumber(data.qty), data.uom), strong: true },
    { label: 'Boxes', value: boxCount },
    { label: 'MFG', value: formatDate(data.mfg_date) },
    { label: 'Warehouse', value: compactText(data.warehouse) },
    { label: 'EXP', value: formatDate(data.exp_date) },
  ];

  return (
    <div
      ref={ref}
      className="barcode-label bg-white text-black"
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
        gridTemplateColumns: '66mm 34mm',
        alignItems: 'stretch',
        border: BOX_MARKS.outerBorder,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateRows: '6mm 6.2mm 10.2mm 1fr',
          minWidth: 0,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            alignItems: 'center',
            backgroundColor: BOX_MARKS.headerBackground,
            color: BOX_MARKS.headerColor,
            minWidth: 0,
            padding: '0 1.2mm',
            borderBottom: BOX_MARKS.headerBorderBottom,
          }}
        >
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '1mm',
              justifyContent: 'flex-start',
              fontSize: '13px',
              fontWeight: HEADER_WEIGHT,
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            <BoxIcon color={BOX_MARKS.headerColor} />
            <span>BOX</span>
            <span
              style={{
                marginLeft: 'auto',
                border: `0.3mm solid ${BOX_MARKS.headerColor}`,
                padding: '0.3mm 1mm',
                fontSize: '6.4px',
                fontWeight: HEADER_WEIGHT,
                lineHeight: 1,
                letterSpacing: 0,
              }}
            >
              ITEM
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 17mm',
            alignItems: 'center',
            minWidth: 0,
            borderBottom: LABEL_BORDER,
            borderLeft: BOX_MARKS.identityAccentBorder,
          }}
        >
          <div
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 1mm',
              fontSize: '8px',
              fontWeight: HEADER_WEIGHT,
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            Box Code: {compactText(data.barcode)}
          </div>
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: LABEL_BORDER,
              fontSize: '8px',
              fontWeight: HEADER_WEIGHT,
              lineHeight: 1,
            }}
          >
            BOX {boxSequence}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            borderBottom: LABEL_BORDER,
            padding: '0.8mm 1mm',
            overflow: 'hidden',
          }}
        >
          <div style={itemNameStyle(itemName)}>{itemName}</div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridAutoRows: '1fr',
            borderTop: 0,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {fields.map((field) => (
            <InfoCell key={field.label} {...field} />
          ))}
        </div>
      </div>

      <div
        style={{
          minWidth: 0,
          display: 'grid',
          gridTemplateRows: '30mm 1fr',
          borderLeft: OUTER_BORDER,
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
            borderTop: BOX_MARKS.scanTopBorder,
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
            backgroundColor: BOX_MARKS.scanBackground,
          }}
        >
          <div
            style={{
              fontSize: '5.4px',
              fontWeight: HEADER_WEIGHT,
              lineHeight: 1,
              color: BOX_MARKS.scanTextColor,
            }}
          >
            Scan Box Barcode
          </div>
          <div
            style={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'Consolas, monospace',
              fontSize: '6.4px',
              fontWeight: EMPHASIS_WEIGHT,
              lineHeight: 1,
              letterSpacing: 0,
              color: BOX_MARKS.scanTextColor,
            }}
          >
            Box Code: {compactText(data.barcode)}
          </div>
        </div>
      </div>
    </div>
  );
});

BoxLabel.displayName = 'BoxLabel';

export default BoxLabel;
