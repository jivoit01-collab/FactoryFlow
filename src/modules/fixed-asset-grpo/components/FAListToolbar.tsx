import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

import { Input } from '@/shared/components/ui';

/**
 * Search box and month filter shared by the Fixed Asset GRPO tabs.
 *
 * The month is optional: fixed-asset receipts are few and the backlog matters,
 * so the lists open on every month and the filter narrows them when asked.
 */
export function FAListToolbar({
  search,
  onSearchChange,
  month,
  onMonthChange,
  placeholder = 'Search entry, supplier, PO, work order…',
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  month: string;
  onMonthChange: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
          aria-label="Search"
        />
      </div>
      <Input
        type="month"
        value={month}
        onChange={(e) => onMonthChange(e.target.value)}
        className="w-[170px]"
        aria-label="Filter by month"
        title="Leave empty for every month"
      />
      {children}
    </div>
  );
}
