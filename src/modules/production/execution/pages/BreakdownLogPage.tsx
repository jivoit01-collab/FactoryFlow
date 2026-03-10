import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { BreakdownTable } from '../components/BreakdownTable';
import { BreakdownTimeline } from '../components/BreakdownTimeline';
import { BreakdownFormDialog } from '../components/BreakdownFormDialog';
import { ProductionStatusBadge } from '../components/ProductionStatusBadge';
import { RunCard } from '../components/RunCard';
import {
  useRunDetail,
  useProductionRuns,
  useMachines,
  useCreateBreakdown,
  useUpdateBreakdown,
  useDeleteBreakdown,
} from '../api/execution.queries';
import type { BreakdownFormData } from '../schemas';
import type { MachineBreakdown } from '../types';

export default function BreakdownLogPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  // If no runId from URL, show run selection view
  if (!runId) {
    return <BreakdownRunSelector />;
  }

  return <BreakdownRunDetail runId={Number(runId)} />;
}

/** Standalone view: pick a run to view breakdowns */
function BreakdownRunSelector() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const { data: runs = [], isLoading } = useProductionRuns({ date: today });

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Breakdown Log"
        description="Select a production run to view or add breakdowns"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-5 bg-muted rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">No production runs today</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start a production run first to log breakdowns.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Today's runs — click a run to manage its breakdowns
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {runs.map((run) => (
              <Card
                key={run.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() => navigate(`/production/execution/runs/${run.id}/breakdowns`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      Run #{run.run_number}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {run.line_name}
                    </Badge>
                    <ProductionStatusBadge status={run.status} />
                  </div>
                  <h4 className="font-semibold">
                    {run.brand || run.plan_item_name || 'Production Run'}
                    {run.pack && <span className="text-muted-foreground font-normal"> — {run.pack}</span>}
                  </h4>
                  {run.total_breakdown_time > 0 && (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {run.total_breakdown_time} min breakdown
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Run-specific breakdown detail view */
function BreakdownRunDetail({ runId }: { runId: number }) {
  const navigate = useNavigate();

  const { data: run, isLoading, isError } = useRunDetail(runId || null);
  const { data: machines = [] } = useMachines(run?.line);
  const createBreakdown = useCreateBreakdown(runId);
  const updateBreakdown = useUpdateBreakdown(runId);
  const deleteBreakdown = useDeleteBreakdown(runId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBreakdown, setEditingBreakdown] = useState<MachineBreakdown | null>(null);

  const isCompleted = run?.status === 'COMPLETED';
  const breakdowns = run?.breakdowns ?? [];

  const totalMin = breakdowns.reduce((sum, b) => sum + b.breakdown_minutes, 0);
  const lineMin = breakdowns.filter((b) => b.type === 'LINE').reduce((sum, b) => sum + b.breakdown_minutes, 0);
  const externalMin = breakdowns.filter((b) => b.type === 'EXTERNAL').reduce((sum, b) => sum + b.breakdown_minutes, 0);

  const handleSubmitBreakdown = async (data: BreakdownFormData) => {
    try {
      if (editingBreakdown) {
        await updateBreakdown.mutateAsync({ breakdownId: editingBreakdown.id, data });
        toast.success('Breakdown updated');
      } else {
        await createBreakdown.mutateAsync(data);
        toast.success('Breakdown recorded');
      }
      setDialogOpen(false);
      setEditingBreakdown(null);
    } catch {
      toast.error('Failed to save breakdown');
    }
  };

  const handleEdit = (breakdown: MachineBreakdown) => {
    setEditingBreakdown(breakdown);
    setDialogOpen(true);
  };

  const handleDelete = async (breakdownId: number) => {
    try {
      await deleteBreakdown.mutateAsync(breakdownId);
      toast.success('Breakdown deleted');
    } catch {
      toast.error('Failed to delete breakdown');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (isError || !run) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">Run not found</h2>
        <p className="text-muted-foreground mt-1">Could not load production run data.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Breakdown Log</h1>
              <ProductionStatusBadge status={run.status} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{run.brand || run.plan_item_name}</span>
              <span>|</span>
              <Badge variant="outline" className="text-xs">{run.line_name}</Badge>
              <span>{run.date}</span>
              <span>Run #{run.run_number}</span>
            </div>
          </div>
        </div>

        {!isCompleted && (
          <Button onClick={() => { setEditingBreakdown(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Breakdown
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Breakdown</p>
            <p className="text-lg font-bold text-red-600">{totalMin} min</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Line Breakdowns</p>
            <p className="text-lg font-bold text-amber-600">{lineMin} min</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">External Breakdowns</p>
            <p className="text-lg font-bold text-gray-600 dark:text-gray-400">{externalMin} min</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {breakdowns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Breakdown Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownTimeline breakdowns={breakdowns} />
          </CardContent>
        </Card>
      )}

      {/* Breakdown Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Breakdowns
              {breakdowns.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {breakdowns.length}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <BreakdownTable
            breakdowns={breakdowns}
            disabled={isCompleted}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <BreakdownFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingBreakdown(null);
        }}
        machines={machines}
        editingBreakdown={editingBreakdown}
        onSubmit={handleSubmitBreakdown}
        isPending={createBreakdown.isPending || updateBreakdown.isPending}
      />
    </div>
  );
}
