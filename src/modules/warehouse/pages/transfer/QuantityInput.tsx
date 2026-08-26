import { Input } from '@/shared/components/ui';

import { isWholeUnit } from './transferFormat';

/**
 * A quantity field that cannot be changed by scrolling past it.
 *
 * `<input type="number">` responds to the mouse wheel while focused, so
 * scrolling the page with the cursor over the box silently edits the value —
 * and with a 0.001 step each notch is invisible. That is the most likely way a
 * transfer request for 1 PCS became 0.993 PCS: seven wheel notches. Blurring on
 * wheel hands the scroll back to the page and leaves the number alone.
 *
 * `step` follows the unit: whole units get 1, so the arrow keys cannot produce a
 * fraction either. The server refuses fractional PCS regardless — this only
 * stops it being created by accident.
 */
export function QuantityInput({
  value,
  onChange,
  uom,
  max,
  ariaLabel,
  className,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  uom?: string | null;
  max?: number | string;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const whole = isWholeUnit(uom);
  return (
    <Input
      type="number"
      inputMode={whole ? 'numeric' : 'decimal'}
      min="0"
      max={max}
      step={whole ? '1' : '0.001'}
      aria-label={ariaLabel}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onWheel={(e) => e.currentTarget.blur()}
    />
  );
}
