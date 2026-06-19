import { useMemo } from 'react';

import { Loader2 } from 'lucide-react';

import type { PipelineCard, PipelineColumn as PipelineColumnData } from '../types';
import { PipelineColumn } from './PipelineColumn';

interface PipelineBoardProps {
  columns: PipelineColumnData[];
  cards: PipelineCard[];
  isLoading: boolean;
}

export function PipelineBoard({ columns, cards, isLoading }: PipelineBoardProps) {
  const cardsByStage = useMemo(() => {
    const map = new Map<string, PipelineCard[]>();
    for (const card of cards) {
      const list = map.get(card.stage);
      if (list) list.push(card);
      else map.set(card.stage, [card]);
    }
    return map;
  }, [cards]);

  if (isLoading && cards.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading pipeline…
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {columns.map((column) => (
        <PipelineColumn
          key={column.stage}
          column={column}
          cards={cardsByStage.get(column.stage) ?? []}
        />
      ))}
    </div>
  );
}
