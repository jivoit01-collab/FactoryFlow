import { useCallback } from 'react';

import { useInspectionReportPrintCore } from '@/shared/components/inspection-report-print';

import type { Inspection } from '../types';

/**
 * Prints a QC inspection report. The inspection is already loaded on the detail
 * page, so clicking print opens the shared options dialog for the loaded
 * inspection (no extra fetch). Render `printOptionsModal` and `printPortal` once
 * anywhere in the tree, and call `openPrintOptions` from the print button.
 */
export function useInspectionReportPrint(inspection: Inspection | null | undefined) {
  const {
    openPrintOptions: openForReport,
    printOptionsModal,
    printPortal,
  } = useInspectionReportPrintCore();

  const openPrintOptions = useCallback(() => {
    if (inspection) openForReport(inspection);
  }, [inspection, openForReport]);

  return { openPrintOptions, printOptionsModal, printPortal };
}
