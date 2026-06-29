import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Inspection } from '../types';
import {
  InspectionReportPrintStyles,
  InspectionReportPrintView,
  type PrintSections,
} from './InspectionReportPrint';
import { PrintOptionsDialog } from './PrintOptionsDialog';

const ALL_SECTIONS: PrintSections = {
  report: true,
  coa: true,
  coq: true,
  qcAttachments: true,
};

/**
 * Drives the QC inspection-report print flow. The inspection is already loaded
 * on the detail page (no extra fetch needed): clicking print opens a small
 * options dialog to choose which sections to include, then renders just those
 * sections into a body portal, hides the on-screen app, and opens the browser
 * print dialog.
 *
 * Render `printOptionsModal` and `printPortal` once anywhere in the tree, and
 * call `openPrintOptions` from the print button.
 */
export function useInspectionReportPrint(inspection: Inspection | null | undefined) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [sections, setSections] = useState<PrintSections>(ALL_SECTIONS);
  const [isPrinting, setIsPrinting] = useState(false);

  const attachments = inspection?.attachments ?? [];
  const hasCoa = attachments.some(
    (attachment) => attachment.attachment_type === 'CERTIFICATE_OF_ANALYSIS',
  );
  const hasCoq = attachments.some(
    (attachment) => attachment.attachment_type === 'CERTIFICATE_OF_QUANTITY',
  );
  const hasQcAttachments = (inspection?.qc_attachments ?? []).length > 0;

  const openPrintOptions = useCallback(() => {
    if (!inspection) return;
    setOptionsOpen(true);
  }, [inspection]);

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

    document.body.classList.add('qc-inspection-report-printing');

    return () => {
      document.body.classList.remove('qc-inspection-report-printing');
    };
  }, [isPrinting]);

  const printOptionsModal = inspection ? (
    <PrintOptionsDialog
      open={optionsOpen}
      onOpenChange={setOptionsOpen}
      hasCoa={hasCoa}
      hasCoq={hasCoq}
      hasQcAttachments={hasQcAttachments}
      onConfirm={handleConfirm}
    />
  ) : null;

  const printPortal =
    isPrinting && inspection && typeof document !== 'undefined'
      ? createPortal(
          <>
            <InspectionReportPrintStyles />
            <InspectionReportPrintView inspection={inspection} sections={sections} />
          </>,
          document.body,
        )
      : null;

  return { openPrintOptions, printOptionsModal, printPortal };
}
