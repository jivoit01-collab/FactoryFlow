import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

import { Button } from '@/shared/components/ui';

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
    documentTitle: 'Barcode Label',
  });

  return (
    <div>
      {/* Print trigger button */}
      <Button variant={variant} size={size} onClick={() => handlePrint()}>
        <Printer className="h-4 w-4 mr-1" />
        {triggerLabel}
      </Button>

      {/* Hidden printable area — only visible in print dialog */}
      <div className="hidden">
        <div ref={contentRef} className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
