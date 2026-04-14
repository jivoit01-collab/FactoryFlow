import { ArrowLeft, Target } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge,Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { usePlanVsProductionReport } from '../api';
import type { AnalyticsParams } from '../types';

const STATUS_COLORS: Record<string, string> = {
  on_track: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  behind: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  exceeded: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

function PlanVsProductionReportPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const params = useMemo<AnalyticsParams>(() => ({ date_from: dateRange.from, date_to: dateRange.to }), [dateRange]);
  const { data, isLoading } = usePlanVsProductionReport(params);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title="Plan vs Production"
        description="Compare SAP planned quantities against actual production output"
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
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{data.summary.total_orders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Avg Achievement</p>
                <p className={`text-2xl font-bold ${data.summary.avg_achievement_pct >= 95 ? 'text-green-600' : data.summary.avg_achievement_pct >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {data.summary.avg_achievement_pct}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Planned</p>
                <p className="text-2xl font-bold">{data.summary.total_planned.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Actual</p>
                <p className="text-2xl font-bold">{data.summary.total_actual.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          {data.items.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" /> Production Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th scope="col" className="text-left p-2 font-medium">SAP Order</th>
                        <th scope="col" className="text-left p-2 font-medium">Item Code</th>
                        <th scope="col" className="text-left p-2 font-medium">Product</th>
                        <th scope="col" className="text-right p-2 font-medium">Planned</th>
                        <th scope="col" className="text-right p-2 font-medium">Actual</th>
                        <th scope="col" className="text-right p-2 font-medium">Variance</th>
                        <th scope="col" className="text-right p-2 font-medium">Achievement</th>
                        <th scope="col" className="text-center p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item) => (
                        <tr key={item.sap_doc_entry} className="border-b hover:bg-muted/30">
                          <td className="p-2 font-medium">{item.sap_doc_num || item.sap_doc_entry}</td>
                          <td className="p-2">{item.item_code}</td>
                          <td className="p-2">{item.product_name}</td>
                          <td className="p-2 text-right">{item.planned_qty.toLocaleString()}</td>
                          <td className="p-2 text-right">{item.actual_production.toLocaleString()}</td>
                          <td className={`p-2 text-right font-medium ${item.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.variance >= 0 ? '+' : ''}{item.variance.toLocaleString()}
                          </td>
                          <td className="p-2 text-right">
                            <span className={item.achievement_pct >= 95 ? 'text-green-600 font-medium' : item.achievement_pct >= 80 ? 'text-yellow-600' : 'text-red-600 font-medium'}>
                              {item.achievement_pct}%
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant="outline" className={STATUS_COLORS[item.status]}>
                              {item.status === 'on_track' ? 'On Track' : item.status === 'behind' ? 'Behind' : 'Exceeded'}
                            </Badge>
                          </td>
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
                No production orders with SAP links found for the selected period.
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

export default PlanVsProductionReportPage;
