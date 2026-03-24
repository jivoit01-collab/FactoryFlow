import { Filter } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useConditionTypes } from '../api';
import { CONDITION_CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '../constants';

interface ConditionTypePickerProps {
  value: string;
  onChange: (key: string) => void;
  actionKey?: string;
}

export function ConditionTypePicker({ value, onChange, actionKey }: ConditionTypePickerProps) {
  const { data: conditionTypes, isLoading } = useConditionTypes();

  const filteredTypes = useMemo(() => {
    if (!conditionTypes) return [];
    if (!actionKey) return conditionTypes;
    return conditionTypes.filter(
      (ct) => ct.compatible_actions.length === 0 || ct.compatible_actions.includes(actionKey),
    );
  }, [conditionTypes, actionKey]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredTypes> = {};
    for (const ct of filteredTypes) {
      const cat = ct.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ct);
    }
    return groups;
  }, [filteredTypes]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (filteredTypes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        {actionKey
          ? 'No compatible condition types for this action point'
          : 'No condition types available'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedByCategory).map(([category, types]) => {
        const colors = CONDITION_CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;

        return (
          <div key={category}>
            <div className="mb-2 flex items-center gap-2">
              <Badge className={cn(colors.bg, colors.text, 'border-0 text-xs')}>{category}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {types.map((ct) => (
                <button
                  key={ct.key}
                  type="button"
                  onClick={() => onChange(ct.key)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    value === ct.key
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:bg-muted/50',
                  )}
                >
                  <Filter
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      value === ct.key ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{ct.label}</p>
                    <p className="text-xs text-muted-foreground">{ct.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
