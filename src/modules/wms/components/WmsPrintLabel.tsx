/**
 * 100x40mm QR label for the TSC DA310 thermal printer.
 *
 * Reuses the barcode module's page geometry / print classes so the WMS
 * location & pallet labels print on the same machine and stock as the
 * production labels. QR (2D) replaces the old 1D CODE128 barcode.
 */
import { QRCodeSVG } from 'qrcode.react';
import { forwardRef } from 'react';

import { LABEL_HEIGHT, LABEL_WIDTH, MONO_LABEL_TYPE_STYLES } from '@/modules/barcode/components/labelPrint';

export interface WmsLabelData {
  /** Value encoded in the QR code (location barcode / pallet license plate). */
  code: string;
  /** Large human-readable identifier shown on the label. */
  title: string;
  /** Header tag, e.g. "LOCATION" or "PALLET". */
  heading: string;
  /** Optional secondary line, e.g. location type or item name. */
  subtitle?: string;
}

interface WmsPrintLabelProps {
  data: WmsLabelData;
}

const EMPTY_VALUE = '-';
const OUTER_BORDER = '0.35mm solid #000';
const EMPHASIS_WEIGHT = 700;
const HEADER_WEIGHT = 800;
const MARKS = MONO_LABEL_TYPE_STYLES.PALLET;

const compactText = (value?: string | null) => {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  return String(value).trim() || EMPTY_VALUE;
};

const getTitleFontSize = (title: string) => {
  if (title.length > 18) return '20px';
  if (title.length > 12) return '26px';
  return '34px';
};

const WmsPrintLabel = forwardRef<HTMLDivElement, WmsPrintLabelProps>(({ data }, ref) => {
  const qrValue = data.code || data.title;
  const title = compactText(data.title);
  const subtitle = compactText(data.subtitle);

  return (
    <div
      ref={ref}
      className="barcode-label bg-white text-black font-sans"
      style={{
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        padding: 0,
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: '36mm 1fr',
        border: MARKS.outerBorder,
      }}
    >
      {/* QR column */}
      <div
        style={{
          minWidth: 0,
          display: 'grid',
          gridTemplateRows: '1fr 5mm',
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
            padding: '1mm',
          }}
        >
          <QRCodeSVG
            value={qrValue}
            size={160}
            level="M"
            marginSize={0}
            style={{ width: '30mm', height: '30mm', display: 'block' }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderTop: OUTER_BORDER,
            overflow: 'hidden',
            backgroundColor: MARKS.scanBackground,
          }}
        >
          <span
            style={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'Consolas, monospace',
              fontSize: '7px',
              fontWeight: EMPHASIS_WEIGHT,
              lineHeight: 1,
              letterSpacing: 0,
              padding: '0 1mm',
            }}
          >
            {compactText(data.code)}
          </span>
        </div>
      </div>

      {/* Info column */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: '7mm 1fr',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: MARKS.headerBackground,
            color: MARKS.headerColor,
            padding: '0 1.4mm',
            fontSize: '13px',
            fontWeight: HEADER_WEIGHT,
            lineHeight: 1,
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
            borderBottom: MARKS.headerBorderBottom,
          }}
        >
          {compactText(data.heading)}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.2mm',
            textAlign: 'center',
            padding: '1mm',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'Consolas, monospace',
              fontSize: getTitleFontSize(title),
              fontWeight: HEADER_WEIGHT,
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            {title}
          </span>
          {subtitle !== EMPTY_VALUE ? (
            <span
              style={{
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '9px',
                fontWeight: EMPHASIS_WEIGHT,
                lineHeight: 1,
                textTransform: 'uppercase',
                color: '#222',
              }}
            >
              {subtitle}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
});

WmsPrintLabel.displayName = 'WmsPrintLabel';

export default WmsPrintLabel;
