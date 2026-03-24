import { Clock, Edit2, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Switch } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useActionPoints, useToggleRule } from '../api';
import { ACTION_CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '../constants';
import type { WorkflowRule } from '../types';
import { RuleSummary } from './RuleSummary';

interface RuleCardProps {
  rule: WorkflowRule;
  onEdit: (rule: WorkflowRule) => void;
  onDelete: (rule: WorkflowRule) => void;
}

export function RuleCard({ rule, onEdit, onDelete }: RuleCardProps) {
  const { data: actionPointsData } = useActionPoints();
  const toggleMutation = useToggleRule();

  const actionPoint = useMemo(() => {
    if (!actionPointsData?.categories) return null;
    for (const actions of Object.values(actionPointsData.categories)) {
      const found = actions.find((a) => a.key === rule.action_key);
      if (found) return found;
    }
    return null;
  }, [actionPointsData, rule.action_key]);

  const categoryColors = actionPoint
    ? ACTION_CATEGORY_COLORS[actionPoint.category] ?? DEFAULT_CATEGORY_COLOR
    : DEFAULT_CATEGORY_COLOR;

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate({ id: rule.id });
    // Optimistic: the UI switch moves immediately, server confirms via query invalidation
    void checked; // Toggle is server-side; checked is just the new switch state
  };

  const formattedDate = new Date(rule.updated_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className={cn('transition-opacity', !rule.is_active && 'opacity-60')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{rule.name}</CardTitle>
            {rule.description && (
              <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
            )}
          </div>
          <Switch
            checked={rule.is_active}
            onCheckedChange={handleToggle}
            disabled={toggleMutation.isPending}
            aria-label={`Toggle rule ${rule.name}`}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn(categoryColors.bg, categoryColors.text, 'border-0 text-xs')}>
            {actionPoint?.category ?? 'Unknown'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {actionPoint?.label ?? rule.action_key}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {rule.condition_type}
          </Badge>
        </div>

        <RuleSummary conditionType={rule.condition_type} params={rule.params} />

        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formattedDate}</span>
            {rule.modified_by_name && <span>by {rule.modified_by_name}</span>}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(rule)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(rule)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
