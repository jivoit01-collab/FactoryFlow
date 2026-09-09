import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui';

import { PACKING_MATERIAL_SOURCES } from '../constants';
import type { PackingMaterialSource } from '../types';

export interface PmDispatchSourceToggleProps {
  source: PackingMaterialSource;
  onSourceChange: (source: PackingMaterialSource) => void;
  disabled?: boolean;
}

/**
 * Which register counts as dispatch.
 *
 * Both answers are true and they do not cover the same bills — 396 of the 603
 * invoices SAP raised in August 2026 had a FactoryFlow docking behind them.
 * Each option carries its hint on hover so the gap between the two totals
 * reads as two questions rather than as one of them being wrong.
 */
export function PmDispatchSourceToggle({
  source,
  onSourceChange,
  disabled,
}: PmDispatchSourceToggleProps) {
  return (
    <div className="flex shrink-0 items-center rounded-md border p-0.5">
      {PACKING_MATERIAL_SOURCES.map((option) => (
        <Tooltip key={option.value}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant={source === option.value ? 'secondary' : 'ghost'}
              className="h-7 px-2.5 text-xs"
              disabled={disabled}
              onClick={() => onSourceChange(option.value)}
            >
              {option.label}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{option.hint}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
