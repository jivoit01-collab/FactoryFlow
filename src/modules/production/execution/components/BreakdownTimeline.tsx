import { cn } from '@/shared/utils';

import type { MachineBreakdown } from '../types';

interface BreakdownTimelineProps {
  breakdowns: MachineBreakdown[];
}

const SHIFT_START = 7; // 07:00
const SHIFT_END = 19; // 19:00
const SHIFT_HOURS = SHIFT_END - SHIFT_START;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function BreakdownTimeline({ breakdowns }: BreakdownTimelineProps) {
  const shiftStartMin = SHIFT_START * 60;
  const shiftEndMin = SHIFT_END * 60;
  const totalMin = SHIFT_HOURS * 60;

  const blocks = breakdowns
    .filter((bd) => bd.start_time && bd.end_time)
    .map((bd) => {
      const startMin = Math.max(timeToMinutes(bd.start_time), shiftStartMin);
      const endMin = Math.min(timeToMinutes(bd.end_time), shiftEndMin);
      return {
        id: bd.id,
        left: ((startMin - shiftStartMin) / totalMin) * 100,
        width: ((endMin - startMin) / totalMin) * 100,
        label: `${bd.start_time}-${bd.end_time} — ${bd.machine_name} (${bd.breakdown_minutes} min)`,
        type: bd.type,
      };
    })
    .filter((b) => b.width > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        {Array.from({ length: SHIFT_HOURS + 1 }).map((_, i) => (
          <span key={i}>{String(SHIFT_START + i).padStart(2, '0')}:00</span>
        ))}
      </div>

      <div className="relative h-8 rounded-md bg-green-100 dark:bg-green-900/20 overflow-hidden">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={cn(
              'absolute top-0 h-full rounded-sm cursor-default',
              block.type === 'LINE'
                ? 'bg-red-500/80 dark:bg-red-600/70'
                : 'bg-amber-500/80 dark:bg-amber-600/70',
            )}
            style={{ left: `${block.left}%`, width: `${Math.max(block.width, 0.5)}%` }}
            title={block.label}
          />
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-100 dark:bg-green-900/20 border" />
          Running
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500/80" />
          Line Breakdown
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/80" />
          External Breakdown
        </span>
      </div>
    </div>
  );
}
