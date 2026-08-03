import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button } from '@/shared/components/ui';

import { useRunDetail } from '../api';
import { ElectricityUsageCard } from '../components/ElectricityUsageCard';

/**
 * Standalone electricity-units entry for a run, kept separate from the
 * confidential Run Cost page so data-entry staff can record meter/bill units
 * without seeing any cost figures. Stays editable after the run completes.
 */
function ElectricityUsagePage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const numRunId = Number(runId);

  const { data: run } = useRunDetail(numRunId || null);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title={`Electricity — Run #${run?.run_number || ''}`}
        description={run ? `${run.date} · ${run.line_name} · ${run.product}` : ''}
      />

      {numRunId > 0 && <ElectricityUsageCard runId={numRunId} />}
    </div>
  );
}

export default ElectricityUsagePage;
