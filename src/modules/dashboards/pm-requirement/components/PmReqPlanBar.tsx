import { CalendarRange, Download, RotateCw } from 'lucide-react';

import { Button, NativeSelect, SelectOption } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { formatWindow, planShortLabel } from '../constants';
import type { PmReqPlan } from '../types';
import { formatQtyCompact } from '../utils';

export interface PmReqPlanBarProps {
  plans: PmReqPlan[];
  /** Null while the API's own default is still being resolved. */
  absId: number | null;
  onAbsIdChange: (absId: number) => void;
  /** The plan actually reported on, which is what the labels describe. */
  plan?: PmReqPlan;
  /** The window `Issue (PC)` counted. */
  dateFrom?: string;
  dateTo?: string;
  isFetching: boolean;
  onRefresh: () => void;
  onExport: () => void;
  exportDisabled: boolean;
  /** How many rows the export would write, so the button says what it does. */
  exportCount: number;
}

/**
 * Which plan the board is reading, and over what window.
 *
 * The plan is picked, not derived from a month: SAP holds one header per
 * month but a planner can author a revision — this company has two April 2026
 * plans — and a month picker would silently choose one of them. Picking the
 * plan by its own code means the board is always reading the document
 * somebody can open in SAP and check against.
 *
 * The period is shown, never chosen. `Issue (PC)` is the plan's own first day
 * to today, and a window a user could set would let movements be netted
 * against a requirement they were never drawn for.
 */
export function PmReqPlanBar({
  plans,
  absId,
  onAbsIdChange,
  plan,
  dateFrom,
  dateTo,
  isFetching,
  onRefresh,
  onExport,
  exportDisabled,
  exportCount,
}: PmReqPlanBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 sm:p-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <NativeSelect
          aria-label="Production plan"
          className="h-9 w-full min-w-0 sm:w-64"
          value={absId ?? ''}
          onChange={(event) => onAbsIdChange(Number(event.target.value))}
          disabled={!plans.length}
        >
          {!plans.length && <SelectOption value="">No plan in SAP</SelectOption>}
          {plans.map((option) => (
            <SelectOption key={option.abs_id} value={option.abs_id}>
              {planShortLabel(option)}
              {option.item_count ? ` · ${option.item_count} SKUs` : ' · empty'}
            </SelectOption>
          ))}
        </NativeSelect>

        {plan && (
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {/* The window the issue column added up, spelled out. "1st to
                  today" is only true while the plan is the current month. */}
              Issued to the floor {formatWindow(dateFrom ?? '', dateTo ?? '')}
              {plan.planned_qty
                ? ` · plan ${formatQtyCompact(plan.planned_qty)} pcs across ${plan.item_count} SKUs`
                : ''}
            </span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={exportDisabled}
          title={
            exportDisabled
              ? 'Nothing to export'
              : `Download the ${exportCount} rows shown, as they are sorted`
          }
        >
          <Download className="mr-1.5 h-4 w-4" />
          Export
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Refresh"
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RotateCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </Button>
      </div>
    </div>
  );
}
