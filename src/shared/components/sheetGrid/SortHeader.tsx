import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import type { SortState } from './sorting';

/**
 * Click-to-sort column header.
 *
 * Clicking the sorted column flips it; clicking another switches to it. The
 * arrow is only ever drawn on the column actually in force, so there is one
 * answer on screen to "what is this ordered by".
 */
export function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
  className = '',
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (next: SortState) => void;
  align?: 'left' | 'right';
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th className={`px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      <button
        type="button"
        onClick={() =>
          onSort({
            key: sortKey,
            // Re-clicking the live column flips it; a new one starts ascending.
            direction: active && sort.direction === 'asc' ? 'desc' : 'asc',
          })
        }
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          align === 'right' ? 'flex-row-reverse' : ''
        } ${active ? 'text-foreground' : 'text-muted-foreground'}`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <Icon className={`h-3 w-3 ${active ? '' : 'opacity-40'}`} />
      </button>
    </th>
  );
}
