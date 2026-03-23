import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui';
import { DateRangePicker } from '@/modules/gate/components';

import { useOEETrendReport } from '../api';
import type { AnalyticsParams } from '../types';

function OEETrendReportPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const params = useMemo<AnalyticsParams>(() => ({ date_from: dateRange.from, date_to: dateRange.to }), [dateRange]);
  const [groupBy, setGroupBy] = useState('daily');
  const { data, isLoading } = useOEETrendReport({ ...params, group_by: groupBy });

  const oeeColor = (v: number) =>
    v >= 85 ? 'text-green-600' : v >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title="OEE Trend Report"
        description="Overall Equipment Effectiveness over time with drill-down by line"
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <DateRangePicker
              date={dateRangeAsDateObjects}
              onDateChange={(d) => {
                if (d && 'from' in d) setDateRange(d);
              }}
            />
            <div>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="p-8 animate-pulse bg-muted/50" /></Card>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Overall Avg OEE</p>
                <p className={`text-3xl font-bold ${oeeColor(data.summary.avg_oee)}`}>{data.summary.avg_oee}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Runs</p>
                <p className="text-3xl font-bold">{data.summary.total_runs}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Periods Tracked</p>
                <p className="text-3xl font-bold">{data.trend.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Trend Table */}
          {data.trend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" /> OEE Trend ({groupBy})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Period</th>
                        <th className="text-right p-2 font-medium">Runs</th>
                        <th className="text-right p-2 font-medium">Availability %</th>
                        <th className="text-right p-2 font-medium">Performance %</th>
                        <th className="text-right p-2 font-medium">Quality %</th>
                        <th className="text-right p-2 font-medium">OEE %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.trend.map((t) => (
                        <tr key={t.period} className="border-b hover:bg-muted/30">
                          <td className="p-2 font-medium">{t.period}</td>
                          <td className="p-2 text-right">{t.run_count}</td>
                          <td className="p-2 text-right">{t.avg_availability}%</td>
                          <td className="p-2 text-right">{t.avg_performance}%</td>
                          <td className="p-2 text-right">{t.avg_quality}%</td>
                          <td className={`p-2 text-right font-bold ${oeeColor(t.avg_oee)}`}>{t.avg_oee}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* By Line Comparison */}
          {data.by_line.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>OEE by Production Line</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Line</th>
                        <th className="text-right p-2 font-medium">Runs</th>
                        <th className="text-right p-2 font-medium">Min OEE</th>
                        <th className="text-right p-2 font-medium">Avg OEE</th>
                        <th className="text-right p-2 font-medium">Max OEE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_line.map((l) => (
                        <tr key={l.line} className="border-b hover:bg-muted/30">
                          <td className="p-2 font-medium">{l.line}</td>
                          <td className="p-2 text-right">{l.run_count}</td>
                          <td className="p-2 text-right text-red-600">{l.min_oee}%</td>
                          <td className={`p-2 text-right font-bold ${oeeColor(l.avg_oee)}`}>{l.avg_oee}%</td>
                          <td className="p-2 text-right text-green-600">{l.max_oee}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-Run Detail */}
          {data.per_run.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Per-Run OEE Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Run #</th>
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-left p-2 font-medium">Line</th>
                        <th className="text-right p-2 font-medium">Avail.</th>
                        <th className="text-right p-2 font-medium">Perf.</th>
                        <th className="text-right p-2 font-medium">Quality</th>
                        <th className="text-right p-2 font-medium">OEE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.per_run.map((r) => (
                        <tr key={r.run_id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/production/execution/runs/${r.run_id}`)}>
                          <td className="p-2 font-medium">#{r.run_number}</td>
                          <td className="p-2">{r.date}</td>
                          <td className="p-2">{r.line}</td>
                          <td className="p-2 text-right">{r.availability}%</td>
                          <td className="p-2 text-right">{r.performance}%</td>
                          <td className="p-2 text-right">{r.quality}%</td>
                          <td className={`p-2 text-right font-bold ${oeeColor(r.oee)}`}>{r.oee}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

export default OEETrendReportPage;
