import { AlertTriangle } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { SAP_POSTING_COLORS, SAP_POSTING_LABELS } from '../constants';
import type { SAPPostingStatus } from '../types';

interface SAPPostingBadgeProps {
  status: SAPPostingStatus;
  sapDocNum?: number | null;
  errorMessage?: string | null;
  className?: string;
}

export function SAPPostingBadge({
  status,
  sapDocNum,
  errorMessage,
  className,
}: SAPPostingBadgeProps) {
  const colors = SAP_POSTING_COLORS[status] || SAP_POSTING_COLORS.NOT_POSTED;
  const label = SAP_POSTING_LABELS[status] || status;

  const displayLabel =
    status === 'POSTED' && sapDocNum ? `${label} · Doc# ${sapDocNum}` : label;

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        colors.bg,
        colors.text,
        colors.darkBg,
        colors.darkText,
        className,
      )}
    >
      {status === 'FAILED' && <AlertTriangle className="h-3 w-3" />}
      {displayLabel}
    </span>
  );

  if (status === 'FAILED' && errorMessage) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">{errorMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
