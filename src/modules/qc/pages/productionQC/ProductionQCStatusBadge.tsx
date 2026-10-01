import { cn } from '@/shared/utils';

import { PRODUCTION_QC_STATUS_CONFIG } from '../../constants/productionQC';
import type { ProductionQCStatus } from '../../types/productionQC.types';
import { formatDateTime } from '../../utils/productionQCFormat';

export function ProductionQCStatusBadge({
  status,
  label,
  className,
}: {
  status: ProductionQCStatus;
  /** The server's label, when it has one; falls back to ours. */
  label?: string;
  className?: string;
}) {
  const config = PRODUCTION_QC_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        config?.className ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {label || config?.label || status}
    </span>
  );
}

/** Why a QC lead sent the entry back, for whoever corrects it. */
export function SentBackBanner({
  by,
  at,
  remarks,
}: {
  by: string | null;
  at: string | null;
  remarks: string;
}) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
      <p className="font-semibold">
        Sent back{by ? ` by ${by}` : ''}
        {at ? ` on ${formatDateTime(at)}` : ''}
      </p>
      <p className="mt-1 whitespace-pre-wrap">{remarks || 'No remark given.'}</p>
    </div>
  );
}
