import { format, startOfMonth, subDays } from 'date-fns';

import { EXPENSE_SPANS } from '../constants';
import type { ExpenseSpanKey } from '../types';

export interface ExpenseRange {
  from: string;
  to: string;
}

/**
 * The dates a span covers, ending today.
 *
 * `7 days` means today and the six before it — inclusive at both ends, which is
 * how the server counts `days` too. Getting that off by one would make every
 * per-day accrual on the board disagree with its own label.
 */
export function rangeFor(span: ExpenseSpanKey, today: Date = new Date()): ExpenseRange {
  const to = format(today, 'yyyy-MM-dd');
  const option = EXPENSE_SPANS.find((item) => item.key === span);

  if (!option || option.days === 'month') {
    return { from: format(startOfMonth(today), 'yyyy-MM-dd'), to };
  }
  return { from: format(subDays(today, option.days - 1), 'yyyy-MM-dd'), to };
}

/**
 * The span as a sentence for the header.
 *
 * A single day names itself; a range within one month drops the repeated month
 * from the first date, because "1 – 12 September 2026" is read at a glance and
 * "1 September 2026 – 12 September 2026" is read twice.
 */
export function describeRange(from: string, to: string, days: number): string {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const dayWord = `${days} day${days === 1 ? '' : 's'}`;

  if (from === to) return format(end, 'd MMMM yyyy');

  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const startText = sameMonth ? format(start, 'd') : format(start, 'd MMM yyyy');
  return `${startText} – ${format(end, 'd MMMM yyyy')} · ${dayWord}`;
}
