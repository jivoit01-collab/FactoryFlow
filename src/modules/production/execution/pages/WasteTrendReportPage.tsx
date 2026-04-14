import { ArrowLeft, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge,Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { useWasteTrendReport } from '../api';
import type { AnalyticsParams } from '../types';

const APPROVAL_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PARTIALLY_APPROVED: 'bg-blue-100 text-blue-800',
  FULLY_APPROVED: 'bg-green-100 text-green-800',
};

function WasteTrendReportPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const params = useMemo<AnalyticsParams>(() => ({ date_from: dateRange.from, date_to: dateRange.to }), [dateRange]);
  const { data, isLoading } = useWasteTrendReport(params);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title="Waste & Scrap Report"
        description="Waste trending, material breakdown, and approval status analysis"
      />

      <Card>
        <CardContent className="p-4">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(d) => {
              if (d && 'from' in d) setDateRange(d);
            }}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="p-8 animate-pulse bg-muted/50" /></Card>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Waste Qty</p>
                <p className="text-2xl font-bold text-red-600">{data.summary.total_waste_qty.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Waste Logs</p>
                <p className="text-2xl font-bold">{data.summary.total_waste_logs}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Unique Materials</p>
                <p className="text-2xl font-bold">{data.summary.unique_materials}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Waste / Production</p>
                <p className="text-2xl font-bold text-orange-600">{data.summary.waste_vs_production_pct}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Approval Rate</p>
                <p className="text-2xl font-bold text-green-600">{data.summary.approval_rate}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Material */}
            {data.by_material.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-orange-600" /> Waste by Material
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th scope="col" className="text-left p-2 font-medium">Material</th>
                        <th scope="col" className="text-left p-2 font-medium">UoM</th>
                        <th scope="col" className="text-right p-2 font-medium">Total Qty</th>
                        <th scope="col" className="text-right p-2 font-medium">Logs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_material.map((m, i) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="p-2 font-medium">{m.material_name}</td>
                          <td className="p-2">{m.uom}</td>
                          <td className="p-2 text-right text-red-600 font-medium">{m.total_qty.toLocaleString()}</td>
                          <td className="p-2 text-right">{m.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* By Reason */}
            {data.by_reason.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Waste by Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th scope="col" className="text-left p-2 font-medium">Reason</th>
                        <th scope="col" className="text-right p-2 font-medium">Total Qty</th>
                        <th scope="col" className="text-right p-2 font-medium">Incidents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_reason.map((r, i) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="p-2">{r.reason}</td>
                          <td className="p-2 text-right text-red-600 font-medium">{r.total_qty.toLocaleString()}</td>
                          <td className="p-2 text-right">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Trend */}
            {data.trend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Daily Waste Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b bg-muted/50">
                          <th scope="col" className="text-left p-2 font-medium">Date</th>
                          <th scope="col" className="text-right p-2 font-medium">Waste Qty</th>
                          <th scope="col" className="text-right p-2 font-medium">Logs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.trend.map((t) => (
                          <tr key={t.date} className="border-b hover:bg-muted/30">
                            <td className="p-2">{t.date}</td>
                            <td className="p-2 text-right text-red-600">{t.total_qty.toLocaleString()}</td>
                            <td className="p-2 text-right">{t.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* By Approval Status */}
            {data.by_approval_status.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Approval Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.by_approval_status.map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <Badge variant="outline" className={APPROVAL_COLORS[s.status] || ''}>
                          {s.status.replace(/_/g, ' ')}
                        </Badge>
                        <div className="text-right">
                          <span className="font-medium">{s.count} logs</span>
                          <span className="text-muted-foreground ml-2">({s.total_qty.toLocaleString()} qty)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default WasteTrendReportPage;
