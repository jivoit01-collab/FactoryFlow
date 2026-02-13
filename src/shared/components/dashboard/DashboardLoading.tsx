import { cn } from '@/shared/utils';

/**
 * Props for the DashboardLoading component.
 */
export interface DashboardLoadingProps {
  /** Optional CSS class */
  className?: string;
  /** Height of the loading container (default: 'h-48') */
  height?: string;
}

/**
 * A loading spinner for dashboard pages.
 *
 * @example
 * ```tsx
 * {isLoading && <DashboardLoading />}
 * ```
 */
export function DashboardLoading({ className, height = 'h-48' }: DashboardLoadingProps) {
  return (
    <div
      className={cn('flex items-center justify-center', height, className)}
      role="status"
      aria-label="Loading"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
