import { useNavigate } from 'react-router-dom';

import { Badge, Card, CardContent } from '@/shared/components/ui';

import { ProductionStatusBadge } from './ProductionStatusBadge';
import type { ProductionRun } from '../types';

interface RunCardProps {
  run: ProductionRun;
}

export function RunCard({ run }: RunCardProps) {
  const navigate = useNavigate();

  const progressPct =
    run.rated_speed && Number(run.rated_speed) > 0
      ? Math.min(100, (run.total_production / (Number(run.rated_speed) * 12)) * 100)
      : 0;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={() => navigate(`/production/execution/runs/${run.id}`)}
    >
      <CardContent className="p-5">
        {/* Top row: badges */}
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">
            Run #{run.run_number}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {run.line_name}
          </Badge>
          <ProductionStatusBadge status={run.status} />
        </div>

        {/* Title */}
        <h4 className="font-semibold text-base">
          {run.brand || run.plan_item_name || 'Production Run'}
          {run.pack && <span className="text-muted-foreground font-normal"> — {run.pack}</span>}
        </h4>
        {run.sap_order_no && (
          <p className="text-xs text-muted-foreground mt-0.5">
            SAP Order: {run.sap_order_no}
          </p>
        )}

        {/* Production progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium">{run.total_production.toLocaleString()} Cases</span>
            {progressPct > 0 && (
              <span className="text-xs text-muted-foreground">{progressPct.toFixed(1)}%</span>
            )}
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            {new Date(run.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {run.total_breakdown_time > 0 && (
            <span className="text-xs text-red-600">{run.total_breakdown_time} min breakdown</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
