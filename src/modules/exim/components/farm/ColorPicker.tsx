/**
 * Pick the colour an oil is drawn in on the Tank Farm.
 *
 * EXIM's palette, in its groups, plus any colour picked by hand. EXIM kept a
 * list of hand-picked colours for the session, with its own add and remove
 * buttons; here the hand-picked colour is simply the oil's colour, saved with
 * it, which is all that list was ever used for.
 */
import { Check } from 'lucide-react';

import { cn } from '@/shared/utils';

import { COLOR_PALETTE, colorName, inkOn, resolveColor } from './farm';

export function ColorPicker({
  value,
  onChange,
  compact,
  id,
}: {
  /** A hex (`#d95c26`), or empty for none yet. */
  value: string;
  onChange: (hex: string) => void;
  /** Smaller swatches, for the picker that opens from a table row. */
  compact?: boolean;
  /** For the hand-picked colour's input, so a label can point at it. */
  id?: string;
}) {
  const selected = value ? resolveColor(value) : '';
  const inPalette = COLOR_PALETTE.some((g) => g.colors.some((c) => c.hex === selected));
  const size = compact ? 'h-6 w-6' : 'h-8 w-8';

  return (
    <div className="space-y-2.5">
      {COLOR_PALETTE.map((group) => (
        <div key={group.group}>
          <p className="mb-1 text-xs text-muted-foreground">{group.group}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.colors.map((color) => {
              const active = selected === color.hex;
              return (
                <button
                  key={color.hex}
                  type="button"
                  aria-label={color.name}
                  aria-pressed={active}
                  title={color.name}
                  onClick={() => onChange(color.hex)}
                  className={cn(
                    'relative grid place-items-center rounded-full border border-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    size,
                    active && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                  )}
                  style={{ backgroundColor: color.hex }}
                >
                  {active && (
                    <Check
                      aria-hidden="true"
                      className={cn(
                        compact ? 'h-3 w-3' : 'h-4 w-4',
                        inkOn(color.hex) === 'dark' ? 'text-slate-900' : 'text-white',
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <input
          id={id}
          type="color"
          value={selected || '#000000'}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
          aria-label="Pick another colour"
          className={cn(
            'cursor-pointer rounded border border-input bg-transparent p-0',
            compact ? 'h-6 w-8' : 'h-8 w-10',
          )}
        />
        <span className="text-xs text-muted-foreground">
          {selected
            ? `${inPalette ? '' : 'Picked by hand: '}${colorName(selected)}`
            : 'Or pick any colour'}
        </span>
      </div>
    </div>
  );
}
