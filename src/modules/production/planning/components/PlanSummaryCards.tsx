import { AlertTriangle, CheckCircle2, ClipboardList, Factory, Target } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { PlanSummary } from '../types';

interface PlanSummaryCardsProps {
  summary: PlanSummary;
}

function formatQty(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function PlanSummaryCards({ summary }: PlanSummaryCardsProps) {
  const cards = [
    {
      label: 'Total Plans',
      value: summary.total_plans,
      icon: ClipboardList,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    },
    {
      label: 'Planned Qty',
      value: formatQty(summary.total_planned_qty),
      icon: Target,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
    },
    {
      label: 'Produced Qty',
      value: formatQty(summary.total_produced_qty),
      icon: Factory,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    },
    {
      label: 'Overall Progress',
      value: `${Math.round(summary.overall_progress_percent)}%`,
      icon: CheckCircle2,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    },
  ];

  const sapFailed = summary.sap_posting_breakdown?.FAILED ?? 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className={cn('border', card.bg)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', card.color)} />
                  <span className={cn('text-xs font-medium', card.color)}>{card.label}</span>
                </div>
                <div className={cn('text-2xl font-bold mt-1', card.color)}>{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sapFailed > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            {sapFailed} plan{sapFailed > 1 ? 's' : ''} failed to post to SAP
          </span>
        </div>
      )}
    </div>
  );
}
