import { IndianRupee, Package, Timer, Warehouse } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';

import type { InventoryAgeMeta } from '../types';

interface InventoryAgeMetaCardsProps {
  meta?: InventoryAgeMeta;
}

function formatINR(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function InventoryAgeMetaCards({ meta }: InventoryAgeMetaCardsProps) {
  const cards = [
    {
      label: 'Total Items',
      value: meta?.total_items ?? '—',
      icon: Package,
    },
    {
      label: 'Total Value',
      value: meta?.total_value != null ? `₹${formatINR(meta.total_value)}` : '—',
      icon: IndianRupee,
    },
    {
      label: 'Total Quantity',
      value: meta?.total_quantity != null ? meta.total_quantity.toLocaleString('en-IN') : '—',
      icon: Timer,
    },
    {
      label: 'Warehouses',
      value: meta?.warehouse_count ?? '—',
      icon: Warehouse,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
