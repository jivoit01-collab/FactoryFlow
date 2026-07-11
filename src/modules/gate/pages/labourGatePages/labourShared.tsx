import { Moon, Sun } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '@/shared/utils';

import type { LabourGateEntry, LabourShift } from '../../api/labourGate/labourGate.api';
import { fmtDateTime } from './labourUtils';

/**
 * Day/Night shift switcher shared by the Labour module, Labour In and Labour Out
 * screens. Labour recorded on one shift is a separate tally from the other.
 */
export function ShiftToggle({
  value,
  onChange,
}: {
  value: LabourShift;
  onChange: (shift: LabourShift) => void;
}) {
  const options: { key: LabourShift; label: string; icon: ReactNode }[] = [
    { key: 'DAY', label: 'Day', icon: <Sun className="h-4 w-4" /> },
    { key: 'NIGHT', label: 'Night', icon: <Moon className="h-4 w-4" /> },
  ];
  return (
    <div className="inline-flex rounded-lg border-2 p-0.5" role="tablist" aria-label="Shift">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

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
