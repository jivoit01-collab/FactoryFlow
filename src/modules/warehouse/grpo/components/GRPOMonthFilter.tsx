import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

interface GRPOMonthFilterProps {
  year: number;
  month: number; // 1-12
  onChange: (year: number, month: number) => void;
}

/**
 * Year + Month picker for the GRPO list pages. `year` and `month` must always be
 * sent together to the server (a lone one is ignored). Defaults are managed by
 * the parent (typically the current year/month).
 */
export function GRPOMonthFilter({ year, month, onChange }: GRPOMonthFilterProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="flex items-center gap-2">
      <Select value={String(year)} onValueChange={(v) => onChange(Number(v), month)}>
        <SelectTrigger className="h-9 w-[110px]" aria-label="Filter by year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(month)} onValueChange={(v) => onChange(year, Number(v))}>
        <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by month">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((label, index) => (
            <SelectItem key={label} value={String(index + 1)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
