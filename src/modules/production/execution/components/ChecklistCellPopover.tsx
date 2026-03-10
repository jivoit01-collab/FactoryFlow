import { Check, Minus, X } from 'lucide-react';

import { cn } from '@/shared/utils';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui';

import type { ChecklistStatus } from '../types';

interface ChecklistCellPopoverProps {
  status: ChecklistStatus | null;
  disabled?: boolean;
  isToday?: boolean;
  onChange: (status: ChecklistStatus) => void;
}

const STATUS_DISPLAY: Record<
  ChecklistStatus,
  { label: string; bg: string; text: string; icon: typeof Check }
> = {
  OK: { label: 'OK', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: Check },
  NOT_OK: { label: 'N', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: X },
  NA: { label: '—', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', icon: Minus },
};

export function ChecklistCellPopover({
  status,
  disabled = false,
  isToday = false,
  onChange,
}: ChecklistCellPopoverProps) {
  if (disabled || status === 'NA') {
    const display = status ? STATUS_DISPLAY[status] : null;
    return (
      <div
        className={cn(
          'h-8 w-10 flex items-center justify-center rounded text-xs font-medium',
          display ? `${display.bg} ${display.text}` : 'bg-gray-50 dark:bg-gray-900',
        )}
      >
        {display?.label ?? ''}
      </div>
    );
  }

  if (status) {
    const display = STATUS_DISPLAY[status];
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'h-8 w-10 flex items-center justify-center rounded text-xs font-medium cursor-pointer transition-opacity hover:opacity-80',
              display.bg,
              display.text,
              isToday && 'ring-2 ring-blue-400',
            )}
          >
            {display.label}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1.5" align="center">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-green-700 hover:bg-green-100"
              onClick={() => onChange('OK')}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              OK
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-red-700 hover:bg-red-100"
              onClick={() => onChange('NOT_OK')}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Not OK
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-gray-500 hover:bg-gray-100"
              onClick={() => onChange('NA')}
            >
              N/A
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Empty cell — clickable
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'h-8 w-10 rounded border border-dashed border-gray-300 dark:border-gray-600 hover:border-primary/50 hover:bg-muted/50 transition-colors',
            isToday && 'border-blue-400 border-solid bg-blue-50/30 dark:bg-blue-900/10',
          )}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1.5" align="center">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-green-700 hover:bg-green-100"
            onClick={() => onChange('OK')}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            OK
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-red-700 hover:bg-red-100"
            onClick={() => onChange('NOT_OK')}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Not OK
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-gray-500 hover:bg-gray-100"
            onClick={() => onChange('NA')}
          >
            N/A
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
