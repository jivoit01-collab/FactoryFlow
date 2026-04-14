import { ArrowLeft, Droplets, Flame, Trash2,Users, Wind, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { useResourceConsumptionReport } from '../api';
import type { AnalyticsParams } from '../types';

function ResourceConsumptionReportPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const params = useMemo<AnalyticsParams>(() => ({ date_from: dateRange.from, date_to: dateRange.to }), [dateRange]);
  const { data, isLoading } = useResourceConsumptionReport(params);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title="Day-wise Resource Consumption"
        description="Daily breakdown of electricity, water, gas, labour, and waste"
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
                <p className="text-sm text-muted-foreground">Total Production</p>
                <p className="text-2xl font-bold">{data.summary.total_production.toLocaleString()} cases</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Resource Cost</p>
                <p className="text-2xl font-bold text-blue-600">{data.summary.grand_total_cost.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Avg Cost / Case</p>
                <p className="text-2xl font-bold text-orange-600">{data.summary.avg_cost_per_case.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Days Covered</p>
                <p className="text-2xl font-bold">{data.summary.total_days}</p>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          {data.daily_data.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Daily Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th scope="col" className="text-left p-2 font-medium">Date</th>
                        <th scope="col" className="text-right p-2 font-medium">Production</th>
                        <th scope="col" className="text-right p-2 font-medium"><span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" /> Elec. (units)</span></th>
                        <th scope="col" className="text-right p-2 font-medium"><span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" /> Elec. Cost</span></th>
                        <th scope="col" className="text-right p-2 font-medium"><span className="inline-flex items-center gap-1"><Droplets className="h-3 w-3" /> Water (L)</span></th>
                        <th scope="col" className="text-right p-2 font-medium"><span className="inline-flex items-center gap-1"><Droplets className="h-3 w-3" /> Water Cost</span></th>
                        <th scope="col" className="text-right p-2 font-medium"><span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> Gas</span></th>
                        <th scope="col" className="text-right p-2 font-medium"><span className="inline-flex items-center gap-1"><Wind className="h-3 w-3" /> Air</span></th>
                        <th scope="col" className="text-right p-2 font-medium"><span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> Labour</span></th>
                        <th scope="col" className="text-right p-2 font-medium"><span className="inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Waste</span></th>
                        <th scope="col" className="text-right p-2 font-medium">Total Cost</th>
                        <th scope="col" className="text-right p-2 font-medium">Cost/Case</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.daily_data.map((d) => (
                        <tr key={d.date} className="border-b hover:bg-muted/30">
                          <td className="p-2 font-medium">{d.date}</td>
                          <td className="p-2 text-right">{d.total_production.toLocaleString()}</td>
                          <td className="p-2 text-right">{d.electricity_units}</td>
                          <td className="p-2 text-right">{d.electricity_cost.toLocaleString()}</td>
                          <td className="p-2 text-right">{d.water_volume}</td>
                          <td className="p-2 text-right">{d.water_cost.toLocaleString()}</td>
                          <td className="p-2 text-right">{d.gas_cost.toLocaleString()}</td>
                          <td className="p-2 text-right">{d.compressed_air_cost.toLocaleString()}</td>
                          <td className="p-2 text-right">{d.labour_cost.toLocaleString()}</td>
                          <td className="p-2 text-right">{d.waste_qty}</td>
                          <td className="p-2 text-right font-medium">{d.total_resource_cost.toLocaleString()}</td>
                          <td className="p-2 text-right font-medium">{d.cost_per_case.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No data for the selected period.
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

export default ResourceConsumptionReportPage;
