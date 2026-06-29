import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { ApiError } from '@/core/api/types';

import { grpoApi } from '../api';
import type { GRPOInspectionReport } from '../types';
import {
  GRPOInspectionReportPrintStyles,
  GRPOInspectionReportPrintView,
} from './QCInspectionReportPrint';

interface UseQCReportPrintOptions {
  // Optional hook into the host page's own error UI (e.g. the preview screen
  // routes failures into its shared `apiErrors.general` banner). When omitted,
  // callers can read `printError` from the returned value instead.
  onError?: (message: string) => void;
}

/**
 * Loads a QC inspection report for an arrival slip and prints it via the browser
 * print dialog. Returns the print portal (render it once anywhere in the tree),
 * the print trigger, and the in-flight arrival slip id for button loading state.
 */
export function useQCReportPrint(options?: UseQCReportPrintOptions) {
  const onError = options?.onError;
  const [printReport, setPrintReport] = useState<GRPOInspectionReport | null>(null);
  const [pendingReportPrint, setPendingReportPrint] = useState(false);
  const [printingArrivalSlipId, setPrintingArrivalSlipId] = useState<number | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  const printQCReport = useCallback(
    async (arrivalSlipId: number) => {
      try {
        setPrintError(null);
        setPrintingArrivalSlipId(arrivalSlipId);
        const report = await grpoApi.getInspectionReport(arrivalSlipId);
        setPrintReport(report);
        setPendingReportPrint(true);
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

    document.body.classList.add('grpo-inspection-report-printing');

    return () => {
      document.body.classList.remove('grpo-inspection-report-printing');
    };
  }, [printReport]);

  const printPortal =
    printReport && typeof document !== 'undefined'
      ? createPortal(
          <>
            <GRPOInspectionReportPrintStyles />
            <GRPOInspectionReportPrintView report={printReport} />
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
