import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from 'react';

interface Barcode1DProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
}

export default function Barcode1D({
  value,
  width = 1.5,
  height = 40,
  fontSize = 8,
  displayValue = true,
}: Barcode1DProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin: 0,
        });
      } catch {
        // Invalid barcode value — render nothing
      }
    }
  }, [value, width, height, fontSize, displayValue]);

  return <svg ref={svgRef} />;
}
