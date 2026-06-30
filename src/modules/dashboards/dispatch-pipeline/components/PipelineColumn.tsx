import { cn } from '@/shared/utils';

import { PIPELINE_STAGE_META } from '../constants';
import type { PipelineCard as PipelineCardData, PipelineColumn as PipelineColumnData } from '../types';
import { PipelineCard } from './PipelineCard';

interface PipelineColumnProps {
  column: PipelineColumnData;
  cards: PipelineCardData[];
}

export function PipelineColumn({ column, cards }: PipelineColumnProps) {
  const meta = PIPELINE_STAGE_META[column.stage];

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30">
      <div
        className={cn(
          'flex items-center justify-between gap-2 rounded-t-lg border-b px-3 py-2',
          meta?.headerBg,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', meta?.dot)} />
          <span className="truncate text-sm font-semibold">{column.label}</span>
        </div>
        <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums">
          {column.count}
        </span>
      </div>

      <div className="flex max-h-[calc(100vh-18rem)] flex-1 flex-col gap-2 overflow-y-auto p-2">
        {cards.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">No vehicles</div>
        ) : (
          cards.map((card) => <PipelineCard key={card.plan_id} card={card} />)
        )}
      </div>
    </div>
  );
}
