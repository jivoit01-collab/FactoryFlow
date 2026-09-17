/**
 * Small shared pieces for the Request Labour screen and its dialogs.
 */

import type { BadgeProps } from '@/shared/components/ui';

import type { LabourRequestAuditAction, LabourRequestStatus } from '../types';

/**
 * The date this page opens on. It is filled in the evening for the next day, so
 * tomorrow — not today — is the useful default. Built from the local calendar
 * date rather than a UTC ISO string, which would roll over a day early for
 * anyone east of Greenwich (IST included).
 */
export function tomorrowLocal(): string {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${tomorrow.getFullYear()}-${month}-${day}`;
}

export const STATUS_BADGE: Record<
  LabourRequestStatus,
  { variant: BadgeProps['variant']; className?: string }
> = {
  PENDING: { variant: 'warning' },
  APPROVED: { variant: 'success' },
  REJECTED: { variant: 'destructive' },
};

export const AUDIT_ACTION_TONE: Record<LabourRequestAuditAction, string> = {
  CREATE: 'bg-blue-500',
  UPDATE: 'bg-sky-500',
  APPROVE: 'bg-green-500',
  REJECT: 'bg-red-500',
  REOPEN: 'bg-amber-500',
  DELETE: 'bg-red-500',
  RESTORE: 'bg-emerald-500',
};
