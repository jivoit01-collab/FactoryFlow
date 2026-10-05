/**
 * Whether the returning goods come on a vehicle at all.
 *
 * Most come back on a truck the gate marks in. Some are carried in by hand or
 * dropped off by courier; unticked, the return skips the gate and goes straight
 * on to the items and receipt.
 */
import { cn } from '@/shared/utils';

export function ReturnVehicleCheckbox({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-md border p-3',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4"
      />
      <span className="text-sm">
        <span className="font-medium">The goods are coming on a vehicle</span>
        <span className="block text-xs text-muted-foreground">
          Untick for goods carried in by hand or sent by courier — the gate is not involved.
        </span>
      </span>
    </label>
  );
}
