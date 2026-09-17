import { Eye } from 'lucide-react';

/** Shown on docking flow steps when walking a completed entry read-only. */
export function ReviewModeBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-3 text-sm text-blue-900 dark:text-blue-400">
      <Eye className="h-4 w-4 shrink-0" />
      <span>
        Read-only review — this Docking entry is completed. Use Previous / Next to move through the
        steps; nothing here can be changed.
      </span>
    </div>
  );
}
