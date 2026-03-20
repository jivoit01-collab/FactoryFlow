import { AlertTriangle, CheckCircle2, Circle, Clock, Play, Square } from 'lucide-react';
import type { LiveStatus, RunStatus } from '../types';

const LIVE_STATUS_CONFIG: Record<LiveStatus, { label: string; bg: string; text: string; darkBg: string; darkText: string; icon: typeof Circle }> = {
  DRAFT: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-800', darkBg: 'dark:bg-gray-800', darkText: 'dark:text-gray-300', icon: Circle },
  RUNNING: { label: 'Running', bg: 'bg-green-100', text: 'text-green-800', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-400', icon: Play },
  BREAKDOWN: { label: 'Breakdown', bg: 'bg-red-100', text: 'text-red-800', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400', icon: AlertTriangle },
  STOPPED: { label: 'Stopped', bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-400', icon: Square },
  COMPLETED: { label: 'Completed', bg: 'bg-blue-100', text: 'text-blue-800', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400', icon: CheckCircle2 },
};

interface ProductionStatusBadgeProps {
  status: RunStatus | LiveStatus;
}

export function ProductionStatusBadge({ status }: ProductionStatusBadgeProps) {
  // Map old IN_PROGRESS to STOPPED for display (if no live_status provided)
  const displayStatus: LiveStatus = status === 'IN_PROGRESS' ? 'STOPPED' : (status as LiveStatus);
  const config = LIVE_STATUS_CONFIG[displayStatus] || LIVE_STATUS_CONFIG.DRAFT;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text} ${config.darkBg} ${config.darkText}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
