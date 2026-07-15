/**
 * Printable packing label — same design as the Barcode Module's Box label
 * (bordered header + info-cell grid + scan panel), relabeled for packing.
 * The scannable code is the order's Flipkart Tracking ID, rendered as a 1D
 * CODE128 barcode. Reuses the barcode module's label constants for a
 * pixel-consistent look.
 */
import { type CSSProperties, forwardRef } from 'react';

import Barcode1D from '@/modules/barcode/components/Barcode1D';
import { LABEL_HEIGHT, LABEL_WIDTH, MONO_LABEL_TYPE_STYLES } from '@/modules/barcode/components/labelPrint';

import type { MarketplacePackBarcode } from '../types/marketplace.types';

const EMPTY_VALUE = '-';
const LABEL_BORDER = '0.25mm solid #111';
const OUTER_BORDER = '0.35mm solid #000';
const TEXT_WEIGHT = 600;
const EMPHASIS_WEIGHT = 700;
const HEADER_WEIGHT = 800;
const MARKS = MONO_LABEL_TYPE_STYLES.BOX;

const compact = (v?: string | number | null) =>
  v === null || v === undefined || v === '' ? EMPTY_VALUE : String(v).trim() || EMPTY_VALUE;

const num = (v?: string | number | null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : compact(v);
};

const itemNameFontSize = (name: string) =>
  name.length > 74 ? '9px' : name.length > 54 ? '10px' : name.length > 34 ? '10.8px' : '11.8px';

const itemNameStyle = (name: string): CSSProperties => ({
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  wordBreak: 'break-word',
  fontSize: itemNameFontSize(name),
  fontWeight: EMPHASIS_WEIGHT,
  lineHeight: 1.08,
  textTransform: 'uppercase',
});

function InfoCell({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
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
      <span style={{ flex: '0 0 auto', fontSize: '7px', fontWeight: TEXT_WEIGHT, lineHeight: 1, color: '#111' }}>
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
          color: '#000',
          textTransform: 'uppercase',
        }}
      >
        {value || EMPTY_VALUE}
      </div>
    </div>
  );
}

function PackIcon({ color = '#fff' }: { color?: string }) {
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
      <span style={{ position: 'absolute', left: '1.9mm', top: 0, bottom: 0, width: '0.35mm', background: color }} />
      <span style={{ position: 'absolute', left: 0, right: 0, top: '1.9mm', height: '0.35mm', background: color }} />
    </span>
  );
}

interface PackLabelProps {
  bc: MarketplacePackBarcode;
  orderId: string;
}

export const PackLabel = forwardRef<HTMLDivElement, PackLabelProps>(({ bc, orderId }, ref) => {
  const itemName = compact(bc.item_name || bc.item_code);
  const fields = [
    { label: 'Order', value: compact(orderId) },
    { label: 'Qty', value: `${num(bc.quantity)} ${bc.uom}`.trim(), strong: true },
    { label: 'SKU', value: compact(bc.source_sku) },
    { label: 'Item', value: compact(bc.item_code) },
    { label: 'UOM', value: compact(bc.uom) },
    { label: 'Type', value: 'FG' },
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
        border: MARKS.outerBorder,
      }}
    >
      {/* Left: header + identity + item name + info grid */}
      <div style={{ display: 'grid', gridTemplateRows: '6mm 6.2mm 10.2mm 1fr', minWidth: 0, height: '100%', overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            alignItems: 'center',
            backgroundColor: MARKS.headerBackground,
            color: MARKS.headerColor,
            padding: '0 1.2mm',
            borderBottom: MARKS.headerBorderBottom,
          }}
        >
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: '1mm', fontSize: '13px', fontWeight: HEADER_WEIGHT }}>
            <PackIcon color={MARKS.headerColor} />
            <span>PACK</span>
            <span
              style={{
                marginLeft: 'auto',
                border: `0.3mm solid ${MARKS.headerColor}`,
                padding: '0.3mm 1mm',
                fontSize: '6.4px',
                fontWeight: HEADER_WEIGHT,
              }}
            >
              ITEM
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 17mm', alignItems: 'center', minWidth: 0, borderBottom: LABEL_BORDER, borderLeft: MARKS.identityAccentBorder }}>
          <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 1mm', fontSize: '8px', fontWeight: HEADER_WEIGHT }}>
            Tracking ID: {compact(bc.barcode)}
          </div>
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: LABEL_BORDER, fontSize: '8px', fontWeight: HEADER_WEIGHT }}>
            ITEM
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, borderBottom: LABEL_BORDER, padding: '0.8mm 1mm', overflow: 'hidden' }}>
          <div style={itemNameStyle(itemName)}>{itemName}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: '1fr', minWidth: 0, overflow: 'hidden' }}>
          {fields.map((f) => (
            <InfoCell key={f.label} label={f.label} value={f.value} strong={f.strong} />
          ))}
        </div>
      </div>

      {/* Right: 1D barcode + caption */}
      <div style={{ minWidth: 0, display: 'grid', gridTemplateRows: '30mm 1fr', borderLeft: OUTER_BORDER, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: '0.9mm', borderTop: MARKS.scanTopBorder }}>
          <Barcode1D
            value={compact(bc.barcode)}
            displayValue={false}
            fit
            style={{ width: '32mm', height: '26mm', display: 'block' }}
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
            backgroundColor: MARKS.scanBackground,
          }}
        >
          <div style={{ fontSize: '5.4px', fontWeight: HEADER_WEIGHT, lineHeight: 1, color: MARKS.scanTextColor }}>
            Scan Tracking ID
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
              color: MARKS.scanTextColor,
            }}
          >
            Tracking ID: {compact(bc.barcode)}
          </div>
        </div>
      </div>
    </div>
  );
});

PackLabel.displayName = 'PackLabel';
