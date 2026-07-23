import { FileCheck2 } from 'lucide-react';

import type { ControlledDocumentFields } from '@/shared/types';

interface DocumentCodeBadgeProps extends ControlledDocumentFields {
  /** Render inline (compact) instead of as a bordered block. */
  inline?: boolean;
  className?: string;
}

/**
 * Displays the controlled-document code, revision and issue date assigned to an
 * uploaded PDF by the backend numbering service. Renders nothing when the
 * record has no code (e.g. legacy files uploaded before numbering existed).
 */
export function DocumentCodeBadge({
  document_code,
  document_revision,
  document_issue_date,
  inline = false,
  className = '',
}: DocumentCodeBadgeProps) {
  if (!document_code) return null;

  const meta = [
    document_revision ? `Rev ${document_revision}` : null,
    document_issue_date || null,
  ].filter(Boolean);

  if (inline) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}
        title={`Document code ${document_code}${meta.length ? ` (${meta.join(', ')})` : ''}`}
      >
        <FileCheck2 className="h-3 w-3 shrink-0" />
        <span className="font-mono">{document_code}</span>
        {meta.length > 0 && <span>· {meta.join(' · ')}</span>}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 px-2 py-1 text-xs text-muted-foreground ${className}`}
    >
      <FileCheck2 className="h-3.5 w-3.5 shrink-0" />
      <span className="font-mono font-medium text-foreground">{document_code}</span>
      {meta.length > 0 && <span>· {meta.join(' · ')}</span>}
    </div>
  );
}
