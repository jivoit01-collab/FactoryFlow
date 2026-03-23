import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/shared/components/ui';

import { useDailyProductionReport } from '../api';
import { ProductionStatusBadge } from '../components/ProductionStatusBadge';

function DailyProductionReportPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const { data: report, isLoading } = useDailyProductionReport(date);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader title="Daily Production Report" />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[200px]" />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="p-8 animate-pulse bg-muted/50" /></Card>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Production</p>
                <p className="text-3xl font-bold">{report.total_production} cases</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Breakdown</p>
                <p className="text-3xl font-bold text-red-600">{report.total_breakdown_time} min</p>
              </CardContent>
            </Card>
          </div>

          {report.runs?.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Runs</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Run #</th>
                      <th className="text-left p-2 font-medium">Line</th>
                      <th className="text-left p-2 font-medium">Brand</th>
                      <th className="text-right p-2 font-medium">Production</th>
                      <th className="text-right p-2 font-medium">Breakdown</th>
                      <th className="text-left p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.runs.map((r) => (
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
