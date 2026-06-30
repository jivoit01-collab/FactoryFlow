/** 2D QR code (self-contained; used on printable labels). */
import { QRCodeSVG } from 'qrcode.react';

interface WmsBarcodeProps {
  value: string;
  /** Rendered size of the QR code in pixels. */
  size?: number;
  /** Show the encoded value as a caption beneath the code. */
  displayValue?: boolean;
}

export function WmsBarcode({ value, size = 96, displayValue = true }: WmsBarcodeProps) {
  if (!value) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <QRCodeSVG value={value} size={size} level="M" marginSize={0} className="max-w-full" />
      {displayValue ? <span className="font-mono text-[11px] leading-none">{value}</span> : null}
    </div>
  );
}
