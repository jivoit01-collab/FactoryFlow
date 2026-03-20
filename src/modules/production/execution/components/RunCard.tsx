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
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">Run #{run.run_number}</h3>
          <ProductionStatusBadge status={run.status} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {run.date}
          </div>
          <div className="flex items-center gap-1.5">
            <Factory className="h-3.5 w-3.5" />
            {run.line_name}
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            {run.brand} - {run.pack}
          </div>
          <div className="font-medium text-foreground">
            {run.total_production} cases
          </div>
        </div>
        {run.sap_order_no && (
          <p className="text-xs text-muted-foreground mt-2">SAP: {run.sap_order_no}</p>
        )}
      </CardContent>
    </Card>
  );
}
