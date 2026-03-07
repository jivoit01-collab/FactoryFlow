import { Activity, AlertTriangle, Gauge, Package } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';

interface RunSummaryCardsProps {
  totalProduction: number;
  breakdownMinutes: number;
  efficiency: number;
  speed: number;
}

export function RunSummaryCards({
  totalProduction,
  breakdownMinutes,
  efficiency,
  speed,
}: RunSummaryCardsProps) {
  const cards = [
    {
      label: 'Total Production',
      value: `${totalProduction.toLocaleString()} Cases`,
      icon: Package,
      color: 'text-blue-600',
    },
    {
      label: 'Breakdown Time',
      value: `${breakdownMinutes} min`,
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      label: 'Efficiency',
      value: `${efficiency.toFixed(1)}%`,
      icon: Gauge,
      color: 'text-green-600',
    },
    {
      label: 'Speed',
      value: `${speed} cases/hr`,
      icon: Activity,
      color: 'text-gray-700 dark:text-gray-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
