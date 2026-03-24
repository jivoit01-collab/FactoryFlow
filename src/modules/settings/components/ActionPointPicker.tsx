import { ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useActionPoints } from '../api';
import { ACTION_CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '../constants';

interface ActionPointPickerProps {
  value: string;
  onChange: (key: string) => void;
}

export function ActionPointPicker({ value, onChange }: ActionPointPickerProps) {
  const { data, isLoading } = useActionPoints();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!data?.categories || Object.keys(data.categories).length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        No action points available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(data.categories).map(([category, actions]) => {
        const isExpanded = expandedCategories.has(category);
        const colors = ACTION_CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
        const hasSelected = actions.some((a) => a.key === value);

        return (
          <div key={category} className="rounded-lg border">
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className={cn(
                'flex w-full items-center justify-between rounded-t-lg px-4 py-3 text-left transition-colors hover:bg-muted/50',
                !isExpanded && 'rounded-b-lg',
              )}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Badge className={cn(colors.bg, colors.text, 'border-0')}>{category}</Badge>
                <span className="text-sm text-muted-foreground">
                  ({actions.length} action{actions.length !== 1 ? 's' : ''})
                </span>
              </div>
              {hasSelected && (
                <Badge variant="secondary" className="text-xs">
                  Selected
                </Badge>
              )}
            </button>
            {isExpanded && (
              <div className="space-y-1 px-3 pb-3">
                {actions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => onChange(action.key)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
                      value === action.key
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-transparent hover:bg-muted/50',
                    )}
                  >
                    <Zap
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        value === action.key ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground/70">
                        {action.key}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
