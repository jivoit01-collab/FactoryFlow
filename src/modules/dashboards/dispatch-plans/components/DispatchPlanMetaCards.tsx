import type { LucideIcon } from 'lucide-react';
import { CalendarClock, CheckCircle2, IndianRupee, Truck } from 'lucide-react';

import type { AccentKey } from '@/shared/components/dashboard/accents';
import { StatTile, StatTileRow } from '@/shared/components/page';

import type { DispatchPlansMeta } from '../types';

interface DispatchPlanMetaCardsProps {
  meta?: DispatchPlansMeta;
}

interface MetaCard {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  accent: AccentKey;
}

function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString('en-IN', {
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
      icon: CalendarClock,
      accent: 'sky',
    },
    {
      label: 'Booked',
      value: formatNumber(meta?.booked_count ?? 0),
      sub: `${formatNumber(meta?.dispatched_count ?? 0)} dispatched`,
      icon: CheckCircle2,
      accent: 'emerald',
    },
    {
      label: 'Value',
      value: formatNumber(meta?.total_doc_value ?? 0, 2),
      sub: 'Invoice total',
      icon: IndianRupee,
      accent: 'amber',
    },
    {
      label: 'Load',
      value: formatNumber(meta?.total_litres ?? 0, 2),
      sub: formatBoxes(meta?.total_boxes ?? 0),
      icon: Truck,
      accent: 'violet',
    },
  ];

  return (
    <StatTileRow>
      {cards.map((card) => (
        <StatTile
          key={card.label}
          label={card.label}
          value={card.value}
          sub={card.sub}
          icon={card.icon}
          accent={card.accent}
        />
      ))}
    </StatTileRow>
  );
}
