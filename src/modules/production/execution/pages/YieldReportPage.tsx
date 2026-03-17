import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { useMaterials, useRunDetail } from '../api';
import { MaterialConsumptionTable } from '../components/MaterialConsumptionTable';
import { ProductionStatusBadge } from '../components/ProductionStatusBadge';

function YieldReportPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const numRunId = Number(runId);

  const { data: run } = useRunDetail(numRunId || null);
  const { data: materials = [] } = useMaterials(numRunId);

  const totalWastage = materials.reduce((sum, m) => sum + parseFloat(m.wastage_qty || '0'), 0);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title={`Yield Report — Run #${run?.run_number || ''}`}
        description={run ? `${run.date} · ${run.line_name} · ${run.brand} - ${run.pack}` : ''}
      />

      {run && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1"><ProductionStatusBadge status={run.status} /></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Production</p>
              <p className="text-2xl font-bold">{run.total_production} cases</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Wastage</p>
              <p className="text-2xl font-bold text-red-600">{totalWastage.toFixed(3)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Material Consumption</CardTitle></CardHeader>
        <CardContent>
          <MaterialConsumptionTable materials={materials} readOnly />
        </CardContent>
      </Card>
    </div>
  );
}

export default YieldReportPage;
