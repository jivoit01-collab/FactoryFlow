// The QC inspection-report print view is shared with the QC module. This file
// re-exports it under the GRPO-specific names kept for backwards compatibility;
// the implementation lives in @/shared/components/inspection-report-print.
export {
  InspectionReportPrintStyles as GRPOInspectionReportPrintStyles,
  InspectionReportPrintView as GRPOInspectionReportPrintView,
  type PrintSections as GRPOPrintSections,
} from '@/shared/components/inspection-report-print';
