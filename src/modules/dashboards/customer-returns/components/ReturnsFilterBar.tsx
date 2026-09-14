import { Building2, CalendarRange, RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { WINDOW_PRESETS } from '../constants';

interface ReturnsFilterBarProps {
  windowKey: string;
  onWindowChange: (key: string) => void;
  allCompanies: boolean;
  onAllCompaniesChange: (value: boolean) => void;
  onRefresh: () => void;
  isFetching: boolean;
}

/**
 * The board's controls, in one row above everything they change.
 *
 * Both are segmented buttons rather than dropdowns: there are five windows and
 * two scopes, the current one has to be readable at a glance from across a desk,
 * and a dropdown hides four of the five choices behind a click.
 */
export function ReturnsFilterBar({
  windowKey,
  onWindowChange,
  allCompanies,
  onAllCompaniesChange,
  onRefresh,
  isFetching,
}: ReturnsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1"
        role="group"
        aria-label="Window"
      >
        <CalendarRange className="mx-1.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        {WINDOW_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onWindowChange(preset.key)}
            aria-pressed={windowKey === preset.key}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
              windowKey === preset.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div
        className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1"
        role="group"
        aria-label="Company scope"
      >
        <Building2 className="mx-1.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        {[
          { value: false, label: 'This company' },
          { value: true, label: 'All my companies' },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onAllCompaniesChange(option.value)}
            aria-pressed={allCompanies === option.value}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
              allCompanies === option.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isFetching}
        className="ml-auto gap-2"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
        Refresh
      </Button>
    </div>
  );
}
