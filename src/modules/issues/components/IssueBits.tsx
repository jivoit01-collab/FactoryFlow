/**
 * The small pieces every issue screen repeats: a label chip, a state badge, a
 * priority chip, an avatar, an avatar stack.
 *
 * They live together in one file because each is a handful of lines and they
 * are always imported as a set.
 */
import { CheckCircle2, CircleDot, CircleSlash } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { IssueLabel, IssuePriority, IssueState, UserBrief } from '../types';
import { labelBorderColor, labelTextColor, PRIORITY_STYLE } from '../utils';

export function LabelChip({
  label,
  onClick,
  className,
}: {
  label: IssueLabel;
  onClick?: () => void;
  className?: string;
}) {
  const chip = (
    <span
      className={cn(
        'inline-flex max-w-[220px] items-center truncate rounded-full border px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={{
        backgroundColor: label.color,
        color: labelTextColor(label.color),
        borderColor: labelBorderColor(label.color),
      }}
      title={label.description || label.name}
    >
      {label.name}
    </span>
  );
  if (!onClick) return chip;
  return (
    <button type="button" onClick={onClick} className="hover:opacity-80">
      {chip}
    </button>
  );
}

export function StateBadge({
  state,
  reason,
  className,
}: {
  state: IssueState;
  reason?: string;
  className?: string;
}) {
  // "Closed as not planned" reads differently from "Closed" and the colour has
  // to say so, the way GitHub greys out a not-planned close.
  const notPlanned = state === 'CLOSED' && reason && reason !== 'COMPLETED';
  const Icon = state === 'OPEN' ? CircleDot : notPlanned ? CircleSlash : CheckCircle2;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white',
        state === 'OPEN' ? 'bg-green-600' : notPlanned ? 'bg-slate-500' : 'bg-purple-600',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {state === 'OPEN' ? 'Open' : notPlanned ? 'Closed as not planned' : 'Closed'}
    </span>
  );
}

/** The open / closed dot used at the start of a list row. */
export function StateIcon({ state, reason }: { state: IssueState; reason?: string }) {
  const notPlanned = state === 'CLOSED' && reason && reason !== 'COMPLETED';
  if (state === 'OPEN') {
    return <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-label="Open" />;
  }
  return notPlanned ? (
    <CircleSlash className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-label="Closed as not planned" />
  ) : (
    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" aria-label="Closed" />
  );
}

export function PriorityChip({
  priority,
  label,
  className,
}: {
  priority: IssuePriority;
  label?: string;
  className?: string;
}) {
  // Medium is the default and carries no information, so it is not shown.
  if (priority === 'MEDIUM') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        PRIORITY_STYLE[priority],
        className,
      )}
    >
      {label ?? priority}
    </span>
  );
}

export function UserAvatar({
  user,
  size = 'sm',
  className,
}: {
  user?: UserBrief | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const dimension = size === 'xs' ? 'h-5 w-5 text-[9px]' : size === 'md' ? 'h-9 w-9 text-xs' : 'h-6 w-6 text-[10px]';
  return (
    <Avatar className={cn(dimension, 'border bg-muted', className)} title={user?.name ?? 'Unassigned'}>
      <AvatarFallback className="font-semibold">{user?.initials ?? '?'}</AvatarFallback>
    </Avatar>
  );
}

/** Up to three assignee avatars, then "+N". */
export function AvatarStack({ users, limit = 3 }: { users: UserBrief[]; limit?: number }) {
  if (!users.length) return null;
  const shown = users.slice(0, limit);
  const overflow = users.length - shown.length;
  return (
    <div className="flex items-center" title={users.map((user) => user.name).join(', ')}>
      {shown.map((user, index) => (
        <UserAvatar
          key={user.id}
          user={user}
          className={index > 0 ? '-ml-1.5' : undefined}
        />
      ))}
      {overflow > 0 && (
        <span className="-ml-1.5 flex h-6 items-center rounded-full border bg-muted px-1.5 text-[10px] font-semibold">
          +{overflow}
        </span>
      )}
    </div>
  );
}
