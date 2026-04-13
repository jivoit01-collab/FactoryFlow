import { ArrowLeft, DollarSign } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { useCostAnalysisReport } from '../api';
import type { AnalyticsParams } from '../types';

const COST_LABELS: Record<string, string> = {
  raw_material: 'Raw Material',
  labour: 'Labour',
  machine: 'Machine',
  electricity: 'Electricity',
  water: 'Water',
  gas: 'Gas',
  compressed_air: 'Compressed Air',
  overhead: 'Overhead',
};

const COST_COLORS: Record<string, string> = {
  raw_material: 'bg-blue-500',
  labour: 'bg-green-500',
  machine: 'bg-yellow-500',
  electricity: 'bg-orange-500',
  water: 'bg-cyan-500',
  gas: 'bg-red-500',
  compressed_air: 'bg-purple-500',
  overhead: 'bg-gray-500',
};

function CostAnalysisReportPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const params = useMemo<AnalyticsParams>(() => ({ date_from: dateRange.from, date_to: dateRange.to }), [dateRange]);
  const { data, isLoading } = useCostAnalysisReport(params);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title="Cost Analysis Report"
        description="Multi-dimensional cost breakdown, trends, and line comparison"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">{data.summary.total_cost.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Avg Cost / Unit</p>
                <p className="text-2xl font-bold text-blue-600">{data.summary.avg_per_unit.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Production</p>
                <p className="text-2xl font-bold">{data.summary.total_production.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Runs Analyzed</p>
                <p className="text-2xl font-bold">{data.summary.run_count}</p>
              </CardContent>
            </Card>
          </div>

          {/* Cost Distribution */}
          {Object.keys(data.cost_distribution).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" /> Cost Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Stacked bar */}
                <div className="flex h-8 rounded-lg overflow-hidden mb-4">
                  {Object.entries(data.cost_distribution)
                    .filter(([, v]) => v.percentage > 0)
                    .sort(([, a], [, b]) => b.percentage - a.percentage)
                    .map(([key, val]) => (
                      <div
                        key={key}
                        className={`${COST_COLORS[key]} relative group`}
                        style={{ width: `${val.percentage}%` }}
                        title={`${COST_LABELS[key]}: ${val.percentage}%`}
                      />
                    ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(data.cost_distribution)
                    .sort(([, a], [, b]) => b.amount - a.amount)
                    .map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <div className={`w-3 h-3 rounded-full ${COST_COLORS[key]}`} />
                        <span className="text-muted-foreground">{COST_LABELS[key]}</span>
                        <span className="ml-auto font-medium">{val.percentage}%</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Line */}
            {data.by_line.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost by Production Line</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Line</th>
                        <th className="text-right p-2 font-medium">Runs</th>
                        <th className="text-right p-2 font-medium">Production</th>
                        <th className="text-right p-2 font-medium">Total Cost</th>
                        <th className="text-right p-2 font-medium">Avg/Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_line.map((l) => (
                        <tr key={l.line} className="border-b hover:bg-muted/30">
                          <td className="p-2 font-medium">{l.line}</td>
                          <td className="p-2 text-right">{l.run_count}</td>
                          <td className="p-2 text-right">{l.production.toLocaleString()}</td>
                          <td className="p-2 text-right">{l.total_cost.toLocaleString()}</td>
                          <td className="p-2 text-right font-medium">{l.avg_per_unit.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Cost Trend */}
            {data.trend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Daily Cost Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">Date</th>
                          <th className="text-right p-2 font-medium">Runs</th>
                          <th className="text-right p-2 font-medium">Production</th>
                          <th className="text-right p-2 font-medium">Total Cost</th>
                          <th className="text-right p-2 font-medium">Cost/Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.trend.map((t) => (
                          <tr key={t.date} className="border-b hover:bg-muted/30">
                            <td className="p-2">{t.date}</td>
                            <td className="p-2 text-right">{t.run_count}</td>
                            <td className="p-2 text-right">{t.production.toLocaleString()}</td>
                            <td className="p-2 text-right">{t.total_cost.toLocaleString()}</td>
                            <td className="p-2 text-right font-medium">{t.per_unit_cost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Per-Run Detail */}
          {data.per_run.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Per-Run Cost Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Run #</th>
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-left p-2 font-medium">Line</th>
                        <th className="text-left p-2 font-medium">Product</th>
                        <th className="text-right p-2 font-medium">Qty</th>
                        <th className="text-right p-2 font-medium">Material</th>
                        <th className="text-right p-2 font-medium">Labour</th>
                        <th className="text-right p-2 font-medium">Utilities</th>
                        <th className="text-right p-2 font-medium">Total</th>
                        <th className="text-right p-2 font-medium">Per Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.per_run.map((r) => (
                        <tr key={r.run_id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/production/execution/runs/${r.run_id}`)}>
                          <td className="p-2 font-medium">#{r.run_number}</td>
                          <td className="p-2">{r.date}</td>
                          <td className="p-2">{r.line}</td>
                          <td className="p-2">{r.product}</td>
                          <td className="p-2 text-right">{r.produced_qty.toLocaleString()}</td>
                          <td className="p-2 text-right">{r.raw_material_cost.toLocaleString()}</td>
                          <td className="p-2 text-right">{r.labour_cost.toLocaleString()}</td>
                          <td className="p-2 text-right">{(r.electricity_cost + r.water_cost + r.gas_cost + r.compressed_air_cost).toLocaleString()}</td>
                          <td className="p-2 text-right font-medium">{r.total_cost.toLocaleString()}</td>
                          <td className="p-2 text-right font-medium">{r.per_unit_cost.toFixed(2)}</td>
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

export default CostAnalysisReportPage;
