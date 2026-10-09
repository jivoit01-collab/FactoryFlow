import { Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { ReportRangeControls } from '../hooks';
import { PRESETS } from '../utils';

const INPUT_CLASSES =
  'h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground';

/**
 * Which days: a preset, or any From and To up to a year apart. The presets are
 * a segmented row rather than a dropdown so the one in force reads at a glance.
 */
export function RangeBar({
  range,
  isFetching,
  readAt,
  onRefresh,
}: {
  range: ReportRangeControls;
  isFetching: boolean;
  readAt: string | null;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
      <div
        className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1"
        role="group"
        aria-label="Range"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => range.setPreset(preset.key)}
            aria-pressed={range.preset === preset.key}
            className={cn(
              'rounded-md px-3 py-1 text-sm font-medium transition-colors',
              range.preset === preset.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <label className="text-muted-foreground" htmlFor="pd-from">
          From
        </label>
        <input
          id="pd-from"
          type="date"
          value={range.from}
          max={range.today}
          onChange={(event) =>
            event.target.value && range.setRange({ from: event.target.value, to: range.to })
          }
          className={INPUT_CLASSES}
        />
        <label className="text-muted-foreground" htmlFor="pd-to">
          To
        </label>
        <input
          id="pd-to"
          type="date"
          value={range.to}
          max={range.today}
          onChange={(event) =>
            event.target.value && range.setRange({ from: range.from, to: event.target.value })
          }
          className={INPUT_CLASSES}
        />
      </div>

      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        {isFetching ? (
          <span className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Reading SAP…
          </span>
        ) : readAt ? (
          <span>
            Read from SAP at{' '}
            {new Date(readAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
