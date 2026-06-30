import { useCallback, useState } from 'react';

import type { ApiError } from '@/core/api/types';
import { useInspectionReportPrintCore } from '@/shared/components/inspection-report-print';

import { grpoApi } from '../api';

interface UseQCReportPrintOptions {
  // Optional hook into the host page's own error UI (e.g. the preview screen
  // routes failures into its shared `apiErrors.general` banner). When omitted,
  // callers can read `printError` from the returned value instead.
  onError?: (message: string) => void;
}

/**
 * Loads a QC inspection report for an arrival slip, then prints it via the
 * shared inspection-report print flow: fetching the report opens a print-options
 * dialog to choose which sections to include, and confirming sends just those to
 * the browser print dialog.
 *
 * Returns the options modal and print portal (render each once anywhere in the
 * tree), the print trigger, and the in-flight arrival slip id for button state.
 */
export function useQCReportPrint(options?: UseQCReportPrintOptions) {
  const onError = options?.onError;
  const { openPrintOptions, printOptionsModal, printPortal } = useInspectionReportPrintCore();
  const [printingArrivalSlipId, setPrintingArrivalSlipId] = useState<number | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  const printQCReport = useCallback(
    async (arrivalSlipId: number) => {
      try {
        setPrintError(null);
        setPrintingArrivalSlipId(arrivalSlipId);
        const report = await grpoApi.getInspectionReport(arrivalSlipId);
        openPrintOptions(report);
      } catch (err) {
        const message =
          (err as ApiError).message || 'Could not load the QC inspection report for printing.';
        setPrintError(message);
        onError?.(message);
      } finally {
        setPrintingArrivalSlipId(null);
      }
    },
    [onError, openPrintOptions],
  );

  return {
    printQCReport,
    printingArrivalSlipId,
    printOptionsModal,
    printPortal,
    printError,
    clearPrintError: useCallback(() => setPrintError(null), []),
  };
}
