export { AttachmentsSection } from './AttachmentsSection';
export { ExtraChargesSection } from './ExtraChargesSection';
export type { QCReportButtonItem } from './QCReportButton';
export { QCReportButton } from './QCReportButton';
export { QCStatusBadge } from './QCStatusBadge';
export { WarehouseSelect } from './WarehouseSelect';
// Inspection-report printing now lives in the shared print module so the QC
// inspection page and the GRPO screens render the exact same report. Re-exported
// here (with the legacy `useQCReportPrint` alias) so existing GRPO pages keep
// working unchanged.
export {
  InspectionReportPrintStyles,
  InspectionReportPrintView,
  useInspectionReportPrint,
  useInspectionReportPrint as useQCReportPrint,
} from '@/shared/components/print';
