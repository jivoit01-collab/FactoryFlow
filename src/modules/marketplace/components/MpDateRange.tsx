/**
 * Date-range filter with quick presets — used to narrow pages by sheet upload
 * date or order date. Empty from/to means "no bound", so "All" clears both.
 */
import { CalendarDays, X } from 'lucide-react';

import { Button, Input } from '@/shared/components/ui';

export interface MpRange {
  from: string; // yyyy-mm-dd, '' = no lower bound
  to: string;   // yyyy-mm-dd, '' = no upper bound
}

export const EMPTY_RANGE: MpRange = { from: '', to: '' };

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** True when an ISO datetime/date string falls inside the range (inclusive). */
export function inRange(iso: string | null | undefined, range: MpRange): boolean {
  if (!iso) return !range.from && !range.to;
  const day = iso.slice(0, 10);
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

export function MpDateRange({
  value,
  onChange,
  label = 'Date',
}: {
  value: MpRange;
  onChange: (r: MpRange) => void;
  label?: string;
}) {
  const active = !!(value.from || value.to);
  const presets: { label: string; range: MpRange }[] = [
    { label: 'Today', range: { from: isoDaysAgo(0), to: '' } },
    { label: '7 days', range: { from: isoDaysAgo(7), to: '' } },
    { label: '30 days', range: { from: isoDaysAgo(30), to: '' } },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" /> {label}
      </span>
      <Input
        type="date"
        aria-label={`${label} from`}
        value={value.from}
        max={value.to || undefined}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        className="h-9 w-[9.5rem]"
      />
      <span className="text-xs text-muted-foreground">to</span>
      <Input
        type="date"
        aria-label={`${label} to`}
        value={value.to}
        min={value.from || undefined}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        className="h-9 w-[9.5rem]"
      />
      {presets.map((p) => (
        <Button key={p.label} size="sm" variant="ghost" className="h-8 px-2 text-xs"
          onClick={() => onChange(p.range)}>
          {p.label}
        </Button>
      ))}
      {active ? (
        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs"
          onClick={() => onChange(EMPTY_RANGE)}>
          <X className="mr-1 h-3 w-3" /> Clear
        </Button>
      ) : null}
    </div>
  );
}
