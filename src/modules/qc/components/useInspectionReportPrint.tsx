import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Inspection } from '../types';
import {
  InspectionReportPrintStyles,
  InspectionReportPrintView,
} from './InspectionReportPrint';

/**
 * Prints a QC inspection report using the same layout/format as the GRPO
 * inspection report. The inspection is already loaded on the detail page, so
 * (unlike the GRPO hook) no extra fetch is needed — clicking print renders the
 * report into a body portal, hides the on-screen app, and opens the print
 * dialog.
 *
 * Render `printPortal` once anywhere in the tree and call `printInspectionReport`
 * from the print button.
 */
export function useInspectionReportPrint(inspection: Inspection | null | undefined) {
  const [isPrinting, setIsPrinting] = useState(false);

  const printInspectionReport = useCallback(() => {
    if (!inspection) return;
    setIsPrinting(true);
  }, [inspection]);

  // Give the portal a tick to mount before opening the print dialog.
  useEffect(() => {
    if (!isPrinting) return;

    const printTimer = window.setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);

    return () => window.clearTimeout(printTimer);
  }, [isPrinting]);

  // Safety net: clear printing state if the dialog is dismissed.
  useEffect(() => {
    const stopPrinting = () => setIsPrinting(false);
    window.addEventListener('afterprint', stopPrinting);
    return () => window.removeEventListener('afterprint', stopPrinting);
  }, []);

  // Hide the on-screen app while the print markup is active.
  useEffect(() => {
    if (!isPrinting || typeof document === 'undefined') return;

    document.body.classList.add('qc-inspection-report-printing');

    return () => {
      document.body.classList.remove('qc-inspection-report-printing');
    };
  }, [isPrinting]);

  const printPortal =
    isPrinting && inspection && typeof document !== 'undefined'
      ? createPortal(
          <>
            <InspectionReportPrintStyles />
            <InspectionReportPrintView inspection={inspection} />
          </>,
          document.body,
        )
      : null;

  return { printInspectionReport, printPortal };
}
