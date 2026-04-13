import { Calendar, Factory, Package } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';

import type { ProductionRun } from '../types';
import { ProductionStatusBadge } from './ProductionStatusBadge';

interface RunCardProps {
  run: ProductionRun;
  onClick?: () => void;
}

export function RunCard({ run, onClick }: RunCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-lg">Run #{run.run_number}</h3>
          <ProductionStatusBadge status={run.live_status || run.status} />
        </div>
        {run.product && (
          <p className="text-sm font-medium mb-2 truncate">{run.product}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {run.date}
          </span>
          <span className="flex items-center gap-1">
            <Factory className="h-3 w-3" />
            {run.line_name}
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {parseFloat(run.total_production || '0') > 0 ? `${run.total_production} cases` : 'No production yet'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
