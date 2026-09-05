import { FilePlus2, FileX2, PencilLine } from 'lucide-react';

import { Badge, type BadgeProps } from '@/shared/components/ui';

import type {
  QCDocumentFileAuditAction,
  QCDocumentFileAuditEntry,
} from '../../types/qcDocumentFileAudit.types';

/**
 * Shared rendering for an audit event.
 *
 * The manager's log page and the per-document History panel show the same
 * rows in different shapes — a table and a timeline — so the parts that carry
 * meaning (what the action was, what actually moved) live here rather than
 * being written twice and drifting apart.
 */

interface ActionStyle {
  variant: BadgeProps['variant'];
  Icon: typeof FilePlus2;
}

const ACTION_STYLE: Record<QCDocumentFileAuditAction, ActionStyle> = {
  UPLOADED: { variant: 'success', Icon: FilePlus2 },
  EDITED: { variant: 'warning', Icon: PencilLine },
  RETIRED: { variant: 'destructive', Icon: FileX2 },
};

const UNKNOWN_ACTION: ActionStyle = { variant: 'secondary', Icon: PencilLine };

export function AuditActionBadge({ entry }: { entry: QCDocumentFileAuditEntry }) {
  // Fall back rather than render nothing if the backend logs an action this
  // build has not heard of — the row still has to be readable.
  const { variant, Icon } = ACTION_STYLE[entry.action] ?? UNKNOWN_ACTION;
  return (
    <Badge variant={variant} className="gap-1 whitespace-nowrap">
      <Icon className="h-3 w-3" />
      {entry.action_label || entry.action}
    </Badge>
  );
}

/** One side of a change, matching how the server renders it into the CSV. */
const VALUE_LABELS: Record<string, string> = {
  INHOUSE: 'In-house',
  STANDARD: 'Standard',
  true: 'Active',
  false: 'Retired',
};

function renderValue(value: string | boolean | null): string {
  if (value === null || value === undefined) return '—';
  if (value === '') return '(blank)';
  return VALUE_LABELS[String(value)] ?? String(value);
}

const FIELD_LABELS: Record<string, string> = {
  document_code: 'Document code',
  title: 'Title',
  revision: 'Revision',
  procedure_type: 'Type',
  file: 'File',
  is_active: 'Status',
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ');
}

/**
 * What moved, one line per field.
 *
 * An upload has no "before", so its `old` side is null on every field and the
 * arrow is dropped — showing `— → Hot Air Oven` for five fields reads as noise
 * where `Hot Air Oven` reads as the value it was filed with.
 */
export function AuditChanges({ entry }: { entry: QCDocumentFileAuditEntry }) {
  const moves = Object.entries(entry.changes ?? {});
  if (moves.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const isUpload = entry.action === 'UPLOADED';

  return (
    <div className="space-y-0.5">
      {moves.map(([field, move]) => (
        <div key={field} className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
          <span className="text-muted-foreground">{fieldLabel(field)}:</span>
          {isUpload ? (
            <span className="font-medium">{renderValue(move?.new ?? null)}</span>
          ) : (
            <>
              <span className="text-muted-foreground line-through">
                {renderValue(move?.old ?? null)}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{renderValue(move?.new ?? null)}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
