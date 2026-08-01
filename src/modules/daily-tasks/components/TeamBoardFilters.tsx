import { Search } from 'lucide-react';

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';

/**
 * Sort options. `name` is first and is the default on purpose — defaulting to
 * "least recorded" would turn the board into a ranking of who did least, which is
 * exactly what this feature must not be.
 */
export const BOARD_SORTS = {
  name: 'Name (A–Z)',
  most: 'Most recorded',
  least: 'Least recorded',
  last: 'Last activity',
} as const;

export type BoardSort = keyof typeof BOARD_SORTS;

export interface TeamBoardFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: BoardSort;
  onSortChange: (sort: BoardSort) => void;
}

export function TeamBoardFilters({
  search,
  onSearchChange,
  sort,
  onSortChange,
}: TeamBoardFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or employee code"
          className="pl-9"
          aria-label="Search users"
        />
      </div>

      <Select value={sort} onValueChange={(value) => onSortChange(value as BoardSort)}>
        <SelectTrigger className="sm:w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(BOARD_SORTS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
