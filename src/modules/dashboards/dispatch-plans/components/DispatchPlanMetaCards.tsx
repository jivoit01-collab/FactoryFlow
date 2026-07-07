import { CalendarClock, CheckCircle2, IndianRupee, Truck } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent } from '@/shared/components/ui';

import type { DispatchPlansMeta } from '../types';

interface DispatchPlanMetaCardsProps {
  meta?: DispatchPlansMeta;
}

interface MetaCard {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
}

function formatNumber(value: number | string | null | undefined, fractionDigits = 0): string {
  // SAP DecimalFields serialize as strings (or null); coerce + guard so a null/NaN
  // value renders "-" instead of throwing on .toLocaleString.
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '-';
  return numeric.toLocaleString('en-IN', {
    maximumFractionDigits: fractionDigits,
  });
}

function formatBoxes(value: number): string {
  return value > 0 ? `${formatNumber(value, 2)} boxes` : 'Boxes not available';
}

export function DispatchPlanMetaCards({ meta }: DispatchPlanMetaCardsProps) {
  const cards: MetaCard[] = [
    {
      label: 'Bills',
      value: formatNumber(meta?.total_bills ?? 0),
      sub: `${formatNumber(meta?.pending_count ?? 0)} pending`,
      icon: <CalendarClock className="h-4 w-4 text-sky-600" />,
    },
    {
      label: 'Booked',
      value: formatNumber(meta?.booked_count ?? 0),
      sub: `${formatNumber(meta?.dispatched_count ?? 0)} dispatched`,
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    },
    {
      label: 'Value',
      value: formatNumber(meta?.total_doc_value ?? 0, 2),
      sub: 'Invoice total',
      icon: <IndianRupee className="h-4 w-4 text-amber-600" />,
    },
    {
      label: 'Load',
      value: formatNumber(meta?.total_litres ?? 0, 2),
      sub: formatBoxes(meta?.total_boxes ?? 0),
      icon: <Truck className="h-4 w-4 text-violet-600" />,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
            </div>
            <div className="rounded-md border bg-background p-2">{card.icon}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
