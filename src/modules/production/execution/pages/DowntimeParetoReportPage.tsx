import { AlertTriangle,ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { useDowntimeParetoReport } from '../api';
import type { AnalyticsParams } from '../types';

function DowntimeParetoReportPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const params = useMemo<AnalyticsParams>(() => ({ date_from: dateRange.from, date_to: dateRange.to }), [dateRange]);
  const { data, isLoading } = useDowntimeParetoReport(params);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title="Downtime Pareto Analysis"
        description="Breakdown causes ranked by impact with MTBF/MTTR metrics"
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
                <p className="text-sm text-muted-foreground">Total Breakdowns</p>
                <p className="text-2xl font-bold text-red-600">{data.summary.total_breakdowns}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Downtime</p>
                <p className="text-2xl font-bold text-red-600">{data.summary.total_breakdown_minutes} min</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Running</p>
                <p className="text-2xl font-bold text-green-600">{data.summary.total_running_minutes} min</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">MTBF</p>
                <p className="text-2xl font-bold">{data.summary.mtbf_minutes} min</p>
                <p className="text-xs text-muted-foreground">Mean Time Between Failures</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">MTTR</p>
                <p className="text-2xl font-bold">{data.summary.mttr_minutes} min</p>
                <p className="text-xs text-muted-foreground">Mean Time To Repair</p>
              </CardContent>
            </Card>
          </div>

          {/* Pareto Table */}
          {data.pareto.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" /> Pareto Analysis (by Category)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th scope="col" className="text-left p-2 font-medium">Category</th>
                      <th scope="col" className="text-right p-2 font-medium">Incidents</th>
                      <th scope="col" className="text-right p-2 font-medium">Total Minutes</th>
                      <th scope="col" className="text-right p-2 font-medium">% of Total</th>
                      <th scope="col" className="text-right p-2 font-medium">Cumulative %</th>
                      <th scope="col" className="text-left p-2 font-medium w-[200px]">Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pareto.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-medium">{p.category}</td>
                        <td className="p-2 text-right">{p.count}</td>
                        <td className="p-2 text-right text-red-600 font-medium">{p.total_minutes}</td>
                        <td className="p-2 text-right">{p.percentage}%</td>
                        <td className="p-2 text-right font-medium">{p.cumulative_pct}%</td>
                        <td className="p-2">
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${p.cumulative_pct <= 80 ? 'bg-red-500' : 'bg-yellow-500'}`}
                              style={{ width: `${p.percentage}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Machine */}
            {data.by_machine.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Breakdowns by Machine</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th scope="col" className="text-left p-2 font-medium">Machine</th>
                        <th scope="col" className="text-right p-2 font-medium">Incidents</th>
                        <th scope="col" className="text-right p-2 font-medium">Total Minutes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_machine.map((m, i) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="p-2 font-medium">{m.machine}</td>
                          <td className="p-2 text-right">{m.count}</td>
                          <td className="p-2 text-right text-red-600">{m.total_minutes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Daily Trend */}
            {data.trend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Daily Downtime Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b bg-muted/50">
                          <th scope="col" className="text-left p-2 font-medium">Date</th>
                          <th scope="col" className="text-right p-2 font-medium">Incidents</th>
                          <th scope="col" className="text-right p-2 font-medium">Minutes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.trend.map((t) => (
                          <tr key={t.date} className="border-b hover:bg-muted/30">
                            <td className="p-2">{t.date}</td>
                            <td className="p-2 text-right">{t.count}</td>
                            <td className="p-2 text-right text-red-600">{t.total_minutes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default DowntimeParetoReportPage;
