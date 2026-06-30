/**
 * One-click QR label printing for a pallet or location.
 *
 * Drops the barcode module's 100x40mm TSC DA310 print pipeline (react-to-print +
 * `LABEL_PRINT_PAGE_STYLE`) onto any WMS screen, so an operator can print a
 * single license-plate or location label right where they create/find it —
 * instead of going to the bulk Labels page. Pass one or many `WmsLabelData`.
 */
import { Printer } from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

import { LABEL_PRINT_PAGE_STYLE } from '@/modules/barcode/components/labelPrint';
import { Button } from '@/shared/components/ui';

import WmsPrintLabel, { type WmsLabelData } from './WmsPrintLabel';

interface WmsPrintLabelButtonProps {
  labels: WmsLabelData[];
  label?: string;
  documentTitle?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
  disabled?: boolean;
}

export function WmsPrintLabelButton({
  labels,
  label = 'Print label',
  documentTitle = 'WMS Label 100x40mm',
  variant = 'outline',
  size = 'sm',
  className,
  disabled,
}: WmsPrintLabelButtonProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle,
    ignoreGlobalStyles: true,
    pageStyle: LABEL_PRINT_PAGE_STYLE,
  });

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || labels.length === 0}
        onClick={() => handlePrint()}
      >
        <Printer className="mr-1 h-4 w-4" />
        {label}
      </Button>

      {/* Hidden 100x40mm print sheet — one page per label for the TSC DA310. */}
      <div aria-hidden style={{ position: 'fixed', left: '-10000px', top: 0 }}>
        <div ref={printRef} className="barcode-print-sheet">
          {labels.map((data, index) => (
            <WmsPrintLabel key={`${data.code}-${index}`} data={data} />
          ))}
        </div>
      </div>
    </>
  );
}
