import { CONDITION_ORDER, CONDITION_SHORT, type ReturnsPalette } from '../constants';
import type { ReturnCondition } from '../types';
import { exactQty } from '../utils/format';

interface ConditionBarProps {
  conditions: Record<ReturnCondition, number>;
  palette: ReturnsPalette;
  /** `sm` is the in-table version; `lg` heads the condition panel. */
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * One row's condition split as a single stacked bar.
 *
 * Segments are separated by a 2px gap in the surface colour rather than butting
 * together, so two adjacent segments read as two quantities instead of one long
 * one — which matters most for the pair this board is about, Damaged against
 * Expired. Each segment carries its own `title`, so the exact figure is a hover
 * away without a chart library being involved.
 *
 * Renders an empty track rather than nothing when a row has no lines yet: a
 * return whose paperwork is not keyed in is a real state, and a missing bar would
 * look like a rendering fault.
 */
export function ConditionBar({
  conditions,
  palette,
  size = 'sm',
  className,
}: ConditionBarProps) {
  const total = CONDITION_ORDER.reduce((sum, key) => sum + (conditions[key] || 0), 0);
  const height = size === 'lg' ? 'h-3' : 'h-2';

  if (total <= 0) {
    return (
      <div
        className={`${height} w-full rounded-full bg-muted ${className ?? ''}`}
        title="No lines keyed in against this return yet"
      />
    );
  }

  return (
    <div className={`flex ${height} w-full gap-[2px] overflow-hidden ${className ?? ''}`}>
      {CONDITION_ORDER.map((key) => {
        const value = conditions[key] || 0;
        if (value <= 0) return null;
        const share = (value * 100) / total;
        return (
          <span
            key={key}
            className="h-full rounded-full transition-opacity duration-200 hover:opacity-80"
            style={{ width: `${share}%`, backgroundColor: palette.condition[key] }}
            title={`${CONDITION_SHORT[key]}: ${exactQty(value)} (${share.toFixed(1)}%)`}
          />
        );
      })}
    </div>
  );
}
