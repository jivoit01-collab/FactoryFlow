/**
 * The directory's filter bar.
 *
 * Everything the brief asks to filter by is here, but not all of it is on
 * screen at once: department, designation, manager and sort are the four
 * people reach for every day and stay visible, while level, location, joining
 * window and salary band live behind "More filters". A bar that shows nine
 * controls at all times is a bar nobody reads.
 *
 * Two decisions carry the design.
 *
 * **The status filter is chips with live counts**, not a dropdown. "Active 128
 * · Probation 6 · On leave 3" answers the question most people came to ask
 * before they have clicked anything, and the counts move as the other filters
 * narrow the set — so a department filter plus these chips reads as "this
 * department has three people on leave".
 *
 * **The salary band only appears for somebody who may see salaries.** Filtering
 * by pay is a way of reading pay, and the API refuses it without a salary
 * right; offering the control anyway would be a filter that answers 403. When
 * it does appear and the viewer's reach is partial, it says so — the results
 * are their own team, not the company.
 */
import { Filter, RotateCcw, Search, X } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Input,
  Label,
  MultiSelect,
  NativeSelect,
  SelectOption,
  Switch,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type {
  Choice,
  Department,
  Designation,
  EmployeeBrief,
  EmployeeFilters,
  EmploymentStatus,
} from '../types';
import { statusStyle } from './theme';

/** Sorts offered in the picker, with names people recognise. */
const SORTS: { value: string; label: string; needsSalary?: boolean }[] = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'code', label: 'Employee code' },
  { value: 'level', label: 'Hierarchy level' },
  { value: 'designation', label: 'Designation (senior first)' },
  { value: 'department', label: 'Department' },
  { value: 'joined', label: 'Newest joiners' },
  { value: 'joined-asc', label: 'Longest serving' },
  { value: 'salary', label: 'Salary (high → low)', needsSalary: true },
  { value: 'salary-asc', label: 'Salary (low → high)', needsSalary: true },
];

export interface EmployeeFilterBarProps {
  filters: EmployeeFilters;
  onChange: (changes: Partial<EmployeeFilters>) => void;
  onReset: () => void;
  departments: Department[];
  designations: Designation[];
  managers: EmployeeBrief[];
  statuses: Choice[];
  statusCounts: Record<string, number>;
  /** Whether this viewer may see any salary at all. */
  canSeeSalary: boolean;
  /** Whether their reach is the whole company, so the band can be labelled. */
  salaryScopeIsAll: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  className?: string;
}

export function EmployeeFilterBar({
  filters,
  onChange,
  onReset,
  departments,
  designations,
  managers,
  statuses,
  statusCounts,
  canSeeSalary,
  salaryScopeIsAll,
  searchValue,
  onSearchChange,
  className,
}: EmployeeFilterBarProps) {
  const [showMore, setShowMore] = useState(false);

  const selectedStatuses = filters.status ?? [];
  const activeExtras =
    (filters.level?.length ? 1 : 0) +
    (filters.location ? 1 : 0) +
    (filters.joined_from || filters.joined_to ? 1 : 0) +
    (filters.salary_min || filters.salary_max ? 1 : 0) +
    (filters.managers_only ? 1 : 0) +
    (filters.top_level_only ? 1 : 0) +
    (filters.include_past ? 1 : 0);

  function toggleStatus(status: EmploymentStatus) {
    const next = selectedStatuses.includes(status)
      ? selectedStatuses.filter((entry) => entry !== status)
      : [...selectedStatuses, status];
    onChange({ status: next, page: 1 });
  }

  return (
    <div className={cn('space-y-3 rounded-xl border bg-card p-3 shadow-sm', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, employee code, email, phone or job title"
            className="pl-8 pr-8"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear the search"
              className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <MultiSelect
          id="employee-department-filter"
          className="min-w-[160px]"
          placeholder="All departments"
          searchable
          options={departments.map((department) => ({
            value: String(department.id),
            label: department.name,
          }))}
          selected={(filters.department ?? []).map(String)}
          onChange={(values) =>
            onChange({ department: values.map(Number).filter(Boolean), page: 1 })
          }
        />

        <MultiSelect
          id="employee-designation-filter"
          className="min-w-[160px]"
          placeholder="All designations"
          searchable
          options={designations.map((designation) => ({
            value: String(designation.id),
            label: designation.name,
          }))}
          selected={(filters.designation ?? []).map(String)}
          onChange={(values) =>
            onChange({ designation: values.map(Number).filter(Boolean), page: 1 })
          }
        />

        <NativeSelect
          className="w-[180px]"
          value={filters.manager ? String(filters.manager) : ''}
          onChange={(event) =>
            onChange({ manager: event.target.value ? Number(event.target.value) : undefined, page: 1 })
          }
          aria-label="Filter by manager"
        >
          <SelectOption value="">Any manager</SelectOption>
          {managers.map((manager) => (
            <SelectOption key={manager.id} value={String(manager.id)}>
              {manager.full_name}
            </SelectOption>
          ))}
        </NativeSelect>

        <NativeSelect
          className="w-[190px]"
          value={filters.sort ?? 'name'}
          onChange={(event) => onChange({ sort: event.target.value, page: 1 })}
          aria-label="Sort"
        >
          {SORTS.filter((sort) => !sort.needsSalary || canSeeSalary).map((sort) => (
            <SelectOption key={sort.value} value={sort.value}>
              {sort.label}
            </SelectOption>
          ))}
        </NativeSelect>

        <Button
          variant={showMore ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowMore((open) => !open)}
          className="gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          More filters
          {activeExtras > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tabular-nums">
              {activeExtras}
            </span>
          )}
        </Button>

        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      {/* Status chips, with the counts the rest of the filter produced. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {statuses.map((status) => {
          const value = status.value as EmploymentStatus;
          const count = statusCounts[value] ?? 0;
          const selected = selectedStatuses.includes(value);
          const style = statusStyle(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleStatus(value)}
              aria-pressed={selected}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                selected ? style.chip : 'border-border text-muted-foreground hover:bg-muted',
                !selected && count === 0 && 'opacity-50',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
              {status.label}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {showMore && (
        <div className="grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="employee-level-filter" className="text-xs">
              Hierarchy level
            </Label>
            <MultiSelect
              id="employee-level-filter"
              className="mt-1"
              placeholder="Any level"
              options={Array.from({ length: 10 }).map((_, index) => ({
                value: String(index + 1),
                label: `Level ${index + 1}`,
              }))}
              selected={(filters.level ?? []).map(String)}
              onChange={(values) => onChange({ level: values.map(Number), page: 1 })}
            />
          </div>

          <div>
            <Label htmlFor="employee-location-filter" className="text-xs">
              Location
            </Label>
            <Input
              id="employee-location-filter"
              className="mt-1"
              value={filters.location ?? ''}
              onChange={(event) => onChange({ location: event.target.value, page: 1 })}
              placeholder="Any location"
            />
          </div>

          <div>
            <Label htmlFor="employee-joined-from" className="text-xs">
              Joined between
            </Label>
            <div className="mt-1 flex items-center gap-1">
              <Input
                id="employee-joined-from"
                type="date"
                value={filters.joined_from ?? ''}
                onChange={(event) => onChange({ joined_from: event.target.value, page: 1 })}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                aria-label="Joined before"
                value={filters.joined_to ?? ''}
                onChange={(event) => onChange({ joined_to: event.target.value, page: 1 })}
              />
            </div>
          </div>

          {canSeeSalary && (
            <div>
              <Label htmlFor="employee-salary-min" className="text-xs">
                Annual salary band
                {!salaryScopeIsAll && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    (within your access)
                  </span>
                )}
              </Label>
              <div className="mt-1 flex items-center gap-1">
                <Input
                  id="employee-salary-min"
                  type="number"
                  inputMode="numeric"
                  placeholder="Min"
                  value={filters.salary_min ?? ''}
                  onChange={(event) => onChange({ salary_min: event.target.value, page: 1 })}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  aria-label="Maximum salary"
                  placeholder="Max"
                  value={filters.salary_max ?? ''}
                  onChange={(event) => onChange({ salary_max: event.target.value, page: 1 })}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <Label htmlFor="employee-managers-only" className="text-xs font-normal">
              Managers only
            </Label>
            <Switch
              id="employee-managers-only"
              checked={!!filters.managers_only}
              onChange={(checked) => onChange({ managers_only: checked || undefined, page: 1 })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <Label htmlFor="employee-top-level" className="text-xs font-normal">
              Top level only
            </Label>
            <Switch
              id="employee-top-level"
              checked={!!filters.top_level_only}
              onChange={(checked) => onChange({ top_level_only: checked || undefined, page: 1 })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <Label htmlFor="employee-include-past" className="text-xs font-normal">
              Include people who have left
            </Label>
            <Switch
              id="employee-include-past"
              checked={!!filters.include_past}
              onChange={(checked) => onChange({ include_past: checked || undefined, page: 1 })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
