import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui';

import { useMonthlySummaryReport } from '../api';

function MonthlySummaryReportPage() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useMonthlySummaryReport(year);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title="Monthly Summary Report"
        description="Month-wise rollup of production KPIs for the year"
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="p-8 animate-pulse bg-muted/50" /></Card>
      ) : data ? (
        <>
          {/* Annual Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Runs</p>
                <p className="text-2xl font-bold">{data.annual_summary.total_runs}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Production</p>
                <p className="text-2xl font-bold">{data.annual_summary.total_production.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Avg OEE</p>
                <p className="text-2xl font-bold text-blue-600">{data.annual_summary.avg_oee}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold text-orange-600">{data.annual_summary.grand_total_cost.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown — {year}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Month</th>
                      <th className="text-right p-2 font-medium">Runs</th>
                      <th className="text-right p-2 font-medium">Production</th>
                      <th className="text-right p-2 font-medium">OEE %</th>
                      <th className="text-right p-2 font-medium">Total Cost</th>
                      <th className="text-right p-2 font-medium">Cost/Unit</th>
                      <th className="text-right p-2 font-medium">Waste</th>
                      <th className="text-right p-2 font-medium">Electricity</th>
                      <th className="text-right p-2 font-medium">Water</th>
                      <th className="text-right p-2 font-medium">Labour</th>
                      <th className="text-right p-2 font-medium">Breakdown (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.months.map((m) => (
                      <tr
                        key={m.month}
                        className={`border-b ${m.total_runs > 0 ? 'hover:bg-muted/30' : 'text-muted-foreground'}`}
                      >
                        <td className="p-2 font-medium">{m.month_name}</td>
                        <td className="p-2 text-right">{m.total_runs}</td>
                        <td className="p-2 text-right">{m.total_production.toLocaleString()}</td>
                        <td className="p-2 text-right">
                          <span className={m.avg_oee >= 85 ? 'text-green-600' : m.avg_oee >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                            {m.avg_oee}%
                          </span>
                        </td>
                        <td className="p-2 text-right">{m.total_cost.toLocaleString()}</td>
                        <td className="p-2 text-right">{m.cost_per_unit.toFixed(2)}</td>
                        <td className="p-2 text-right">{m.total_waste}</td>
                        <td className="p-2 text-right">{m.electricity_cost.toLocaleString()}</td>
                        <td className="p-2 text-right">{m.water_cost.toLocaleString()}</td>
                        <td className="p-2 text-right">{m.labour_cost.toLocaleString()}</td>
                        <td className="p-2 text-right text-red-600">{m.total_breakdown_minutes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

export default MonthlySummaryReportPage;
