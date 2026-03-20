import { AlertTriangle, ListOrdered } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';

import type { SummaryMeta } from '../types';

interface SummaryMetaCardsProps {
  meta: SummaryMeta | undefined;
}

export function SummaryMetaCards({ meta }: SummaryMetaCardsProps) {
  const cards = [
    {
      label: 'Total Orders',
      value: meta?.total_orders ?? '—',
      icon: ListOrdered,
      color: 'text-blue-600',
    },
    {
      label: 'Orders at Risk',
      value: meta?.orders_with_shortfall ?? '—',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
              </div>
              <card.icon className={`h-5 w-5 ${card.color} opacity-50`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
