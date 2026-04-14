import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { useBreakdowns, useRuns } from '../api';
import { BreakdownTable } from '../components/BreakdownTable';

function BreakdownLogPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const numRunId = runId ? Number(runId) : 0;

  // If we have a runId, show breakdowns for that run; otherwise show recent runs with breakdowns
  const { data: breakdowns = [], isLoading: loadingBreakdowns } = useBreakdowns(numRunId);
  const { data: runs = [], isLoading: loadingRuns } = useRuns();

  if (runId) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <DashboardHeader title={`Breakdowns — Run #${runId}`} />
        <Card>
          <CardContent className="p-4">
            {loadingBreakdowns ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <BreakdownTable breakdowns={breakdowns} readOnly />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Breakdown Logs"
        description="Machine breakdown history across all runs"
      />
      {loadingRuns ? (
        <Card><CardContent className="p-8 animate-pulse bg-muted/50" /></Card>
      ) : runs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th scope="col" className="text-left p-3 font-medium">Run</th>
                <th scope="col" className="text-left p-3 font-medium">Date</th>
                <th scope="col" className="text-left p-3 font-medium">Line</th>
                <th scope="col" className="text-right p-3 font-medium">Breakdown (min)</th>
                <th scope="col" className="text-left p-3 font-medium">Brand</th>
              </tr>
            </thead>
            <tbody>
              {runs.filter((r) => r.total_breakdown_time > 0).map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/production/execution/runs/${r.id}/breakdowns`)}>
                  <td className="p-3 font-medium">#{r.run_number}</td>
                  <td className="p-3">{r.date}</td>
                  <td className="p-3">{r.line_name}</td>
                  <td className="p-3 text-right text-red-600 font-medium">{r.total_breakdown_time}</td>
                  <td className="p-3">{r.product}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No breakdown data available.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BreakdownLogPage;
