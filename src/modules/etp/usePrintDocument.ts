/**
 * Resolve the controlled-document identity a register should print.
 *
 * The numbers live in the database (`/etp/print-documents/`, maintained on the
 * Settings screen) exactly as the QC print documents do, so QA can correct a
 * code or bump a revision without a release. Resolution order:
 *
 *   1. the active company's row for that form, if one exists;
 *   2. the factory-wide row (no company) — the usual case;
 *   3. the `CONTROLLED_DOCUMENTS` constant, as a last resort for a form nobody
 *      has configured yet, so a print is never left without a header.
 */

import { useCallback } from 'react';

import { CONTROLLED_DOCUMENTS, type ControlledDocumentMeta } from '@/config/constants';
import { useAuth } from '@/core/auth';

import { useEtpPrintDocuments } from './api';
import type { EtpPrintDocumentKey } from './types';

/** "2026-07-23" → "23-07-2026", the way the controlled documents print it. */
function issueDate(value: string | null): string | null {
  if (!value) return null;
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}-${month}-${year}` : value;
}

export interface ResolvedPrintDocument {
  doc: ControlledDocumentMeta;
  /** Per-copy document ID for the footer, when the plant maintains one. */
  documentId: string | null;
  /** False when nothing is configured and the bundled fallback was used. */
  fromDatabase: boolean;
}

export function useEtpPrintDocument() {
  const { currentCompany } = useAuth();
  const { data: rows = [] } = useEtpPrintDocuments({ is_active: true });
  const activeCompany = currentCompany?.company_code;

  return useCallback(
    (key: EtpPrintDocumentKey): ResolvedPrintDocument => {
      const fallback = CONTROLLED_DOCUMENTS[key];
      const forForm = rows.filter((row) => row.document_key === key && row.is_active);
      const row =
        forForm.find((candidate) => candidate.company_code === activeCompany) ??
        forForm.find((candidate) => !candidate.company_code);

      if (!row) return { doc: fallback, documentId: null, fromDatabase: false };
      return {
        doc: {
          name: row.form_name || fallback.name,
          code: row.document_code || fallback.code,
          revision: row.revision || fallback.revision,
          issueDate: issueDate(row.issue_date) ?? fallback.issueDate,
        },
        documentId: row.document_id || null,
        fromDatabase: true,
      };
    },
    [rows, activeCompany],
  );
}
