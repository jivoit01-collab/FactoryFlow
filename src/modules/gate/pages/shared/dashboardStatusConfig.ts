import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  type LucideIcon,
  XCircle,
} from 'lucide-react';

interface StatusConfigItem {
  label: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

export interface DashboardStatusConfig {
  statusOrder: string[];
  statusConfig: Record<string, StatusConfigItem>;
  gridCols: string;
}

export const DEFAULT_STATUS_CONFIG: DashboardStatusConfig = {
  statusOrder: ['draft', 'in_progress', 'completed'],
  statusConfig: {
    DRAFT: {
      label: 'Draft',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30',
      icon: FileText,
    },
    IN_PROGRESS: {
      label: 'In Progress',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
      icon: Clock,
    },
    COMPLETED: {
      label: 'Completed',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30',
      icon: CheckCircle2,
    },
  },
  gridCols: 'grid-cols-3',
};

export const RAW_MATERIAL_STATUS_CONFIG: DashboardStatusConfig = {
  statusOrder: [
    'draft',
    'security_check_done',
    'arrival_slip_submitted',
    'arrival_slip_rejected',
    'in_progress',
    'qc_pending',
    'qc_in_review',
    'qc_awaiting_qam',
    'qc_rejected',
    'qc_hold',
    'qc_completed',
    'completed',
    'cancelled',
  ],
  statusConfig: {
    DRAFT: {
      label: 'Draft',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30',
      icon: FileText,
    },
    SECURITY_CHECK_DONE: {
      label: 'Security Done',
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30',
      icon: ShieldCheck,
    },
    ARRIVAL_SLIP_SUBMITTED: {
      label: 'Slip Submitted',
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30',
      icon: FileText,
    },
    ARRIVAL_SLIP_REJECTED: {
      label: 'Slip Rejected',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
      icon: XCircle,
    },
    IN_PROGRESS: {
      label: 'In Progress',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
      icon: Clock,
    },
    QC_PENDING: {
      label: 'QC Pending',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30',
      icon: Clock,
    },
    QC_IN_REVIEW: {
      label: 'QC In Review',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
      icon: Clock,
    },
    QC_AWAITING_QAM: {
      label: 'Awaiting QAM',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
      icon: AlertCircle,
    },
    QC_REJECTED: {
      label: 'QC Rejected',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
      icon: XCircle,
    },
    QC_HOLD: {
      label: 'QC On Hold',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30',
      icon: AlertCircle,
    },
    QC_COMPLETED: {
      label: 'QC Completed',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
      icon: CheckCircle2,
    },
    COMPLETED: {
      label: 'Completed',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30',
      icon: CheckCircle2,
    },
    CANCELLED: {
      label: 'Cancelled',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
      icon: XCircle,
    },
  },
  gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-7',
};
