/**
 * The printed production QC sheet: a day's checks of one parameter type, on the
 * paper form they replace (e.g. QA-FRM-14-01-05-02, the on-line monitoring
 * record) — ten time columns a page, as on the form, inside the shared
 * controlled-document frame that repeats its header and footer on every page.
 */

import { ControlledDocumentFrame } from '@/shared/components';

import type { ProductionQCEntry } from '../../types/productionQC.types';
import {
  COLUMNS_PER_PAGE,
  formDate,
  sheetColumns,
  sheetRows,
  sheetTime,
} from '../../utils/productionQCSheet';

export interface ProductionQCSheetPrintPayload {
  /** The parameter type's name: the form's title. */
  title: string;
  /** The form's controlled-document code and revision (from the parameter type). */
  documentCode: string;
  revision: string;
  /** YYYY-MM-DD. */
  revisionDate: string | null;
  /** The day the sheet is for, YYYY-MM-DD. */
  day: string;
  entries: ProductionQCEntry[];
}

export function ProductionQCSheetPrintStyles() {
  return (
    <style>
      {`
        @media screen { .pqc-print { display: none; } }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
          body.pqc-printing #root { display: none !important; }
          body.pqc-printing > *:not(.pqc-print) { display: none !important; }
          .pqc-print {
            display: block !important; position: static !important; width: 100%;
            background: #fff !important; color: #111827 !important;
            font-family: Arial, Helvetica, sans-serif; font-size: 8.5px; line-height: 1.2;
          }
          .pqc-page + .pqc-page { break-before: page; page-break-before: always; }
          .pqc-date { display: flex; justify-content: space-between; align-items: baseline; margin: 0 0 3px; }
          .pqc-date strong { font-weight: 700; }
          .pqc-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .pqc-table th, .pqc-table td {
            border: 1px solid #111827; padding: 1px 3px; vertical-align: top;
            word-break: break-word; overflow-wrap: anywhere;
          }
          .pqc-table th { font-weight: 700; text-align: left; }
          .pqc-table tr { break-inside: avoid; page-break-inside: avoid; }
          .pqc-sr { width: 7mm; text-align: center; }
          .pqc-name { width: 34mm; }
          .pqc-uom { width: 14mm; }
          .pqc-label { font-weight: 700; }
          .pqc-flag { color: #b91c1c; font-weight: 700; }
          .pqc-note { font-size: 8px; }
        }
      `}
    </style>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length > 0 ? pages : [[]];
}

const STATUS_WORD = { PENDING: 'Pending', SENT_BACK: 'Sent back' } as const;

export function ProductionQCSheetPrintView({
  payload,
}: {
  payload: ProductionQCSheetPrintPayload;
}) {
  const columns = sheetColumns(payload.entries);
  const rows = sheetRows(columns);
  const pages = chunk(columns, COLUMNS_PER_PAGE);
  const anyOutOfSpec = rows.some((row) =>
    [...row.byEntry.values()].some((reading) => reading.is_within_spec === false),
  );
  const doc = {
    name: payload.title.toUpperCase(),
    code: payload.documentCode || '—',
    revision: payload.revision || '—',
    issueDate: payload.revisionDate ? formDate(payload.revisionDate) : '—',
  };

  return (
    <div className="pqc-print" aria-hidden="true">
      {/* As on the paper form: no code row in the header — the form's number is
          printed in the footer's Controlled Document box, above those words. */}
      <ControlledDocumentFrame
        doc={doc}
        hideHeaderCode
        documentId={payload.documentCode || null}
        hideDocumentIdLabel
      >
        {pages.map((page, pageIndex) => {
          // Blank columns fill the page out to the form's ten, as on paper.
          const blanks = COLUMNS_PER_PAGE - page.length;
          const fill = (key: string) =>
            Array.from({ length: blanks }, (_, i) => <td key={`${key}-blank-${i}`} />);
          const idRow = (sr: number, label: string, value: (e: ProductionQCEntry) => string) => (
            <tr key={label}>
              <td className="pqc-sr">{sr}</td>
              <td className="pqc-label">{label}</td>
              <td />
              {page.map((entry) => (
                <td key={entry.id}>{value(entry) || '-'}</td>
              ))}
              {fill(label)}
            </tr>
          );
          const footRow = (label: string, value: (e: ProductionQCEntry) => string) => (
            <tr key={label}>
              <td />
              <td className="pqc-label">{label}</td>
              <td />
              {page.map((entry) => (
                <td key={entry.id}>{value(entry)}</td>
              ))}
              {fill(label)}
            </tr>
          );
          return (
            <div key={pageIndex} className="pqc-page">
              {/* The mark's key sits on the date line, so it costs no height. */}
              <div className="pqc-date">
                <span className="pqc-note">{anyOutOfSpec ? '* Out of specification.' : ''}</span>
                <strong>Date: {formDate(payload.day)}</strong>
              </div>
              <table className="pqc-table">
                <thead>
                  <tr>
                    <th className="pqc-sr">Sr No.</th>
                    <th className="pqc-name">Parameters</th>
                    <th className="pqc-uom">UOM</th>
                    {page.map((entry) => (
                      <th key={entry.id}>Time {sheetTime(entry.checked_at)}</th>
                    ))}
                    {Array.from({ length: blanks }, (_, i) => (
                      <th key={`time-blank-${i}`}>Time</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {idRow(1, 'PRODUCT', (entry) => entry.product)}
                  {idRow(2, 'SKU', (entry) => entry.item_code)}
                  {idRow(3, 'LINE ID', (entry) => entry.line_name)}
                  {rows.map((row, index) => (
                    <tr key={row.key}>
                      <td className="pqc-sr">{index + 4}</td>
                      <td>{row.name}</td>
                      <td>{row.uom || '---'}</td>
                      {page.map((entry) => {
                        const result = row.byEntry.get(entry.id);
                        const out = result?.is_within_spec === false;
                        return (
                          <td key={entry.id} className={out ? 'pqc-flag' : undefined}>
                            {result ? `${result.result_value || '-'}${out ? ' *' : ''}` : ''}
                          </td>
                        );
                      })}
                      {fill(row.key)}
                    </tr>
                  ))}
                  {footRow('Remarks', (entry) => entry.remarks)}
                  {footRow('Q.A Chemist', (entry) => entry.submitted_by_name ?? '')}
                  {footRow('Q.A.M', (entry) =>
                    entry.status === 'APPROVED'
                      ? (entry.approved_by_name ?? '')
                      : STATUS_WORD[entry.status],
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </ControlledDocumentFrame>
    </div>
  );
}
