/**
 * The row of filter menus above the issue list, and the search box below them.
 *
 * The menus and the text box are not two separate filter states — every menu
 * writes a `key:value` qualifier into the same query string the box shows. Pick
 * "Label: bug" and the box reads `label:bug`; delete it from the box and the
 * menu is no longer ticked. One source of truth, so the two can never disagree,
 * and a filter someone built with the menus can be copied out of the box and
 * pasted to a colleague.
 */
import { Check, ChevronDown, X } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { IssueMeta } from '../types';
import { readQualifier, SORT_OPTIONS, sortLabels, withQualifier } from '../utils';

interface IssueFilterBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  meta?: IssueMeta;
}

export function IssueFilterBar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  meta,
}: IssueFilterBarProps) {
  const activeLabel = readQualifier(query, 'label');
  const activeAssignee = readQualifier(query, 'assignee');
  const activeAuthor = readQualifier(query, 'author');
  const activeArea = readQualifier(query, 'area');
  const activePriority = readQualifier(query, 'priority');

  function set(key: string, value: string | null) {
    onQueryChange(withQualifier(query, key, value));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu
        title="Label"
        active={activeLabel}
        options={sortLabels(meta?.labels ?? []).map((label) => ({
          value: label.name,
          label: label.name,
          swatch: label.color,
        }))}
        onPick={(value) => set('label', value)}
      />
      <FilterMenu
        title="Area"
        active={activeArea}
        options={(meta?.areas ?? []).map((area) => ({ value: area.code, label: area.name }))}
        onPick={(value) => set('area', value)}
      />
      <FilterMenu
        title="Assignee"
        active={activeAssignee}
        // "@me" first, because filtering to your own work is the common case.
        options={[
          { value: '@me', label: 'Assigned to me' },
          { value: '__none__', label: 'Nobody', special: 'no:assignee' },
          ...(meta?.users ?? []).map((user) => ({ value: user.email, label: user.name })),
        ]}
        onPick={(value, special) => {
          if (special) {
            // "Nobody" is `no:assignee`, not an assignee value.
            onQueryChange(withQualifier(withQualifier(query, 'assignee', null), 'no', 'assignee'));
            return;
          }
          onQueryChange(withQualifier(withQualifier(query, 'no', null), 'assignee', value));
        }}
      />
      <FilterMenu
        title="Author"
        active={activeAuthor}
        options={[
          { value: '@me', label: 'Reported by me' },
          ...(meta?.users ?? []).map((user) => ({ value: user.email, label: user.name })),
        ]}
        onPick={(value) => set('author', value)}
      />
      <FilterMenu
        title="Priority"
        active={activePriority}
        options={(meta?.priorities ?? []).map((row) => ({
          value: row.value.toLowerCase(),
          label: row.label,
        }))}
        onPick={(value) => set('priority', value)}
      />

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Sort: {SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Recently updated'}
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.value} onClick={() => onSortChange(option.value)}>
                <Check
                  className={cn('mr-2 h-4 w-4', sort === option.value ? 'opacity-100' : 'opacity-0')}
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface FilterOption {
  value: string;
  label: string;
  swatch?: string;
  special?: string;
}

function FilterMenu({
  title,
  active,
  options,
  onPick,
}: {
  title: string;
  active: string;
  options: FilterOption[];
  onPick: (value: string | null, special?: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={active ? 'secondary' : 'outline'} size="sm">
          {title}
          {active && <span className="ml-1 max-w-[120px] truncate font-normal">: {active}</span>}
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[320px] w-56 overflow-y-auto">
        <DropdownMenuLabel>Filter by {title.toLowerCase()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {active && (
          <>
            <DropdownMenuItem onClick={() => onPick(null)}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {options.length === 0 && (
          <DropdownMenuItem disabled>Nothing to filter by yet</DropdownMenuItem>
        )}
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onPick(option.value, option.special)}
          >
            <Check
              className={cn(
                'mr-2 h-4 w-4',
                active === option.value ? 'opacity-100' : 'opacity-0',
              )}
            />
            {option.swatch && (
              <span
                className="mr-2 h-3 w-3 shrink-0 rounded-full border"
                style={{ backgroundColor: option.swatch }}
              />
            )}
            <span className="truncate">{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
