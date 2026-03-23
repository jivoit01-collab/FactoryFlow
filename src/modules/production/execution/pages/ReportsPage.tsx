import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Calendar, Clock, Trash2 } from 'lucide-react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';

import { useOEEAnalytics, useDowntimeAnalytics, useWasteAnalytics } from '../api';
import type { AnalyticsParams } from '../types';

function ReportsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<AnalyticsParams>({});

  const { data: oeeData } = useOEEAnalytics(params);
  const { data: downtimeData } = useDowntimeAnalytics(params);
  const { data: wasteData } = useWasteAnalytics(params);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Reports & Analytics"
        description="OEE, efficiency, yield & production analysis"
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>From</Label>
              <Input type="date" value={params.date_from || ''} onChange={(e) => setParams((p) => ({ ...p, date_from: e.target.value }))} className="w-[160px]" />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={params.date_to || ''} onChange={(e) => setParams((p) => ({ ...p, date_to: e.target.value }))} className="w-[160px]" />
            </div>
            <Button variant="outline" onClick={() => navigate('/production/execution/reports/daily')}>
              <Calendar className="h-4 w-4 mr-1" /> Daily Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OEE */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-600" /> OEE Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            {oeeData?.per_run_oee?.length ? (
              <div className="space-y-2">
                {oeeData.per_run_oee.slice(0, 5).map((r) => (
                  <div key={r.run_id} className="flex justify-between text-sm border-b pb-1">
                    <span>Run #{r.run_number} ({r.line})</span>
                    <span className="font-medium">{r.oee.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No OEE data available</p>
            )}
          </CardContent>
        </Card>

        {/* Downtime */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-red-600" /> Downtime Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {downtimeData?.breakdowns?.length ? (
              <div className="space-y-2">
                {downtimeData.breakdowns.slice(0, 5).map((b, i) => (
                  <div key={i} className="flex justify-between text-sm border-b pb-1">
                    <span>{b.reason}</span>
                    <span className="font-medium text-red-600">{b.total_minutes} min ({b.count}x)</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-1">Total: {downtimeData.total_minutes} min across {downtimeData.total_count} incidents</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No downtime data</p>
            )}
          </CardContent>
        </Card>

        {/* Waste */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-orange-600" /> Waste Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {wasteData?.by_material?.length ? (
              <div className="space-y-2">
                {wasteData.by_material.slice(0, 5).map((w, i) => (
                  <div key={i} className="flex justify-between text-sm border-b pb-1">
                    <span>{w.material_name}</span>
                    <span className="font-medium">{w.total_waste} {w.uom}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-1">Total logs: {wasteData.total_waste_logs}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No waste data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ReportsPage;
