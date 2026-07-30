import type { CSSProperties, ReactNode } from 'react';

import {
  type ControlledDocumentMeta,
  DEFAULT_CLASSIFICATION,
  ORGANIZATION_NAME,
} from '@/config/constants';

/**
 * Controlled-document header + footer for PRINTED documents, per the Jivo
 * Wellness Document Management Procedure (DOC-SOP-04-02-00-01).
 *
 * Wrap a print view's content in <ControlledDocumentFrame doc={...}>. It renders
 * a table whose <thead>/<tfoot> the browser repeats on every printed page — so
 * the header (organization, document name, revision, document code) prints at
 * the top of each page and the footer (revision/issue date, classification,
 * "Controlled Document") at the bottom.
 *
 * Borders only (no fills) so it prints correctly even with "Background graphics"
 * turned off.
 */

const BORDER = '1px solid #111827';

const cell = (extra?: CSSProperties): CSSProperties => ({
  border: BORDER,
  padding: '4px 8px',
  fontFamily: 'Arial, Helvetica, sans-serif',
  color: '#111827',
  ...extra,
});

function ControlledDocumentHeaderBox({
  doc,
  hideCode,
}: {
  doc: ControlledDocumentMeta;
  hideCode?: boolean;
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <td
            rowSpan={hideCode ? 2 : 3}
            style={cell({
              width: 110,
              textAlign: 'center',
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: 1,
            })}
          >
            JIVO
          </td>
          <td colSpan={2} style={cell({ textAlign: 'center', fontWeight: 700, fontSize: 13 })}>
            {ORGANIZATION_NAME}
          </td>
        </tr>
        <tr>
          <td colSpan={2} style={cell({ textAlign: 'center', fontWeight: 600, fontSize: 12 })}>
            {doc.name}
          </td>
        </tr>
        {!hideCode && (
          <tr>
            <td style={cell({ fontSize: 10, width: '38%' })}>Revision No: {doc.revision}</td>
            <td style={cell({ fontSize: 10, fontWeight: 700 })}>Document Code: {doc.code}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function ControlledDocumentFooterBox({
  doc,
  documentId,
}: {
  doc: ControlledDocumentMeta;
  documentId?: string | null;
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <td style={cell({ fontSize: 9, width: '34%' })}>
            Revision No.: {doc.revision}/{doc.issueDate}
          </td>
          <td style={cell({ fontSize: 9, textAlign: 'center' })}>
            Classified: {doc.classification ?? DEFAULT_CLASSIFICATION}
          </td>
          <td style={cell({ fontSize: 9, textAlign: 'right', width: '28%', fontWeight: 700 })}>
            {documentId && (
              <div style={{ fontWeight: 600 }}>Document ID: {documentId}</div>
            )}
            Controlled Document
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function ControlledDocumentFrame({
  doc,
  children,
  hideHeaderCode,
  documentId,
}: {
  doc: ControlledDocumentMeta;
  children: ReactNode;
  /** Hide the revision/document-code row in the header (kept in the footer). */
  hideHeaderCode?: boolean;
  /** Per-instance document ID shown in the footer (e.g. the selected QC print document). */
  documentId?: string | null;
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      {/* Repeated at the top of every printed page. */}
      <thead>
        <tr>
          <td style={{ padding: 0 }}>
            <ControlledDocumentHeaderBox doc={doc} hideCode={hideHeaderCode} />
            <div style={{ height: 10 }} />
          </td>
        </tr>
      </thead>
      {/* Repeated at the bottom of every printed page. */}
      <tfoot>
        <tr>
          <td style={{ padding: 0 }}>
            <div style={{ height: 8 }} />
            <ControlledDocumentFooterBox doc={doc} documentId={documentId} />
          </td>
        </tr>
      </tfoot>
      <tbody>
        <tr>
          <td style={{ padding: 0, verticalAlign: 'top' }}>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}
