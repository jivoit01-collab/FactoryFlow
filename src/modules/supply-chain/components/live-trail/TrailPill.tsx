/** The small pieces every panel of the trail reuses: a state pill and a legend. */
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { type Tone,TRAIL_SERIES } from './trail-format';

const TONES: Record<Tone, string> = {
  good: 'border-emerald-600/50 text-emerald-700 dark:text-emerald-400',
  warn: 'border-amber-500/60 text-amber-700 dark:text-amber-400',
  serious: 'border-orange-500/60 text-orange-700 dark:text-orange-400',
  critical: 'border-destructive/60 text-destructive',
  neutral: 'border-border text-muted-foreground',
};

/**
 * A state, never colour alone.
 *
 * Every pill carries a glyph and a word as well as its colour, so it survives
 * colour-vision deficiency, a greyscale print and a forced-colors mode — which
 * matters more here than usual, because the difference between "covered" and
 * "must buy" is the difference between doing nothing and spending money.
 */
export function TrailPill({
  tone = 'neutral',
  glyph,
  children,
  className,
}: {
  tone?: Tone;
  glyph?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5',
        'text-[10.5px] font-semibold leading-tight',
        TONES[tone],
        className,
      )}
    >
      {glyph && <span aria-hidden>{glyph}</span>}
      {children}
    </span>
  );
}

/** The verdict on one SKU's cover, in the words the floor uses. */
export function CoverPill({
  sku,
}: {
  sku: { to_produce: number; onhand: number; wip: number };
}) {
  if (sku.to_produce <= 0)
    return (
      <TrailPill tone="good" glyph="✓">
        covered
      </TrailPill>
    );
  if (sku.onhand + sku.wip <= 0)
    return (
      <TrailPill tone="critical" glyph="▲">
        nothing on hand
      </TrailPill>
    );
  return (
    <TrailPill tone="serious" glyph="●">
      partial
    </TrailPill>
  );
}

export function TrailLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground', className)}>
      {TRAIL_SERIES.map((series) => (
        <span key={series.key} className="inline-flex items-center gap-1.5">
          <i
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ background: series.color }}
          />
          {series.label}
        </span>
      ))}
    </div>
  );
}
