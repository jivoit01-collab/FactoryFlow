import { Printer } from 'lucide-react';

import { CONTROLLED_DOCUMENTS } from '@/config/constants';

import { ControlledDocumentFrame } from '../ControlledDocumentPrint';
import type { PrintableInspectionReport, PrintSections } from './types';

// Print-only styles for the QC inspection report. The report markup is hidden on
// screen and only revealed by the browser print dialog (triggered by
// `useInspectionReportPrintCore`). Shared by the QC inspection detail page and
// the GRPO preview / posting-history screens so they print the same format.
export function InspectionReportPrintStyles() {
  return (
    <style>
      {`
        @media screen {
          .inspection-report-print {
            display: none;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          html,
          body {
            background: #ffffff !important;
            height: auto !important;
            overflow: visible !important;
          }

          body.inspection-report-printing #root {
            display: none !important;
          }

          /* Radix portals (the print-options dialog, toasts) mount as direct
             children of <body>, outside #root. Hide everything except the
             report so a still-closing dialog can't bleed into the printout. */
          body.inspection-report-printing > *:not(.inspection-report-print) {
            display: none !important;
          }

          .inspection-report-print {
            display: block !important;
            position: static !important;
            width: 100%;
            background: white !important;
            color: #111827 !important;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.45;
          }

          .inspection-report-page {
            break-after: auto;
          }

          .inspection-report-card {
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 14px;
            margin-top: 14px;
            break-inside: avoid;
          }

          .inspection-report-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px 18px;
          }

          .inspection-report-table {
            width: 100%;
            border-collapse: collapse;
          }

          .inspection-report-table th,
          .inspection-report-table td {
            border-bottom: 1px solid #e5e7eb;
            padding: 7px 8px;
            text-align: left;
            vertical-align: top;
          }

          .inspection-report-table th {
            background: #f9fafb !important;
            font-weight: 700;
          }
        }
      `}
    </style>
  );
}

export function InspectionReportPrintView({
  report,
  sections,
}: {
  report: PrintableInspectionReport;
  sections: PrintSections;
}) {
  const infoFields: Array<[string, string | number | null | undefined]> = [
    ['Description of Material', report.description_of_material],
    ['SAP Code', report.sap_code],
    ['Supplier Name', report.supplier_name],
    ['Unit Packing', report.unit_packing],
    ['Vehicle No.', report.vehicle_no],
    ['Commercial Invoice No.', report.invoice_bill_no],
    ['Inspection Date', formatPrintDate(report.inspection_date)],
    ['Material Type', report.material_type_name],
    ['Report No.', report.report_no],
    ['Internal Lot No.', report.internal_lot_no],
    ['Supplier Batch/Lot No.', report.supplier_batch_lot_no],
    ['Item Code', report.po_item_code],
    ['Gate Entry', report.entry_no],
  ];
  const certificateOfAnalysis = report.attachments.filter(
    (attachment) => attachment.attachment_type === 'CERTIFICATE_OF_ANALYSIS',
  );
  const certificateOfQuantity = report.attachments.filter(
    (attachment) => attachment.attachment_type === 'CERTIFICATE_OF_QUANTITY',
  );
  const qcAttachments = report.qc_attachments ?? [];

  // Approval details are merged into the Inspection Information card, so these
  // only gate content within that card (already gated by sections.report).
  const hasApproval = Boolean(
    report.qa_chemist_name || report.qam_name || report.qa_chemist_remarks || report.qam_remarks,
  );
  const hasApprovalRemarks = Boolean(report.qa_chemist_remarks || report.qam_remarks);

  return (
    <div className="inspection-report-print" aria-hidden="true">
      <div className="inspection-report-page">
        <ControlledDocumentFrame doc={CONTROLLED_DOCUMENTS.QC_INSPECTION_REPORT}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
          <span>{formatPrintDateTime(new Date().toISOString())}</span>
          <span>JI</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <Printer style={{ height: 22, width: 22 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Inspection Details</h1>
            <div style={{ display: 'flex', gap: 18, marginTop: 4, fontSize: 10 }}>
              <span>Report No: {report.report_no || '-'}</span>
              <span>{report.workflow_status || '-'}</span>
              <span>{report.effective_final_status || report.final_status || '-'}</span>
            </div>
          </div>
        </div>

        {sections.report && (
          <div className="inspection-report-card">
            <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>Inspection Information</h2>
            <div className="inspection-report-grid">
              {infoFields.map(([label, value]) => (
                <div key={label}>
                  <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>{label}</div>
                  <div>{formatPrintValue(value)}</div>
                </div>
              ))}
              {hasApproval && (
                <>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>QA Chemist</div>
                    <div>{formatPrintValue(report.qa_chemist_name)}</div>
                    <div style={{ marginTop: 4, fontSize: 10 }}>
                      {formatPrintDateTime(report.qa_chemist_approved_at)}
                    </div>
                  </div>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>QA Manager</div>
                    <div>{formatPrintValue(report.qam_name)}</div>
                    <div style={{ marginTop: 4, fontSize: 10 }}>
                      {formatPrintDateTime(report.qam_approved_at)}
                    </div>
                  </div>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>
                      Final Status
                    </div>
                    <div>
                      {formatPrintValue(report.effective_final_status || report.final_status)}
                    </div>
                  </div>
                </>
              )}
            </div>
            {report.remarks && (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>Remarks</div>
                <div>{report.remarks}</div>
              </div>
            )}
            {hasApprovalRemarks && (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>
                  Approval Remarks
                </div>
                <div>
                  {formatPrintValue(
                    [report.qa_chemist_remarks, report.qam_remarks].filter(Boolean).join(' | '),
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {sections.report && (
          <div className="inspection-report-card">
            <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>QC Parameters</h2>
            <table className="inspection-report-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Standard Value</th>
                  <th>Result</th>
                  <th>Within Spec</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {report.parameter_results.length > 0 ? (
                  report.parameter_results.map((parameter) => (
                    <tr key={parameter.id}>
                      <td>{parameter.parameter_name}</td>
                      <td>{formatPrintValue(parameter.standard_value)}</td>
                      <td>
                        {formatPrintValue(parameter.result_value || parameter.result_numeric)}
                      </td>
                      <td>
                        {parameter.is_within_spec == null
                          ? '-'
                          : parameter.is_within_spec
                            ? 'Yes'
                            : 'No'}
                      </td>
                      <td>{formatPrintValue(parameter.remarks)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No QC parameters recorded for this inspection.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {sections.coa && certificateOfAnalysis.length > 0 && (
          <InspectionReportAttachmentSection
            title="Certificate of Analysis (COA)"
            attachments={certificateOfAnalysis}
          />
        )}

        {sections.coq && certificateOfQuantity.length > 0 && (
          <InspectionReportAttachmentSection
            title="Certificate of Quantity (COQ)"
            attachments={certificateOfQuantity}
          />
        )}

        {sections.qcAttachments && qcAttachments.length > 0 && (
          <InspectionReportAttachmentSection title="QC Attachments" attachments={qcAttachments} />
        )}
        </ControlledDocumentFrame>
      </div>
    </div>
  );
}

function InspectionReportAttachmentSection({
  title,
  attachments,
}: {
  title: string;
  // Accepts both arrival-slip (COA/COQ) and QC attachments — both expose id + file.
  attachments: Array<{ id: number; file: string }>;
}) {
  return (
    <div className="inspection-report-card">
      <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {attachments.map((attachment) => (
          <div key={attachment.id} style={{ border: '1px solid #e5e7eb', padding: 8 }}>
            {isPrintableImage(attachment.file) ? (
              <img
                src={attachment.file}
                alt={title}
                style={{ display: 'block', width: '100%', maxHeight: 520, objectFit: 'contain' }}
              />
            ) : (
              <div style={{ minHeight: 80 }}>
                <div style={{ fontWeight: 700 }}>Attached file</div>
                <div style={{ marginTop: 6, wordBreak: 'break-all' }}>{attachment.file}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function isPrintableImage(file: string) {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(file);
}

function formatPrintValue(value: string | number | null | undefined) {
  if (value == null || value === '') return '-';
  return String(value);
}

function formatPrintDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN');
}

function formatPrintDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
