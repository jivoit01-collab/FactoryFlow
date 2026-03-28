import { Building2, IndianRupee, Package } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';

import type { ReportSummary } from '../types';

interface NonMovingMetaCardsProps {
  summary?: ReportSummary;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function NonMovingMetaCards({ summary }: NonMovingMetaCardsProps) {
  const cards = [
    {
      label: 'Total Items',
      value: summary?.total_items?.toLocaleString() ?? '—',
      icon: Package,
    },
    {
      label: 'Total Value',
      value: summary ? formatCurrency(summary.total_value) : '—',
      icon: IndianRupee,
    },
    {
      label: 'Branches',
      value: summary?.by_branch?.length?.toString() ?? '—',
      icon: Building2,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-primary/5 p-2">
              <card.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
