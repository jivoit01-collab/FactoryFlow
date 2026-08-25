/**
 * One printer for all six ETP / STP registers.
 *
 * Each register is a header block plus a table, so instead of six bespoke print
 * views the pages describe what they want — controlled document, header pairs,
 * columns, rows, signature lines — and this renders it inside the shared
 * `ControlledDocumentFrame` (organisation, form name, document code, revision,
 * classification; repeated on every printed page).
 */

import type { ControlledDocumentMeta } from '@/config/constants';
import { ControlledDocumentFrame } from '@/shared/components';

/** A table cell; `flag` prints it in red (out of spec / out of calibration). */
export type EtpPrintCell =
  | string
  | number
  | null
  | undefined
  | { text: string | number | null | undefined; flag?: boolean };

export interface EtpPrintColumn {
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface EtpPrintPayload {
  doc: ControlledDocumentMeta;
  /** Per-copy document ID printed in the footer (QC's prints carry one too). */
  documentId?: string | null;
  /** Heading printed above the table (usually the register's own name). */
  title: string;
  /** The form's header block: label / value pairs. */
  headerPairs?: [string, string][];
  /** Optional grouped header row above the columns (e.g. monitoring stages). */
  columnGroups?: { label: string; span: number }[];
  columns: EtpPrintColumn[];
  rows: EtpPrintCell[][];
  /** A totals row printed in bold under the table. */
  totalsRow?: EtpPrintCell[];
  /** Signature lines at the foot, e.g. [['Operator', 'Anurag'], …]. */
  signatures?: [string, string][];
  note?: string;
  /** Landscape suits the wide grids (monitoring, chemical consumption). */
  orientation?: 'portrait' | 'landscape';
}

function cellText(cell: EtpPrintCell): string {
  const value = cell !== null && typeof cell === 'object' ? cell.text : cell;
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function cellFlagged(cell: EtpPrintCell): boolean {
  return cell !== null && typeof cell === 'object' ? Boolean(cell.flag) : false;
}

export function EtpPrintStyles({ orientation }: { orientation: 'portrait' | 'landscape' }) {
  return (
    <style>
      {`
        @media screen { .etp-print { display: none; } }
        @media print {
          @page { size: A4 ${orientation}; margin: 10mm; }
          html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
          body.etp-printing #root { display: none !important; }
          body.etp-printing > *:not(.etp-print) { display: none !important; }
          .etp-print {
            display: block !important; position: static !important; width: 100%;
            background: #fff !important; color: #111827 !important;
            font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.35;
          }
          .etp-header-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3px 14px; margin: 8px 0; }
          .etp-header-grid .etp-label { font-size: 8px; color: #6b7280; font-weight: 700; }
          .etp-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          .etp-table th, .etp-table td { border: 1px solid #9ca3af; padding: 2px 4px; }
          .etp-table th { font-size: 9px; text-align: center; }
          .etp-table td { font-size: 9px; }
          .etp-flag { color: #b91c1c; font-weight: 700; }
          .etp-totals td { font-weight: 700; }
          .etp-signatures { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px 14px; margin-top: 18px; }
          .etp-note { margin-top: 8px; font-size: 9px; }
        }
      `}
    </style>
  );
}

export function EtpPrintView({ payload }: { payload: EtpPrintPayload }) {
  const {
    doc,
    documentId,
    title,
    headerPairs = [],
    columnGroups,
    columns,
    rows,
    totalsRow,
    signatures = [],
    note,
  } = payload;

  return (
    <div className="etp-print" aria-hidden="true">
      <ControlledDocumentFrame doc={doc} documentId={documentId}>
        <h1 style={{ margin: '10px 0 4px', fontSize: 15, fontWeight: 700 }}>{title}</h1>

        {headerPairs.length > 0 && (
          <div className="etp-header-grid">
            {headerPairs.map(([label, value]) => (
              <div key={label}>
                <div className="etp-label">{label}</div>
                <div>{value || '—'}</div>
              </div>
            ))}
          </div>
        )}

        <table className="etp-table">
          <thead>
            {columnGroups && columnGroups.length > 0 && (
              <tr>
                {columnGroups.map((group, index) => (
                  <th key={`${group.label}-${index}`} colSpan={group.span}>
                    {group.label}
                  </th>
                ))}
              </tr>
            )}
            <tr>
              {columns.map((column, index) => (
                <th key={`${column.label}-${index}`}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center' }}>
                  No entries in this period.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={cellFlagged(cell) ? 'etp-flag' : undefined}
                      style={{ textAlign: columns[cellIndex]?.align ?? 'left' }}
                    >
                      {cellText(cell)}
                    </td>
                  ))}
                </tr>
              ))
            )}
            {totalsRow && (
              <tr className="etp-totals">
                {totalsRow.map((cell, index) => (
                  <td key={index} style={{ textAlign: columns[index]?.align ?? 'left' }}>
                    {cellText(cell)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>

        {note && <div className="etp-note">{note}</div>}

        {signatures.length > 0 && (
          <div className="etp-signatures">
            {signatures.map(([label, value]) => (
              <div key={label}>
                <div className="etp-label">{label}</div>
                <div>{value || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </ControlledDocumentFrame>
    </div>
  );
}
