import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Save } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { ProductionStatusBadge } from '../components/ProductionStatusBadge';
import { RunSummaryCards } from '../components/RunSummaryCards';
import { HourlyProductionGrid } from '../components/HourlyProductionGrid';
import { ManpowerSection } from '../components/ManpowerSection';
import { ClearanceAuthorizationSection } from '../components/ClearanceAuthorizationSection';
import {
  useRunDetail,
  useUpdateRun,
  useCompleteRun,
  useCreateLogs,
  useCreateManpower,
  useUpdateManpower,
} from '../api/execution.queries';
import type { CreateLogRequest, CreateManpowerRequest } from '../types';

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const id = Number(runId);

  const { data: run, isLoading, isError } = useRunDetail(id || null);
  const updateRun = useUpdateRun(id);
  const completeRun = useCompleteRun(id);
  const createLogs = useCreateLogs(id);
  const createManpower = useCreateManpower(id);
  const updateManpower = useUpdateManpower(id);

  const [pendingLogs, setPendingLogs] = useState<CreateLogRequest[] | null>(null);
  const [supervisorSign, setSupervisorSign] = useState('');
  const [inchargeSign, setInchargeSign] = useState('');

  const isCompleted = run?.status === 'COMPLETED';
  const disabled = isCompleted;

  const handleLogsChange = useCallback((logs: CreateLogRequest[]) => {
    setPendingLogs(logs);
  }, []);

  const handleSave = async () => {
    try {
      if (pendingLogs) {
        await createLogs.mutateAsync(pendingLogs);
        setPendingLogs(null);
      }
      toast.success('Production data saved');
    } catch {
      toast.error('Failed to save production data');
    }
  };

  const handleComplete = async () => {
    try {
      if (pendingLogs) {
        await createLogs.mutateAsync(pendingLogs);
        setPendingLogs(null);
      }
      await completeRun.mutateAsync();
      toast.success('Production run completed');
    } catch {
      toast.error('Failed to complete production run');
    }
  };

  const handleAddManpower = async (data: CreateManpowerRequest) => {
    try {
      await createManpower.mutateAsync(data);
      toast.success('Manpower entry added');
    } catch {
      toast.error('Failed to add manpower');
    }
  };

  const handleUpdateManpower = async (
    manpowerId: number,
    data: Partial<CreateManpowerRequest>,
  ) => {
    try {
      await updateManpower.mutateAsync({ manpowerId, data });
    } catch {
      toast.error('Failed to update manpower');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (isError || !run) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">Run not found</h2>
        <p className="text-muted-foreground mt-1">The production run could not be loaded.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const totalProduction = run.total_production;
  const breakdownMinutes = run.total_breakdown_time;
  const ratedSpeed = Number(run.rated_speed) || 0;
  const efficiency =
    ratedSpeed > 0 ? (totalProduction / (ratedSpeed * 12)) * 100 : 0;
  const speed =
    run.logs.length > 0
      ? Math.round(totalProduction / run.logs.filter((l) => l.produced_cases > 0).length || 1)
      : 0;

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
              <h1 className="text-2xl font-bold">
                {run.brand || run.plan_item_name || 'Production Run'}
              </h1>
              <ProductionStatusBadge status={run.status} />
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="secondary">Run #{run.run_number}</Badge>
              <Badge variant="outline">{run.line_name}</Badge>
              {run.pack && <span className="text-sm text-muted-foreground">{run.pack}</span>}
              {run.sap_order_no && (
                <span className="text-sm text-muted-foreground">
                  SAP: {run.sap_order_no}
                </span>
              )}
              <span className="text-sm text-muted-foreground">{run.date}</span>
            </div>
          </div>
        </div>

        {!isCompleted && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={createLogs.isPending || !pendingLogs}
            >
              <Save className="h-4 w-4 mr-2" />
              {createLogs.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={handleComplete} disabled={completeRun.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {completeRun.isPending ? 'Completing...' : 'Complete Run'}
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <RunSummaryCards
        totalProduction={totalProduction}
        breakdownMinutes={breakdownMinutes}
        efficiency={Math.min(efficiency, 100)}
        speed={speed}
      />

      {/* Rated Speed (editable) */}
      {!isCompleted && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label className="text-sm whitespace-nowrap">Rated Speed (cases/hr):</Label>
              <Input
                type="number"
                min={0}
                value={ratedSpeed || ''}
                placeholder="e.g., 500"
                className="h-8 w-32 text-sm"
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  if (val >= 0) {
                    updateRun.mutate({ rated_speed: val });
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hourly Production Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hourly Production Log</CardTitle>
        </CardHeader>
        <CardContent>
          <HourlyProductionGrid
            logs={run.logs}
            disabled={disabled}
            onLogsChange={handleLogsChange}
          />
        </CardContent>
      </Card>

      {/* Manpower */}
      <ManpowerSection
        manpower={run.manpower}
        disabled={disabled}
        onAdd={handleAddManpower}
        onUpdate={handleUpdateManpower}
      />

      {/* Authorization */}
      <ClearanceAuthorizationSection
        supervisorSign={supervisorSign}
        inchargeSign={inchargeSign}
        qaApproved={false}
        qaApprovedBy={null}
        qaApprovedAt={null}
        disabled={disabled}
        onSupervisorChange={setSupervisorSign}
        onInchargeChange={setInchargeSign}
      />
    </div>
  );
}
