/** CODE128 barcode (self-contained; used on printable labels). */
import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from 'react';

interface WmsBarcodeProps {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
}

export function WmsBarcode({ value, height = 38, width = 1.4, fontSize = 11 }: WmsBarcodeProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        height,
        width,
        fontSize,
        displayValue: true,
        margin: 0,
      });
    } catch {
      // Unencodable value — render nothing rather than throw.
    }
  }, [value, height, width, fontSize]);

  return <svg ref={ref} className="max-w-full" />;
}
