import { Printer } from 'lucide-react';

import { Button } from '@/shared/components/ui';

// Minimal shape needed to print a QC report. Both the GRPO preview item and the
// posting history line satisfy this structurally.
export interface QCReportButtonItem {
  arrival_slip_id?: number | null;
  inspection_id?: number | null;
  inspection_report_no?: string | null;
}

export function QCReportButton({
  item,
  onPrint,
  printingArrivalSlipId,
}: {
  item: QCReportButtonItem;
  onPrint: (arrivalSlipId: number) => void;
  printingArrivalSlipId: number | null;
}) {
  const arrivalSlipId = item.arrival_slip_id;
  if (!arrivalSlipId || !item.inspection_id) return null;
  const isPrinting = printingArrivalSlipId === arrivalSlipId;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs"
      disabled={isPrinting}
      title={item.inspection_report_no ? `Print ${item.inspection_report_no}` : 'Print QC Report'}
      onClick={(event) => {
        event.stopPropagation();
        onPrint(arrivalSlipId);
      }}
    >
      <Printer className="h-3.5 w-3.5" />
      {isPrinting ? 'Loading...' : 'Print Report'}
    </Button>
  );
}
