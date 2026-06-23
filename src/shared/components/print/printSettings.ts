import type { GRPOInspectionReport } from '@/modules/grpo/types';

// Which optional sections of the inspection report to include when printing.
// Inspection Information, QC Parameters and Approval Details always print.
export interface InspectionReportPrintSettings {
  printCOA: boolean;
  printCOQ: boolean;
  printQCAttachments: boolean;
}

// Whether each optional section actually has content to print. Used to disable
// (and default-off) toggles for empty categories in the print-settings dialog.
export interface InspectionReportSectionAvailability {
  hasCOA: boolean;
  hasCOQ: boolean;
  hasQCAttachments: boolean;
}

export function getInspectionReportSectionAvailability(
  report: GRPOInspectionReport,
): InspectionReportSectionAvailability {
  return {
    hasCOA: report.attachments.some((a) => a.attachment_type === 'CERTIFICATE_OF_ANALYSIS'),
    hasCOQ: report.attachments.some((a) => a.attachment_type === 'CERTIFICATE_OF_QUANTITY'),
    hasQCAttachments: (report.qc_attachments?.length ?? 0) > 0,
  };
}

// Default each toggle to ON when the section has content, OFF (and disabled in
// the dialog) when it is empty.
export function defaultPrintSettings(
  availability: InspectionReportSectionAvailability,
): InspectionReportPrintSettings {
  return {
    printCOA: availability.hasCOA,
    printCOQ: availability.hasCOQ,
    printQCAttachments: availability.hasQCAttachments,
  };
}
