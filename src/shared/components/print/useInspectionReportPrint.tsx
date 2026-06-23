import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { ApiError } from '@/core/api/types';
import { grpoApi } from '@/modules/grpo/api';
import type { GRPOInspectionReport } from '@/modules/grpo/types';

import { InspectionReportPrintStyles, InspectionReportPrintView } from './InspectionReportPrint';
import {
  defaultPrintSettings,
  getInspectionReportSectionAvailability,
  type InspectionReportPrintSettings,
  type InspectionReportSectionAvailability,
} from './printSettings';
import { PrintSettingsDialog } from './PrintSettingsDialog';

interface UseInspectionReportPrintOptions {
  // Optional hook into the host page's own error UI (e.g. the GRPO preview
  // screen routes failures into its shared `apiErrors.general` banner). When
  // omitted, callers can read `printError` from the returned value instead.
  onError?: (message: string) => void;
}

const EMPTY_AVAILABILITY: InspectionReportSectionAvailability = {
  hasCOA: false,
  hasCOQ: false,
  hasQCAttachments: false,
};

const ALL_OFF_SETTINGS: InspectionReportPrintSettings = {
  printCOA: false,
  printCOQ: false,
  printQCAttachments: false,
};

/**
 * Loads a QC inspection report for an arrival slip, lets the user pick which
 * attachment sections to include via a settings dialog, then prints it via the
 * browser print dialog. Returns the print portal (render it once anywhere in the
 * tree — it carries both the print markup and the settings modal), the print
 * trigger, and the in-flight arrival slip id for button loading state.
 */
export function useInspectionReportPrint(options?: UseInspectionReportPrintOptions) {
  const onError = options?.onError;
  const [printReport, setPrintReport] = useState<GRPOInspectionReport | null>(null);
  const [pendingReportPrint, setPendingReportPrint] = useState(false);
  const [printingArrivalSlipId, setPrintingArrivalSlipId] = useState<number | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [availability, setAvailability] =
    useState<InspectionReportSectionAvailability>(EMPTY_AVAILABILITY);
  const [settings, setSettings] = useState<InspectionReportPrintSettings>(ALL_OFF_SETTINGS);

  const printQCReport = useCallback(
    async (arrivalSlipId: number) => {
      try {
        setPrintError(null);
        setPrintingArrivalSlipId(arrivalSlipId);
        const report = await grpoApi.getInspectionReport(arrivalSlipId);
        const reportAvailability = getInspectionReportSectionAvailability(report);
        setPrintReport(report);
        setAvailability(reportAvailability);
        setSettings(defaultPrintSettings(reportAvailability));
        // Open the settings dialog; printing happens on confirm.
        setSettingsOpen(true);
      } catch (err) {
        const message =
          (err as ApiError).message || 'Could not load the QC inspection report for printing.';
        setPrintError(message);
        onError?.(message);
      } finally {
        setPrintingArrivalSlipId(null);
      }
    },
    [onError],
  );

  const confirmPrint = useCallback(() => {
    // Close the dialog first; the 100ms delay below lets it fully unmount before
    // the print dialog opens (the dialog portals as a sibling of #root, which the
    // print CSS hides — an open dialog would otherwise leak into the printout).
    setSettingsOpen(false);
    setPendingReportPrint(true);
  }, []);

  const handleSettingsOpenChange = useCallback((open: boolean) => {
    setSettingsOpen(open);
    // Closing without confirming (Cancel / Esc / overlay) aborts the print run.
    if (!open) {
      setPrintReport(null);
    }
  }, []);

  useEffect(() => {
    if (!printReport || !pendingReportPrint) return;

    const printTimer = window.setTimeout(() => {
      window.print();
      setPendingReportPrint(false);
    }, 100);

    return () => window.clearTimeout(printTimer);
  }, [pendingReportPrint, printReport]);

  useEffect(() => {
    const clearPrintReport = () => setPrintReport(null);
    window.addEventListener('afterprint', clearPrintReport);
    return () => window.removeEventListener('afterprint', clearPrintReport);
  }, []);

  useEffect(() => {
    if (!printReport || typeof document === 'undefined') return;

    document.body.classList.add('inspection-report-printing');

    return () => {
      document.body.classList.remove('inspection-report-printing');
    };
  }, [printReport]);

  const printPortal =
    printReport && typeof document !== 'undefined'
      ? createPortal(
          <>
            <InspectionReportPrintStyles />
            <InspectionReportPrintView report={printReport} settings={settings} />
            <PrintSettingsDialog
              open={settingsOpen}
              onOpenChange={handleSettingsOpenChange}
              settings={settings}
              onSettingsChange={setSettings}
              availability={availability}
              onConfirm={confirmPrint}
            />
          </>,
          document.body,
        )
      : null;

  return {
    printQCReport,
    printingArrivalSlipId,
    printPortal,
    printError,
    clearPrintError: useCallback(() => setPrintError(null), []),
  };
}
