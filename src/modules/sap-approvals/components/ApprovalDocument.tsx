/**
 * The request's draft in full — SAP Portal's Document, TDS, GL and Attachments
 * tabs — shown under the approval summary when the approver asks for it.
 *
 * The document is the document browser's own view (`DocumentDetailBody`), read
 * through the inbox (`requests/<id>/document/`) so an approver needs no
 * document-browser right to see what they sign. Files open through the inbox
 * too, which serves only this request's attachment entries.
 */
import { FileSearch, FileText, Paperclip } from 'lucide-react';
import { useState } from 'react';

import { SAP_DOCUMENTS_ACCESS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DocumentDetailBody } from '@/modules/sap-documents/components/DocumentDetailDialog';
import { useBaseDocumentOpener } from '@/modules/sap-documents/hooks/useBaseDocumentOpener';
import { Button } from '@/shared/components/ui';

import {
  useOpenSapApprovalAttachment,
  useSapApprovalAttachmentLines,
  useSapApprovalDocument,
} from '../api/sap-approvals.queries';

function AttachmentSource({ wddCode, label, absEntry }: { wddCode: number; label: string; absEntry: number }) {
  const lines = useSapApprovalAttachmentLines(wddCode, absEntry);
  const open = useOpenSapApprovalAttachment(wddCode);
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {lines.isLoading ? (
        <p className="text-xs text-muted-foreground">Reading the files…</p>
      ) : lines.isError ? (
        <p className="text-xs text-destructive">SAP could not list these files.</p>
      ) : (lines.data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">No files.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {(lines.data ?? []).map((file) => (
            <li key={file.line}>
              <button
                type="button"
                disabled={open.isPending}
                onClick={() => open.mutate({ absEntry, line: file.line, fileName: file.file_name })}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
              >
                <FileText className="h-3.5 w-3.5" />
                {file.file_name || `File ${file.line}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ApprovalDocument({ wddCode }: { wddCode: number }) {
  const [asked, setAsked] = useState(false);
  const query = useSapApprovalDocument(wddCode, asked);
  const { hasAllPermissions } = usePermission();
  // "Copied from" documents open in the document browser, which needs its right.
  const opener = useBaseDocumentOpener(asked && hasAllPermissions(SAP_DOCUMENTS_ACCESS));

  if (!asked) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAsked(true)}>
        <FileSearch className="mr-1.5 h-4 w-4" />
        Show the full document
      </Button>
    );
  }
  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Reading the document from SAP…</p>;
  }
  if (query.isError || !query.data) {
    return (
      <p className="text-sm text-destructive">
        {(query.error as { message?: string } | null)?.message || 'The document could not be read from SAP.'}
      </p>
    );
  }
  const { document, attachment_sources: sources } = query.data;
  return (
    <div className="space-y-5">
      <DocumentDetailBody
        doc={document}
        opener={opener}
        attachments={
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Paperclip className="h-4 w-4" />
              Attachments
            </h3>
            {sources.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No attachment on this document or the documents it was copied from.
              </p>
            ) : (
              sources.map((source) => (
                <AttachmentSource
                  key={source.abs_entry}
                  wddCode={wddCode}
                  label={source.label}
                  absEntry={source.abs_entry}
                />
              ))
            )}
          </section>
        }
      />
    </div>
  );
}
