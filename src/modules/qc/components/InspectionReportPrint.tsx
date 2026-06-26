import { Printer } from 'lucide-react';

import type { Inspection } from '../types';

// Print-only styles for the QC inspection report. The report markup is hidden on
// screen and only revealed by the browser print dialog (triggered by
// `useInspectionReportPrint`). This mirrors the GRPO inspection-report layout so
// QC and GRPO print the same format.
export function InspectionReportPrintStyles() {
  return (
    <style>
      {`
        @media screen {
          .qc-inspection-report-print {
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

          body.qc-inspection-report-printing #root {
            display: none !important;
          }

          .qc-inspection-report-print {
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

          .qc-inspection-report-page {
            break-after: auto;
          }

          .qc-inspection-report-card {
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 14px;
            margin-top: 14px;
            break-inside: avoid;
          }

          .qc-inspection-report-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px 18px;
          }

          .qc-inspection-report-table {
            width: 100%;
            border-collapse: collapse;
          }

          .qc-inspection-report-table th,
          .qc-inspection-report-table td {
            border-bottom: 1px solid #e5e7eb;
            padding: 7px 8px;
            text-align: left;
            vertical-align: top;
          }

          .qc-inspection-report-table th {
            background: #f9fafb !important;
            font-weight: 700;
          }
        }
      `}
    </style>
  );
}

export function InspectionReportPrintView({ inspection }: { inspection: Inspection }) {
  const infoFields: Array<[string, string | number | null | undefined]> = [
    ['Description of Material', inspection.description_of_material],
    ['SAP Code', inspection.sap_code],
    ['Supplier Name', inspection.supplier_name],
    ['Unit Packing', inspection.unit_packing],
    ['Vehicle No.', inspection.vehicle_no],
    ['Commercial Invoice No.', inspection.invoice_bill_no],
    ['Inspection Date', formatPrintDate(inspection.inspection_date)],
    ['Material Type', inspection.material_type_name],
    ['Report No.', inspection.report_no],
    ['Internal Lot No.', inspection.internal_lot_no],
    ['Supplier Batch/Lot No.', inspection.supplier_batch_lot_no],
    ['Item Code', inspection.po_item_code],
    ['Gate Entry', inspection.entry_no],
  ];
  const attachments = inspection.attachments ?? [];
  const certificateOfAnalysis = attachments.filter(
    (attachment) => attachment.attachment_type === 'CERTIFICATE_OF_ANALYSIS',
  );
  const certificateOfQuantity = attachments.filter(
    (attachment) => attachment.attachment_type === 'CERTIFICATE_OF_QUANTITY',
  );

  return (
    <div className="qc-inspection-report-print" aria-hidden="true">
      <div className="qc-inspection-report-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
          <span>{formatPrintDateTime(new Date().toISOString())}</span>
          <span>JI</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <Printer style={{ height: 22, width: 22 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Inspection Details</h1>
            <div style={{ display: 'flex', gap: 18, marginTop: 4, fontSize: 10 }}>
              <span>Report No: {inspection.report_no || '-'}</span>
              <span>{inspection.workflow_status || '-'}</span>
              <span>{inspection.effective_final_status || inspection.final_status || '-'}</span>
            </div>
          </div>
        </div>

        <div className="qc-inspection-report-card">
          <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>Inspection Information</h2>
          <div className="qc-inspection-report-grid">
            {infoFields.map(([label, value]) => (
              <div key={label}>
                <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>{label}</div>
                <div>{formatPrintValue(value)}</div>
              </div>
            ))}
          </div>
          {inspection.remarks && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>Remarks</div>
              <div>{inspection.remarks}</div>
            </div>
          )}
        </div>

        <div className="qc-inspection-report-card">
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>QC Parameters</h2>
          <table className="qc-inspection-report-table">
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
              {inspection.parameter_results.length > 0 ? (
                inspection.parameter_results.map((parameter) => (
                  <tr key={parameter.id}>
                    <td>{parameter.parameter_name}</td>
                    <td>{formatPrintValue(parameter.standard_value)}</td>
                    <td>{formatPrintValue(parameter.result_value || parameter.result_numeric)}</td>
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

        {certificateOfAnalysis.length > 0 && (
          <InspectionReportAttachmentSection
            title="Certificate of Analysis (COA)"
            attachments={certificateOfAnalysis}
          />
        )}

        {certificateOfQuantity.length > 0 && (
          <InspectionReportAttachmentSection
            title="Certificate of Quantity (COQ)"
            attachments={certificateOfQuantity}
          />
        )}

        {(inspection.qa_chemist_name ||
          inspection.qam_name ||
          inspection.qa_chemist_remarks ||
          inspection.qam_remarks) && (
          <div className="qc-inspection-report-card">
            <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Approval Details</h2>
            <div className="qc-inspection-report-grid">
              <div>
                <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>QA Chemist</div>
                <div>{formatPrintValue(inspection.qa_chemist_name)}</div>
                <div style={{ marginTop: 4, fontSize: 10 }}>
                  {formatPrintDateTime(inspection.qa_chemist_approved_at)}
                </div>
              </div>
              <div>
                <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>QA Manager</div>
                <div>{formatPrintValue(inspection.qam_name)}</div>
                <div style={{ marginTop: 4, fontSize: 10 }}>
                  {formatPrintDateTime(inspection.qam_approved_at)}
                </div>
              </div>
              <div>
                <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>Final Status</div>
                <div>
                  {formatPrintValue(inspection.effective_final_status || inspection.final_status)}
                </div>
              </div>
            </div>
            {(inspection.qa_chemist_remarks || inspection.qam_remarks) && (
              <div style={{ marginTop: 14 }}>
                <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700 }}>Approval Remarks</div>
                <div>
                  {formatPrintValue(
                    [inspection.qa_chemist_remarks, inspection.qam_remarks]
                      .filter(Boolean)
                      .join(' | '),
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InspectionReportAttachmentSection({
  title,
  attachments,
}: {
  title: string;
  attachments: Inspection['attachments'];
}) {
  return (
    <div className="qc-inspection-report-card">
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
