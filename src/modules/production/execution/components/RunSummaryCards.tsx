import { Activity, AlertTriangle, Clock, Package } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui';
import type { ProductionRunDetail } from '../types';

interface RunSummaryCardsProps {
  run: ProductionRunDetail;
}

export function RunSummaryCards({ run }: RunSummaryCardsProps) {
  const stats = [
    { label: 'Total Production', value: `${run.total_production} cases`, icon: Package, color: 'text-green-600' },
    { label: 'Rated Speed', value: `${run.rated_speed || '-'} cases/hr`, icon: Activity, color: 'text-blue-600' },
    { label: 'Breakdown Time', value: `${run.total_breakdown_time} min`, icon: AlertTriangle, color: 'text-red-600' },
    { label: 'PE Minutes', value: `${run.total_minutes_pe} min`, icon: Clock, color: 'text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              {stat.label}
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
