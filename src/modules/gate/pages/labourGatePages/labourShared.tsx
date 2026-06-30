import { type ReactNode } from 'react';

import { cn } from '@/shared/utils';

import type { LabourGateEntry } from '../../api/labourGate/labourGate.api';
import { fmtDateTime } from './labourUtils';

export function ProgressBar({ pct, tone = 'primary' }: { pct: number; tone?: 'primary' | 'green' }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full transition-all', tone === 'green' ? 'bg-green-500' : 'bg-primary')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function AuditLine({ entry }: { entry: LabourGateEntry }) {
  return (
    <p className="text-xs text-muted-foreground truncate">
      Added by {entry.created_by_name ?? '—'} · {fmtDateTime(entry.created_at)}
      {entry.updated_by_name && (
        <>
          {' '}
          · edited by {entry.updated_by_name} · {fmtDateTime(entry.updated_at)}
        </>
      )}
    </p>
  );
}

export function SummaryStat({
  icon,
  label,
  value,
  className,
}: {
  icon?: ReactNode;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className={cn('text-3xl font-bold', className)}>{value}</p>
    </div>
  );
}
