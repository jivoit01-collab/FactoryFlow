import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useMaterialIndents } from '@/modules/maintenance/api';
import { cn } from '@/shared/utils';

/**
 * Live count of material indents waiting for purchase approval, rendered as a small pill
 * in the sidebar. Renders nothing when there are none pending or the user cannot approve.
 */
export function MaterialIndentApprovalsBadge({ className }: { className?: string }) {
  const { hasAnyPermission } = usePermission();
  const canView = hasAnyPermission([
    MAINTENANCE_PERMISSIONS.APPROVE_MATERIAL_INDENT,
    MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT,
  ]);

  const { data } = useMaterialIndents({ status: 'PENDING_APPROVAL' }, canView);

  const count = data?.length ?? 0;
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white',
        className,
      )}
      aria-label={`${count} material indent${count === 1 ? '' : 's'} pending approval`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
