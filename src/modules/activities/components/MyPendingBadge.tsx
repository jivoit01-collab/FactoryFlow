import { ACTIVITY_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { cn } from '@/shared/utils';

import { useMyPendingCount } from '../api/activities.queries';

/**
 * Sidebar badge showing how many jobs are waiting for the signed-in user.
 * Renders nothing when there is nothing pending or the count cannot be fetched,
 * so a backend hiccup never leaves a broken chip in the nav.
 */
export function MyPendingBadge({ className }: { className?: string }) {
  const { hasPermission } = usePermission();
  const enabled = hasPermission(ACTIVITY_PERMISSIONS.VIEW_MY);
  const { data } = useMyPendingCount(enabled);

  if (!enabled || !data) return null;

  return (
    <span
      className={cn(
        'inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground',
        className,
      )}
    >
      {data > 99 ? '99+' : data}
    </span>
  );
}
