import { Printer } from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

import { Button } from '@/shared/components/ui';

import { LABEL_PRINT_PAGE_STYLE } from './labelPrint';

interface PrintableLabelProps {
  children: React.ReactNode;
  triggerLabel?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

export default function PrintableLabel({
  children,
  triggerLabel = 'Print',
  variant = 'default',
  size = 'sm',
}: PrintableLabelProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: 'Barcode Label 60x40mm',
    pageStyle: LABEL_PRINT_PAGE_STYLE,
  });

  return (
    <div>
      <Button variant={variant} size={size} onClick={() => handlePrint()}>
        <Printer className="h-4 w-4 mr-1" />
        {triggerLabel}
      </Button>

      <div aria-hidden style={{ position: 'fixed', left: '-10000px', top: 0 }}>
        <div ref={contentRef} className="barcode-print-sheet">
          {children}
        </div>
      </div>
    </div>
  );
}
