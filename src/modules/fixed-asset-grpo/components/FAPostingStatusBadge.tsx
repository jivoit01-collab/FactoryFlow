import { GRPO_STATUS_CONFIG } from '@/config/constants';
import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { GRPOStatus } from '../types';

/**
 * A posting's status, as grpo's screens colour it -- except that a simulated
 * post (stored POSTED, with no SAP document) says SIMULATED, never "Posted".
 */
export function FAPostingStatusBadge({
  status,
  simulated,
}: {
  status: GRPOStatus;
  simulated?: boolean;
}) {
  if (simulated) {
    return (
      <Badge className="border-transparent bg-amber-500 text-white hover:bg-amber-500/80">
        SIMULATED
      </Badge>
    );
  }
  const config = GRPO_STATUS_CONFIG[status];
  if (!config) return <Badge variant="outline">{status}</Badge>;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        config.bgColor,
        config.color,
      )}
    >
      {config.label}
    </span>
  );
}
