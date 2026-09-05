import type { ControlledDocumentMeta } from '@/config/constants';
import { ControlledDocumentFrame } from '@/shared/components';

import type { QCRecord } from '../../types/qcRecord.types';
import { cellKey, toHHMM } from '../../utils/recordGrid';

/** ISO (YYYY-MM-DD) to the DD-MM-YYYY the printed forms use. */
function toDDMMYYYY(iso: string | null): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return year && month && day ? `${day}-${month}-${year}` : iso;
}

/**
 * The document identity is taken from the record's own form, not a hardcoded
 * constant: forms are data here, so a new form prints its own code and
 * revision without a code change.
 */
function recordDocumentMeta(record: QCRecord): ControlledDocumentMeta {
  const template = record.template_detail;
  return {
    name: template.title,
    code: template.document_code,
    revision: template.revision_number || '00',
    issueDate: toDDMMYYYY(template.revision_date),
    classification: template.classification || undefined,
  };
}

export function QCRecordPrintStyles() {
  return (
    <style>
      {`
        @media screen { .qc-record-print { display: none; } }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
          body.qc-record-printing #root { display: none !important; }
          body.qc-record-printing > *:not(.qc-record-print) { display: none !important; }
          .qc-record-print {
            display: block !important; position: static !important; width: 100%;
            background: #fff !important; color: #111827 !important;
            font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 1.35;
          }
          .qcr-meta { display: flex; gap: 18px; margin: 6px 0; font-size: 10px; }
          .qcr-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          .qcr-table th, .qcr-table td {
            border: 1px solid #111827; padding: 2px 4px; vertical-align: middle;
          }
          .qcr-table th { font-weight: 700; text-align: left; }
          .qcr-section td {
            font-weight: 700; text-align: left; border-top: 2px solid #111827;
          }
          .qcr-val { text-align: center; }
          /* Bordered, not filled, so it survives "background graphics off". */
          .qcr-out { font-weight: 700; border: 2px solid #b91c1c !important; }
          .qcr-sign { display: flex; justify-content: space-between; margin-top: 22px; font-size: 10px; }
          .qcr-sign > div { border-top: 1px solid #111827; padding-top: 3px; width: 30%; text-align: center; }
          tr, .qcr-section { break-inside: avoid; }
        }
      `}
    </style>
  );
}

/**
 * The filled sheet, laid out as the paper form: parameters down the left with
 * frequency and specification, one column per observation time.
 *
 * Out-of-spec cells are outlined and suffixed, never colour-filled only —
 * a printout has to survive being photocopied in black and white.
 */
export function QCRecordPrintView({ record }: { record: QCRecord }) {
  const template = record.template_detail;
  const slots = record.time_slots;

  const stored = new Map<string, { value: string; inSpec: boolean | null }>();
  const slotTimeById = new Map(slots.map((slot) => [slot.id, slot.slot_time]));
  record.values.forEach((value) => {
    const slotTime = slotTimeById.get(value.time_slot);
    if (slotTime) {
      stored.set(cellKey(slotTime, value.parameter), {
        value: value.value,
        inSpec: value.in_spec,
      });
    }
  });

  return (
    <div className="qc-record-print">
      <ControlledDocumentFrame doc={recordDocumentMeta(record)}>
        <div className="qcr-meta">
          <span>
            <strong>Date:</strong> {record.record_date}
          </span>
          {record.shift && (
            <span>
              <strong>Shift:</strong> {record.shift}
            </span>
          )}
          <span>
            <strong>Status:</strong> {record.status_label}
          </span>
        </div>

        <table className="qcr-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>Sr.No.</th>
              <th style={{ width: '16%' }}>Parameter</th>
              <th style={{ width: '18%' }}>Frequency</th>
              <th style={{ width: '20%' }}>Specification</th>
              {slots.map((slot) => (
                <th key={slot.id} className="qcr-val">
                  {toHHMM(slot.slot_time)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {template.sections.map((section) => [
              <tr key={`s-${section.id}`} className="qcr-section">
                <td colSpan={4 + slots.length}>{section.title}</td>
              </tr>,
              ...section.parameters.map((parameter) => (
                <tr key={`p-${parameter.id}`}>
                  <td>{parameter.sr_no}</td>
                  <td>
                    {parameter.name}
                    {parameter.unit ? ` (${parameter.unit})` : ''}
                  </td>
                  <td>{parameter.frequency}</td>
                  <td>{parameter.specification}</td>
                  {slots.map((slot) => {
                    const cell = stored.get(cellKey(slot.slot_time, parameter.id));
                    const out = cell?.inSpec === false;
                    return (
                      <td key={slot.id} className={out ? 'qcr-val qcr-out' : 'qcr-val'}>
                        {cell?.value || '—'}
                        {out ? ' ✗' : ''}
                      </td>
                    );
                  })}
                </tr>
              )),
            ])}
          </tbody>
        </table>

        {record.remarks && (
          <p style={{ marginTop: 8 }}>
            <strong>Remarks:</strong> {record.remarks}
          </p>
        )}

        <div className="qcr-sign">
          <div>Recorded by{record.submitted_by_name ? `: ${record.submitted_by_name}` : ''}</div>
          <div>Verified by</div>
          <div>Approved by{record.approved_by_name ? `: ${record.approved_by_name}` : ''}</div>
        </div>
      </ControlledDocumentFrame>
    </div>
  );
}
