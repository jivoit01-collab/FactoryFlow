import JsBarcode from 'jsbarcode';
import { type CSSProperties, useEffect, useRef } from 'react';

interface Barcode1DProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  /** Stretch the barcode to fill the wrapping box (via a viewBox) instead of
   *  rendering at its intrinsic pixel size — useful inside fixed-size labels. */
  fit?: boolean;
  /** Applied to the <svg>; the reliable way to size it in print (global styles
   *  are stripped when printing labels). */
  style?: CSSProperties;
}

export default function Barcode1D({
  value,
  width = 1.5,
  height = 40,
  fontSize = 8,
  displayValue = true,
  fit = false,
  style,
}: Barcode1DProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (svg && value) {
      try {
        JsBarcode(svg, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin: 0,
        });
        if (fit) {
          // Convert the intrinsic width/height into a viewBox so CSS on the <svg>
          // can scale it to any box; without this the px dimensions are fixed.
          const w = svg.getAttribute('width');
          const h = svg.getAttribute('height');
          if (w && h) {
            svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.removeAttribute('width');
            svg.removeAttribute('height');
          }
        }
      } catch {
        // Invalid barcode value — render nothing
      }
    }
  }, [value, width, height, fontSize, displayValue, fit]);

  return <svg ref={svgRef} style={style} />;
}
