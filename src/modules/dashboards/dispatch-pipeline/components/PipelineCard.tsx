import { ExternalLink, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/shared/utils';

import { PIPELINE_STAGE_META } from '../constants';
import type { PipelineCard as PipelineCardData } from '../types';

function formatStageAt(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function compact(value: string | null | undefined, fallback = '—'): string {
  return value?.trim() || fallback;
}

export function PipelineCard({ card }: { card: PipelineCardData }) {
  const navigate = useNavigate();
  const meta = PIPELINE_STAGE_META[card.stage];
  // Cards that have reached docking can deep-link into the dispatch detail /
  // review flow; earlier stages have no gate-out document to open yet.
  const gateOutId = card.gate_out_id;
  const isClickable = gateOutId != null;

  const open = () => {
    if (gateOutId != null) navigate(`/gate/sales-dispatch/${gateOutId}`);
  };

  return (
    <div
      className={cn(
        'rounded-md border bg-card p-3 text-sm shadow-sm transition-colors',
        isClickable && 'cursor-pointer hover:border-primary/50 hover:bg-accent/40',
      )}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? open : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 font-semibold">
          <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono">{compact(card.vehicle_no)}</span>
        </div>
        {isClickable ? (
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : null}
      </div>

      <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
        <div className="truncate">
          Inv <span className="font-medium text-foreground">{compact(card.invoice_number)}</span>
          {card.customer_name ? <span> · {card.customer_name}</span> : null}
        </div>
        {card.transporter_name ? (
          <div className="truncate">{card.transporter_name}</div>
        ) : null}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span>{compact(card.dispatch_date, '')}</span>
          {card.stage_at ? (
            <span className={cn('inline-flex items-center gap-1')}>
              <span className={cn('h-1.5 w-1.5 rounded-full', meta?.dot)} />
              {formatStageAt(card.stage_at)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
