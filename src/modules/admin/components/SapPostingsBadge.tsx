import { SAP_POSTINGS_PERMISSIONS } from '@/config/permissions/sap-postings.permissions';
import { usePermission } from '@/core/auth';
import { useSapPostingCounts } from '@/modules/admin/api/sapPostings.queries';
import { cn } from '@/shared/utils';

/**
 * How many postings SAP refused: the ones a person has to fix. Waiting ones are
 * not counted -- they post by themselves once SAP answers -- so the badge means
 * "something to do", not "SAP had a bad morning".
 */
export function SapPostingsBadge({ className }: { className?: string }) {
  const { hasPermission } = usePermission();
  const canView = hasPermission(SAP_POSTINGS_PERMISSIONS.VIEW);
  // Two counts, not a list: the badge is on every page, for as long as it is open.
  const { data } = useSapPostingCounts({ enabled: canView });

  const count = data?.counts?.REJECTED ?? 0;
  if (!canView || count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white',
        className,
      )}
      aria-label={`${count} SAP posting${count === 1 ? '' : 's'} refused by SAP`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
