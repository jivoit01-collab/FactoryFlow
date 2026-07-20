import { AlertTriangle, CheckCircle2, Circle, Play, Square } from 'lucide-react';

import type { BlowingRunStatus, LiveStatus } from '../types';

const LIVE_STATUS_CONFIG: Record<
  LiveStatus,
  { label: string; cls: string; icon: typeof Circle }
> = {
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', icon: Circle },
  RUNNING: { label: 'Running', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: Play },
  BREAKDOWN: { label: 'Breakdown', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
  STOPPED: { label: 'Stopped', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Square },
  COMPLETED: { label: 'Completed', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle2 },
};

export function BlowingStatusBadge({ status }: { status: BlowingRunStatus | LiveStatus }) {
  const display: LiveStatus = status === 'IN_PROGRESS' ? 'STOPPED' : (status as LiveStatus);
  const config = LIVE_STATUS_CONFIG[display] ?? LIVE_STATUS_CONFIG.DRAFT;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.cls}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
