import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DateRangePicker } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { useDailyProductionReport } from '../api';
import { ProductionStatusBadge } from '../components/ProductionStatusBadge';

function DailyProductionReportPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => new Date());
  const dateStr = useMemo(() => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [date]);
  const { data: runs, isLoading } = useDailyProductionReport(dateStr);

  const totalProduction = useMemo(
    () => runs?.reduce((sum, r) => sum + (Number(r.total_production) || 0), 0) ?? 0,
    [runs],
  );
  const totalBreakdown = useMemo(
    () => runs?.reduce((sum, r) => sum + (r.total_breakdown_time || 0), 0) ?? 0,
    [runs],
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader title="Daily Production Report" />

      <Card>
        <CardContent className="p-4">
          <DateRangePicker
            mode="single"
            date={date}
            onDateChange={(d) => {
              if (d instanceof Date) setDate(d);
            }}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="p-8 animate-pulse bg-muted/50" /></Card>
      ) : runs ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Production</p>
                <p className="text-3xl font-bold">{totalProduction.toLocaleString()} cases</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Breakdown</p>
                <p className="text-3xl font-bold text-red-600">{totalBreakdown} min</p>
              </CardContent>
            </Card>
          </div>

          {runs.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Runs ({runs.length})</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th scope="col" className="text-left p-2 font-medium">Run #</th>
                      <th scope="col" className="text-left p-2 font-medium">Line</th>
                      <th scope="col" className="text-left p-2 font-medium">Brand</th>
                      <th scope="col" className="text-right p-2 font-medium">Production</th>
                      <th scope="col" className="text-right p-2 font-medium">Breakdown</th>
                      <th scope="col" className="text-left p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/production/execution/runs/${r.id}`)}>
                        <td className="p-2 font-medium">#{r.run_number}</td>
                        <td className="p-2">{r.line_name}</td>
                        <td className="p-2">{r.product}</td>
                        <td className="p-2 text-right">{r.total_production}</td>
                        <td className="p-2 text-right text-red-600">{r.total_breakdown_time}</td>
                        <td className="p-2"><ProductionStatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No production runs for this date.
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

export default DailyProductionReportPage;
