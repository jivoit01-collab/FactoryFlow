import type { CSSProperties } from 'react';

import { DEFAULT_CLASSIFICATION, ORGANIZATION_NAME } from '@/config/constants';

import SheetView from '../../components/sheet/SheetView';
import type { QCRecord } from '../../types/qcRecord.types';
import { buildSheetGrid, printScale, signature, toDDMMYYYY } from '../../utils/sheetLayout';

const HEADER_FOOTER: CSSProperties = {
  fontFamily: '"Times New Roman", Times, serif',
  fontWeight: 700,
  color: '#000',
};

/**
 * A filled sheet-form record, printed as the controlled document: the sheet
 * filling one A4 page in its own orientation, under the organisation name,
 * over the revision / classification / document-code footer.
 *
 * The footer is written from the form's own fields rather than copied from
 * the workbook, so a revision corrected in the designer prints correctly.
 */
export default function SheetRecordPrintView({ record }: { record: QCRecord }) {
  const template = record.template_detail;
  const layout = template.layout;
  if (!layout) return null;

  const grid = buildSheetGrid(layout, template.cell_fields);
  const orientation = layout.orientation;
  const scale = printScale(grid, orientation);
  const revision = [template.revision_number || '00', toDDMMYYYY(template.revision_date)]
    .filter(Boolean)
    .join('/');

  return (
    <div className="qc-record-print">
      <style>{`@media print { @page { size: A4 ${orientation}; margin: 8mm; } }`}</style>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        {/* thead/tfoot repeat on every printed page. */}
        <thead>
          <tr>
            <td style={{ ...HEADER_FOOTER, textAlign: 'center', fontSize: 13, paddingBottom: 6 }}>
              {template.organisation || ORGANIZATION_NAME}
            </td>
          </tr>
        </thead>
        <tfoot>
          <tr>
            <td style={{ paddingTop: 6 }}>
              <div
                style={{
                  ...HEADER_FOOTER,
                  fontSize: 9,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span>Revision No.:{revision}</span>
                <span>Classified : {template.classification || DEFAULT_CLASSIFICATION}</span>
                <span style={{ textAlign: 'right' }}>
                  {template.document_code}
                  <br />
                  Controlled Document
                </span>
              </div>
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td style={{ padding: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <SheetView
                  layout={layout}
                  grid={grid}
                  fields={template.cell_fields}
                  mode="print"
                  scale={scale.x}
                  scaleY={scale.y}
                  values={record.cell_values}
                  checks={record.cell_checks}
                  bound={{
                    recordDate: record.record_date,
                    shift: record.shift,
                    remarks: record.remarks,
                    submittedBy: signature(record.submitted_by_name, record.submitted_at),
                    approvedBy:
                      record.status === 'APPROVED'
                        ? signature(record.approved_by_name, record.approved_at)
                        : '',
                  }}
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
