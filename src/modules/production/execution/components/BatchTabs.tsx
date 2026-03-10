import { Plus } from 'lucide-react';

import { cn } from '@/shared/utils';
import { Button } from '@/shared/components/ui';

interface BatchTabsProps {
  activeBatch: number;
  totalBatches: number;
  maxBatches?: number;
  disabled?: boolean;
  onBatchChange: (batch: number) => void;
  onAddBatch: () => void;
}

export function BatchTabs({
  activeBatch,
  totalBatches,
  maxBatches = 3,
  disabled = false,
  onBatchChange,
  onAddBatch,
}: BatchTabsProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalBatches }).map((_, i) => {
        const batch = i + 1;
        return (
          <button
            key={batch}
            type="button"
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeBatch === batch
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
            onClick={() => onBatchChange(batch)}
          >
            Batch {batch}
          </button>
        );
      })}
      {!disabled && totalBatches < maxBatches && (
        <Button variant="ghost" size="sm" onClick={onAddBatch} className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Batch
        </Button>
      )}
    </div>
  );
}
