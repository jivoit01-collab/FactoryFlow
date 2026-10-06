import { ClipboardList, PackageCheck, PackageX, ShoppingCart } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';
import { formatNumber } from '@/shared/utils';

import type { SalesPlanningRequirementSummary } from '../types';

interface SalesPlanningRequirementMetaCardsProps {
  summary?: Pick<
    SalesPlanningRequirementSummary,
    'total_items' | 'total_required_qty' | 'total_open_po_qty' | 'total_net_shortage_qty'
  >;
}

function formatQuantity(value?: number): string {
  return formatNumber(value ?? 0, 0);
}

export function SalesPlanningRequirementMetaCards({
  summary,
}: SalesPlanningRequirementMetaCardsProps) {
  const cards = [
    {
      label: 'Items',
      value: summary ? formatQuantity(summary.total_items) : '-',
      icon: ClipboardList,
    },
    {
      label: 'Required Qty',
      value: summary ? formatQuantity(summary.total_required_qty) : '-',
      icon: PackageX,
    },
    {
      label: 'Open PO Qty',
      value: summary ? formatQuantity(summary.total_open_po_qty) : '-',
      icon: ShoppingCart,
    },
    {
      label: 'Net Shortage',
      value: summary ? formatQuantity(summary.total_net_shortage_qty) : '-',
      icon: PackageCheck,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-primary/5 p-2">
              <card.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="truncate text-2xl font-bold tabular-nums">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
