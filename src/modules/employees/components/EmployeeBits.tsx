/**
 * The small pieces every employee screen repeats.
 *
 * They live together because each is a handful of lines and they are always
 * imported as a set — the same reason the issue tracker keeps its chips in one
 * file.
 *
 * Two of them carry real design decisions.
 *
 * `EmployeeAvatar` is the module's most-repeated element: it appears in the org
 * chart, in every directory row, in the manager card and in a dozen pickers. It
 * falls back to initials on a level-tinted ring, so a company with no photos
 * uploaded still reads as a chart of people rather than a wall of grey circles.
 *
 * The **ring carries the hierarchy level and the dot carries the status** —
 * deliberately two different facts on two different channels. Ringing by status
 * instead left every active person in the company circled the same green, which
 * said nothing, while the level ramp that makes a chart scannable went unseen.
 * Somebody who has left loses both: the ring goes neutral and the photo goes
 * grey, which is the one case where the avatar itself should stop competing.
 *
 * `SalaryValue` is where this module's privacy rule becomes visible. A figure
 * the viewer may not see is not blank and not zero: it is a lock and the word
 * "Restricted", which tells the reader the number exists and is not theirs.
 * "Not on record" is a different message, shown when the employee genuinely has
 * no salary entered. Collapsing those two into one empty cell would have people
 * asking payroll why the new joiner has no salary when in fact they simply
 * cannot see it.
 */
import { Lock, ShieldCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type {
  EmployeeBrief,
  EmploymentStatus,
  RevisionType,
  SalaryStatus,
  SalarySummary,
} from '../types';
import { money } from '../utils';
import {
  levelAccent,
  levelLabel,
  REVISION_STYLE,
  SALARY_STATUS_STYLE,
  statusStyle,
} from './theme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const AVATAR_SIZE: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-sm',
  xl: 'h-20 w-20 text-lg',
};

const DOT_SIZE: Record<AvatarSize, string> = {
  xs: 'h-2 w-2',
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
  xl: 'h-4 w-4',
};

export function EmployeeAvatar({
  employee,
  size = 'md',
  showStatus = true,
  className,
}: {
  employee: Pick<
    EmployeeBrief,
    'full_name' | 'initials' | 'photo' | 'employment_status' | 'hierarchy_level'
  >;
  size?: AvatarSize;
  showStatus?: boolean;
  className?: string;
}) {
  const accent = levelAccent(employee.hierarchy_level ?? 1);
  const status = statusStyle(employee.employment_status);
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <Avatar
        className={cn(
          AVATAR_SIZE[size],
          'ring-2 ring-offset-2 ring-offset-background',
          status.gone ? 'ring-border grayscale' : accent.ring,
        )}
      >
        {employee.photo ? (
          <AvatarImage src={employee.photo} alt={employee.full_name} />
        ) : null}
        <AvatarFallback className={cn('font-semibold', accent.iconBg, accent.icon)}>
          {employee.initials || '?'}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background',
            DOT_SIZE[size],
            status.dot,
          )}
          title={employee.employment_status}
        />
      )}
    </span>
  );
}

/** `ON_LEAVE` → `On leave`. Only a fallback: the API sends a display label. */
function prettyStatus(status: string) {
  const words = status.replaceAll('_', ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function StatusChip({
  status,
  label,
  className,
}: {
  status: EmploymentStatus;
  label?: string;
  className?: string;
}) {
  const style = statusStyle(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        style.chip,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {label ?? prettyStatus(status)}
    </span>
  );
}

/** `L3` on the level ramp — depth, made scannable without being decoded. */
export function LevelChip({ level, className }: { level: number; className?: string }) {
  const accent = levelAccent(level);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        accent.iconBg,
        accent.icon,
        className,
      )}
      title={`Level ${level} of the reporting chain`}
    >
      {levelLabel(level)}
    </span>
  );
}

/** `4 direct · 12 in team` — the two team numbers, told apart. */
export function TeamCount({
  direct,
  total,
  className,
}: {
  direct: number;
  total?: number;
  className?: string;
}) {
  if (!direct && !total) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums',
        className,
      )}
      title={
        total && total !== direct
          ? `${direct} direct report(s), ${total} in the whole team`
          : `${direct} direct report(s)`
      }
    >
      <Users className="h-3.5 w-3.5" />
      {direct}
      {total && total !== direct ? <span className="opacity-70">/ {total}</span> : null}
    </span>
  );
}

/**
 * A salary figure, or the honest reason there is none on screen.
 *
 * `salary === null` is a permission answer; `salary.amount === null` is a data
 * answer. They look different because they mean different things.
 */
export function SalaryValue({
  salary,
  size = 'sm',
  className,
}: {
  salary: SalarySummary | null | undefined;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  if (salary === null || salary === undefined) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-muted-foreground/70',
          size === 'lg' ? 'text-sm' : 'text-xs',
          className,
        )}
        title="You do not have access to this employee's salary"
      >
        <Lock className="h-3.5 w-3.5" />
        Restricted
      </span>
    );
  }
  if (salary.amount === null) {
    return (
      <span
        className={cn(
          'text-muted-foreground/70',
          size === 'lg' ? 'text-sm' : 'text-xs',
          className,
        )}
      >
        Not on record
      </span>
    );
  }
  return (
    <span
      className={cn(
        'font-semibold tabular-nums',
        size === 'lg' ? 'text-lg' : 'text-sm',
        className,
      )}
    >
      {money(salary.amount, salary.currency)}
    </span>
  );
}

export function SalaryStatusChip({
  status,
  className,
}: {
  status: SalaryStatus;
  className?: string;
}) {
  const style = SALARY_STATUS_STYLE[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        style.chip,
        className,
      )}
    >
      {status === 'ACTIVE' && <ShieldCheck className="h-3 w-3" />}
      {style.label}
    </span>
  );
}

export function RevisionChip({
  type,
  label,
  className,
}: {
  type: RevisionType;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium',
        REVISION_STYLE[type] ?? REVISION_STYLE.OTHER,
        className,
      )}
    >
      {label}
    </span>
  );
}

/** A label / value pair, as used down the profile's left column. */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm">{children || '—'}</dd>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: typeof Users;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-sm text-xs text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}
