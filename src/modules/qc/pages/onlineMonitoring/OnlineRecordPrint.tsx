import { CONTROLLED_DOCUMENTS } from '@/config/constants';
import { ControlledDocumentFrame } from '@/shared/components';

import type { OnlineQualityReading,OnlineQualityRecord } from '../../types';
import { WATER_QUALITY_KEYS } from '../../types';
import { evaluateSpec, specLabel, type SpecMap } from './specValidation';

const WATER_LABELS: Record<string, string> = {
  ph: 'pH',
  tds: 'TDS',
  turbidity: 'Turbidity',
  alkalinity: 'Alkalinity',
  total_hardness: 'Total Hardness',
  calcium: 'Calcium',
  magnesium: 'Magnesium',
  chloride: 'Chloride',
};

function fmt(value: string | null | undefined) {
  return value == null || value === '' ? '—' : String(value);
}

export function OnlineRecordPrintStyles() {
  return (
    <style>
      {`
        @media screen { .online-record-print { display: none; } }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
          body.online-record-printing #root { display: none !important; }
          body.online-record-printing > *:not(.online-record-print) { display: none !important; }
          .online-record-print {
            display: block !important; position: static !important; width: 100%;
            background: #fff !important; color: #111827 !important;
            font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.4;
          }
          .orp-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px 14px; }
          .orp-reading { border: 1px solid #111827; margin-top: 8px; padding: 8px; break-inside: avoid; }
          .orp-params { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px 10px; margin-top: 6px; }
          .orp-out { color: #b91c1c; font-weight: 700; }
          .orp-torque td, .orp-torque th { border: 1px solid #9ca3af; padding: 2px 5px; text-align: center; }
        }
      `}
    </style>
  );
}

function ReadingBlock({ reading, specMap }: { reading: OnlineQualityReading; specMap: SpecMap }) {
  return (
    <div className="orp-reading">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
        <span>Reading — {fmt(reading.reading_time)}</span>
        <span style={{ fontWeight: 400 }}>Filler speed: {fmt(reading.filler_speed)}</span>
      </div>
      <div className="orp-params">
        {WATER_QUALITY_KEYS.map((key) => {
          const spec = specMap.get(key);
          const value = reading[key];
          const ok = evaluateSpec(spec, value);
          const label = specLabel(spec);
          return (
            <div key={key}>
              <div style={{ fontSize: 8, color: '#6b7280' }}>
                {WATER_LABELS[key]}
                {label ? ` (${label})` : ''}
              </div>
              <div className={ok === false ? 'orp-out' : undefined}>
                {fmt(value)}
                {ok === false ? ' ✗' : ''}
              </div>
            </div>
          );
        })}
        <div>
          <div style={{ fontSize: 8, color: '#6b7280' }}>Taste</div>
          <div>{fmt(reading.taste)}</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#6b7280' }}>Aroma</div>
          <div>{fmt(reading.aroma)}</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#6b7280' }}>Appearance</div>
          <div>{fmt(reading.appearance)}</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#6b7280' }}>Package Attr.</div>
          <div>{fmt(reading.package_attribute)}</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#6b7280' }}>Date Code</div>
          <div>{fmt(reading.date_code)}</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#6b7280' }}>Rub Test</div>
          <div>{fmt(reading.rub_test)}</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#6b7280' }}>Closure Jump</div>
          <div>{fmt(reading.closure_jump_test)}</div>
        </div>
      </div>
      {reading.torque_heads.length > 0 && (
        <table
          className="orp-torque"
          style={{ borderCollapse: 'collapse', marginTop: 6, fontSize: 9 }}
        >
          <thead>
            <tr>
              <th>Head</th>
              {reading.torque_heads.map((h) => (
                <th key={h.head_no}>{h.head_no}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 700 }}>Torque</td>
              {reading.torque_heads.map((h) => {
                const ok = evaluateSpec(specMap.get('torque'), h.torque_value);
                return (
                  <td key={h.head_no} className={ok === false ? 'orp-out' : undefined}>
                    {fmt(h.torque_value)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      )}
      {reading.remarks && <div style={{ marginTop: 4 }}>Remarks: {reading.remarks}</div>}
    </div>
  );
}

export function OnlineRecordPrintView({
  record,
  specMap,
}: {
  record: OnlineQualityRecord;
  specMap: SpecMap;
}) {
  const header: [string, string][] = [
    ['Date', fmt(record.date)],
    ['Line', fmt(record.line_name)],
    ['SKU', fmt(record.sku)],
    ['Product', fmt(record.product_name)],
    ['Flavour', fmt(record.flavour)],
    ['Shift', fmt(record.shift)],
    ['Batch No.', fmt(record.batch_no)],
    ['Status', record.status],
  ];
  return (
    <div className="online-record-print" aria-hidden="true">
      <ControlledDocumentFrame doc={CONTROLLED_DOCUMENTS.ONLINE_QUALITY_RECORD}>
        <h1 style={{ margin: '10px 0 8px', fontSize: 16, fontWeight: 700 }}>
          On Line Monitoring Quality Record
        </h1>
        <div className="orp-grid">
          {header.map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 700 }}>{label}</div>
              <div>{value}</div>
            </div>
          ))}
        </div>

        {record.readings.length === 0 ? (
          <div style={{ marginTop: 10 }}>No readings recorded.</div>
        ) : (
          record.readings.map((r) => <ReadingBlock key={r.id} reading={r} specMap={specMap} />)
        )}

        <div className="orp-grid" style={{ marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 700 }}>Recorded By</div>
            <div>{fmt(record.created_by_name)}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 700 }}>Submitted By</div>
            <div>{fmt(record.submitted_by_name)}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 700 }}>Approved By</div>
            <div>{fmt(record.approved_by_name)}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 700 }}>Approval Remarks</div>
            <div>{fmt(record.approval_remarks)}</div>
          </div>
        </div>
      </ControlledDocumentFrame>
    </div>
  );
}
