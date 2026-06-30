import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { InspectionReportPrintStyles, InspectionReportPrintView } from './InspectionReportPrint';
import { PrintOptionsDialog } from './PrintOptionsDialog';
import type { PrintableInspectionReport, PrintSections } from './types';

const ALL_SECTIONS: PrintSections = {
  report: true,
  coa: true,
  coq: true,
  qcAttachments: true,
};

/**
 * Core print flow shared by the QC inspection detail page and the GRPO
 * preview / posting-history screens. Call `openPrintOptions(report)` with a
 * loaded report to show a dialog choosing which sections to include, then it
 * renders just those into a body portal, hides the on-screen app, and opens the
 * browser print dialog.
 *
 * Render `printOptionsModal` and `printPortal` once anywhere in the tree. The
 * caller owns how the report is obtained (already loaded vs fetched on demand).
 */
export function useInspectionReportPrintCore() {
  const [report, setReport] = useState<PrintableInspectionReport | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [sections, setSections] = useState<PrintSections>(ALL_SECTIONS);
  const [isPrinting, setIsPrinting] = useState(false);

  const openPrintOptions = useCallback((next: PrintableInspectionReport) => {
    setReport(next);
    setOptionsOpen(true);
  }, []);

  const handleConfirm = useCallback((chosen: PrintSections) => {
    setSections(chosen);
    setOptionsOpen(false);
    setIsPrinting(true);
  }, []);

  // Give the portal a tick to mount (and the options dialog a tick to unmount)
  // before opening the print dialog.
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

    document.body.classList.add('inspection-report-printing');

    return () => {
      document.body.classList.remove('inspection-report-printing');
    };
  }, [isPrinting]);

  const attachments = report?.attachments ?? [];
  const hasCoa = attachments.some(
    (attachment) => attachment.attachment_type === 'CERTIFICATE_OF_ANALYSIS',
  );
  const hasCoq = attachments.some(
    (attachment) => attachment.attachment_type === 'CERTIFICATE_OF_QUANTITY',
  );
  const supportsQcAttachments = Array.isArray(report?.qc_attachments);
  const hasQcAttachments = (report?.qc_attachments?.length ?? 0) > 0;

  const printOptionsModal = (
    <PrintOptionsDialog
      open={optionsOpen}
      onOpenChange={setOptionsOpen}
      hasCoa={hasCoa}
      hasCoq={hasCoq}
      hasQcAttachments={hasQcAttachments}
      showQcAttachments={supportsQcAttachments}
      onConfirm={handleConfirm}
    />
  );

  const printPortal =
    isPrinting && report && typeof document !== 'undefined'
      ? createPortal(
          <>
            <InspectionReportPrintStyles />
            <InspectionReportPrintView report={report} sections={sections} />
          </>,
          document.body,
        )
      : null;

  return { openPrintOptions, printOptionsModal, printPortal };
}
