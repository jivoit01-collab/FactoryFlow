import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { useRunCost, useRunDetail } from '../api';
import { CostBreakdownCard } from '../components/CostBreakdownCard';

/**
 * Read-only run cost view (confidential — gated by VIEW_RUN_COST). Costs are
 * derived automatically from the Cost Master rates + BOM snapshot + running
 * hours / produced cases. Metered electricity units are entered on the
 * separate Electricity page (data-entry staff don't see this page).
 */
function ResourceTrackingPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const numRunId = Number(runId);

  const { data: run } = useRunDetail(numRunId || null);
  const { data: cost } = useRunCost(numRunId);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title={`Run Cost — Run #${run?.run_number || ''}`}
        description={run ? `${run.date} · ${run.line_name} · ${run.product}` : ''}
      />

      <CostBreakdownCard cost={cost} />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-sm text-muted-foreground">
          <span>
            Costs are computed automatically — electricity units come from the run&apos;s
            Electricity page. To change rates, edit:
          </span>
          <Link
            to="/admin/cost-master"
            className="inline-flex items-center gap-1 text-primary underline"
          >
            <SlidersHorizontal className="h-4 w-4" /> Cost Master (rates)
          </Link>
          <Link to="/production/execution/line-management" className="text-primary underline">
            Line Management (operating profile)
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default ResourceTrackingPage;
