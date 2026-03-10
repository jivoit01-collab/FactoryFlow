import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Package, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { ProductionStatusBadge } from '../components/ProductionStatusBadge';
import { MachineTimeTable } from '../components/MachineTimeTable';
import { MaterialConsumptionTable } from '../components/MaterialConsumptionTable';
import { BatchTabs } from '../components/BatchTabs';
import {
  useRunDetail,
  useMaterialUsage,
  useMachineRuntime,
  useCreateMachineRuntime,
  useCreateMaterialUsage,
} from '../api/execution.queries';
import type { CreateMachineRuntimeRequest, CreateMaterialUsageRequest } from '../types';

export default function YieldReportPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const id = Number(runId);

  const { data: run, isLoading: runLoading, isError } = useRunDetail(id || null);
  const { data: materials = [] } = useMaterialUsage(id || null);
  const { data: machineRuntimes = [] } = useMachineRuntime(id || null);
  const saveMachineRuntime = useCreateMachineRuntime(id);
  const saveMaterials = useCreateMaterialUsage(id);

  const [activeBatch, setActiveBatch] = useState(1);
  const [totalBatches, setTotalBatches] = useState(1);
  const [pendingRuntime, setPendingRuntime] = useState<CreateMachineRuntimeRequest[] | null>(null);
  const [pendingMaterials, setPendingMaterials] = useState<CreateMaterialUsageRequest[] | null>(
    null,
  );

  const isCompleted = run?.status === 'COMPLETED';
  const disabled = isCompleted;

  const handleSave = async () => {
    try {
      if (pendingRuntime) {
        await saveMachineRuntime.mutateAsync(pendingRuntime);
        setPendingRuntime(null);
      }
      if (pendingMaterials) {
        await saveMaterials.mutateAsync(pendingMaterials);
        setPendingMaterials(null);
      }
      toast.success('Yield data saved');
    } catch {
      toast.error('Failed to save yield data');
    }
  };

  if (runLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
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

  const totalWastage = materials.reduce((sum, m) => sum + Number(m.wastage_qty), 0);
  const totalSupply = materials.reduce(
    (sum, m) => sum + Number(m.opening_qty) + Number(m.issued_qty),
    0,
  );
  const totalMaterialLoss = totalSupply > 0 ? ((totalWastage / totalSupply) * 100).toFixed(1) : '0.0';

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
                Yield Report — {run.brand || run.plan_item_name || 'Production Run'}
              </h1>
              <ProductionStatusBadge status={run.status} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {run.line_name}
              </Badge>
              <span>Run #{run.run_number}</span>
              {run.sap_order_no && <span>SAP: {run.sap_order_no}</span>}
              <span>{run.date}</span>
            </div>
          </div>
        </div>

        {!isCompleted && (
          <Button
            onClick={handleSave}
            disabled={
              saveMachineRuntime.isPending ||
              saveMaterials.isPending ||
              (!pendingRuntime && !pendingMaterials)
            }
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMachineRuntime.isPending || saveMaterials.isPending ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Production</p>
            <p className="text-lg font-bold text-blue-600">
              {run.total_production.toLocaleString()} Cases
            </p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Wastage</p>
            <p className="text-lg font-bold text-red-600">{totalWastage.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Material Loss</p>
            <p className="text-lg font-bold text-amber-600">{totalMaterialLoss}%</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Machine Runtime</p>
            <p className="text-lg font-bold text-green-600">
              {machineRuntimes
                .reduce((sum, r) => sum + r.runtime_minutes, 0)
                .toLocaleString()}{' '}
              min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Machine Time */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Machine Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MachineTimeTable
            runtimes={machineRuntimes}
            disabled={disabled}
            onSave={(data) => setPendingRuntime(data)}
          />
        </CardContent>
      </Card>

      {/* Material Consumption */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Material Consumption
            </CardTitle>
            <BatchTabs
              activeBatch={activeBatch}
              totalBatches={totalBatches}
              disabled={disabled}
              onBatchChange={setActiveBatch}
              onAddBatch={() => {
                const next = totalBatches + 1;
                setTotalBatches(next);
                setActiveBatch(next);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <MaterialConsumptionTable
            materials={materials}
            batchNumber={activeBatch}
            disabled={disabled}
            onSave={(data) => setPendingMaterials(data)}
          />
        </CardContent>
      </Card>

    </div>
  );
}
