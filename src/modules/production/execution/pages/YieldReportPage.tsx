import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';

import { useCompleteRun,useMaterials, useRunCost, useRunDetail, useUpdateMaterial } from '../api';
import { MaterialConsumptionTable } from '../components/MaterialConsumptionTable';
import { ProductionStatusBadge } from '../components/ProductionStatusBadge';

function YieldReportPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const numRunId = Number(runId);
  const isCompleteMode = searchParams.get('complete') === 'true';

  const { data: run } = useRunDetail(numRunId || null);
  const { data: materials = [] } = useMaterials(numRunId);
  const { data: cost } = useRunCost(numRunId);
  const completeRun = useCompleteRun(numRunId);
  const updateMaterial = useUpdateMaterial(numRunId);

  const [totalProduction, setTotalProduction] = useState('');

  const handleUpdateClosingQty = async (materialId: number, closingQty: string) => {
    try {
      await updateMaterial.mutateAsync({ materialId, data: { closing_qty: closingQty } });
      toast.success('Closing qty updated');
    } catch { toast.error('Failed to update'); }
  };

  if (!run) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const isCompleted = run.status === 'COMPLETED';
  const ratedSpeed = parseFloat(run.rated_speed || '0');

  // Production metrics
  const segmentProduction = run.segments.reduce(
    (sum, s) => sum + parseFloat(s.produced_cases || '0'), 0
  );
  const actualProduction = isCompleted ? parseFloat(run.total_production || '0') : segmentProduction;

  // Time metrics
  let runningMinutes = 0;
  for (const seg of run.segments) {
    if (seg.end_time) {
      runningMinutes += Math.floor(
        (new Date(seg.end_time).getTime() - new Date(seg.start_time).getTime()) / 60_000
      );
    } else if (seg.is_active) {
      runningMinutes += Math.floor((Date.now() - new Date(seg.start_time).getTime()) / 60_000);
    }
  }
  let breakdownMinutes = 0;
  for (const bd of run.breakdowns) {
    if (bd.end_time) breakdownMinutes += bd.breakdown_minutes;
    else if (bd.is_active) breakdownMinutes += Math.floor((Date.now() - new Date(bd.start_time).getTime()) / 60_000);
  }
  const totalTimeMinutes = runningMinutes + breakdownMinutes;
  const expectedProduction = ratedSpeed > 0 ? (runningMinutes / 60) * ratedSpeed : 0;

  // Efficiency metrics
  const productionEfficiency = expectedProduction > 0
    ? ((actualProduction / expectedProduction) * 100).toFixed(1)
    : '-';
  const timeUtilization = totalTimeMinutes > 0
    ? ((runningMinutes / totalTimeMinutes) * 100).toFixed(1)
    : '-';
  const actualSpeed = runningMinutes > 0
    ? ((actualProduction / runningMinutes) * 60).toFixed(1)
    : '-';

  // Material metrics
  const totalMaterialInput = materials.reduce(
    (sum, m) => sum + parseFloat(m.opening_qty || '0') + parseFloat(m.issued_qty || '0'), 0
  );
  const totalMaterialClosing = materials.reduce(
    (sum, m) => sum + parseFloat(m.closing_qty || '0'), 0
  );
  const totalMaterialConsumed = totalMaterialInput - totalMaterialClosing;
  const totalWastage = materials.reduce(
    (sum, m) => sum + parseFloat(m.wastage_qty || '0'), 0
  );

  // Breakdown summary
  const breakdownsByCategory: Record<string, { count: number; minutes: number }> = {};
  for (const bd of run.breakdowns) {
    const cat = bd.breakdown_category_name || 'Unknown';
    if (!breakdownsByCategory[cat]) breakdownsByCategory[cat] = { count: 0, minutes: 0 };
    breakdownsByCategory[cat].count++;
    breakdownsByCategory[cat].minutes += bd.breakdown_minutes;
  }

  // Cost metrics
  const totalCost = cost ? parseFloat(cost.total_cost || '0') : 0;
  const perUnitCost = actualProduction > 0 ? (totalCost / actualProduction).toFixed(2) : '-';

  // Completion validation warnings
  const hasActiveSegment = run.segments.some((s) => s.is_active);
  const hasActiveBreakdown = run.breakdowns.some((b) => b.is_active);
  const hasMissingClosingQty = materials.some((m) => !m.closing_qty || parseFloat(m.closing_qty) === 0);
  const warnings: string[] = [];
  if (hasActiveSegment) warnings.push('Production is still running. Stop it first.');
  if (hasActiveBreakdown) warnings.push('There is an active breakdown. Resolve it first.');
  if (hasMissingClosingQty) warnings.push('Some materials are missing closing quantities. Click the pencil icon on each material below to enter them.');
  const canComplete = !hasActiveSegment && !hasActiveBreakdown && !hasMissingClosingQty && run.status === 'IN_PROGRESS';

  const handleComplete = async () => {
    if (!totalProduction.trim()) return;
    try {
      await completeRun.mutateAsync({ total_production: totalProduction });
      toast.success('Production run completed');
      setSearchParams({});
    } catch {
      toast.error('Failed to complete run');
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title={isCompleteMode && !isCompleted ? 'Review & Complete Run' : `Yield Report — Run #${run.run_number}`}
        description={`${run.date} · ${run.line_name} · ${run.product}`}
      />

      {/* Completion warnings */}
      {isCompleteMode && !isCompleted && warnings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Cannot complete yet</p>
                <ul className="mt-1 text-sm text-amber-700 dark:text-amber-300 list-disc list-inside">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Summary */}
      <Card>
        <CardHeader><CardTitle>Production Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1"><ProductionStatusBadge status={run.status} /></div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Actual Production</p>
              <p className="text-xl font-bold">{actualProduction} cases</p>
              {expectedProduction > 0 && (
                <p className="text-xs text-muted-foreground">(expected: ~{Math.round(expectedProduction)})</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Production Efficiency</p>
              <p className={`text-xl font-bold ${productionEfficiency !== '-' && parseFloat(productionEfficiency) >= 90 ? 'text-green-600' : productionEfficiency !== '-' && parseFloat(productionEfficiency) >= 70 ? 'text-amber-600' : productionEfficiency !== '-' ? 'text-red-600' : ''}`}>
                {productionEfficiency}{productionEfficiency !== '-' ? '%' : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Actual Speed</p>
              <p className="text-xl font-bold">{actualSpeed} {actualSpeed !== '-' ? 'cases/hr' : ''}</p>
              {ratedSpeed > 0 && <p className="text-xs text-muted-foreground">(rated: {ratedSpeed})</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Utilization */}
      <Card>
        <CardHeader><CardTitle>Time Utilization</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Running Time</p>
              <p className="text-xl font-bold text-green-600">{runningMinutes} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Breakdown Time</p>
              <p className="text-xl font-bold text-red-600">{breakdownMinutes} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Time</p>
              <p className="text-xl font-bold">{totalTimeMinutes} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time Utilization</p>
              <p className={`text-xl font-bold ${timeUtilization !== '-' && parseFloat(timeUtilization) >= 80 ? 'text-green-600' : timeUtilization !== '-' ? 'text-amber-600' : ''}`}>
                {timeUtilization}{timeUtilization !== '-' ? '%' : ''}
              </p>
            </div>
          </div>

          {Object.keys(breakdownsByCategory).length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Breakdowns by Type</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th scope="col" className="text-left p-2 font-medium">Type</th>
                      <th scope="col" className="text-right p-2 font-medium">Count</th>
                      <th scope="col" className="text-right p-2 font-medium">Total Minutes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(breakdownsByCategory).map(([cat, data]) => (
                      <tr key={cat} className="border-b">
                        <td className="p-2 font-medium">{cat}</td>
                        <td className="p-2 text-right">{data.count}</td>
                        <td className="p-2 text-right text-red-600">{data.minutes} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Material Consumption */}
      <Card className={isCompleteMode && hasMissingClosingQty ? 'border-amber-300 dark:border-amber-800' : ''}>
        <CardHeader><CardTitle>Material Consumption {isCompleteMode && hasMissingClosingQty && <span className="text-sm font-normal text-amber-600 ml-2">— closing qty required</span>}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Input (Opening + Issued)</p>
              <p className="text-xl font-bold">{totalMaterialInput.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Closing</p>
              <p className="text-xl font-bold">{totalMaterialClosing.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Consumed</p>
              <p className="text-xl font-bold">{totalMaterialConsumed.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Wastage</p>
              <p className="text-xl font-bold text-red-600">{totalWastage.toFixed(3)}</p>
            </div>
          </div>
          <MaterialConsumptionTable
            materials={materials}
            onUpdateClosingQty={isCompleteMode && !isCompleted ? handleUpdateClosingQty : undefined}
            readOnly={!isCompleteMode || isCompleted}
          />
        </CardContent>
      </Card>

      {/* Cost Summary */}
      {cost && (
        <Card>
          <CardHeader><CardTitle>Cost Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-muted-foreground">Labour</p><p className="font-bold">₹{cost.labour_cost}</p></div>
              <div><p className="text-muted-foreground">Machine</p><p className="font-bold">₹{cost.machine_cost}</p></div>
              <div><p className="text-muted-foreground">Electricity</p><p className="font-bold">₹{cost.electricity_cost}</p></div>
              <div><p className="text-muted-foreground">Water</p><p className="font-bold">₹{cost.water_cost}</p></div>
              <div><p className="text-muted-foreground">Gas</p><p className="font-bold">₹{cost.gas_cost}</p></div>
              <div><p className="text-muted-foreground">Compressed Air</p><p className="font-bold">₹{cost.compressed_air_cost}</p></div>
              <div><p className="text-muted-foreground">Overhead</p><p className="font-bold">₹{cost.overhead_cost}</p></div>
              <div className="border-l pl-4">
                <p className="text-muted-foreground">Total Cost</p>
                <p className="text-xl font-bold text-green-600">₹{cost.total_cost}</p>
                <p className="text-xs text-muted-foreground">
                  Per unit: {perUnitCost !== '-' ? `₹${perUnitCost}` : '-'}
                  {!isCompleted && perUnitCost !== '-' && ' (estimated)'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manpower */}
      <Card>
        <CardHeader><CardTitle>Manpower</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-muted-foreground">Total Manpower</p><p className="font-bold text-lg">{run.labour_count + run.other_manpower_count}</p></div>
            <div><p className="text-muted-foreground">Labour</p><p className="font-bold text-lg">{run.labour_count}</p></div>
            <div><p className="text-muted-foreground">Supervisor</p><p className="font-medium">{run.supervisor || '-'}</p></div>
            <div><p className="text-muted-foreground">Operators</p><p className="font-medium">{run.operators || '-'}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Complete Run Section */}
      {isCompleteMode && !isCompleted && (
        <Card className="border-2 border-primary">
          <CardHeader><CardTitle>Complete Production Run</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review the report above. Once completed, production data cannot be modified.
            </p>
            {expectedProduction > 0 && (
              <p className="text-sm">
                Expected production (based on running time and rated speed): <span className="font-bold">{Math.round(expectedProduction).toLocaleString()}</span> cases
              </p>
            )}
            {segmentProduction > 0 && (
              <p className="text-sm">
                Total from segments: <span className="font-bold">{segmentProduction}</span> cases
              </p>
            )}
            <div className="max-w-sm">
              <Label>Total Cases Produced</Label>
              <Input
                type="number"
                step="0.1"
                value={totalProduction}
                onChange={(e) => setTotalProduction(e.target.value)}
                placeholder="Enter final total production"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSearchParams({})}>
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!canComplete || !totalProduction.trim() || completeRun.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {completeRun.isPending ? 'Completing...' : 'Confirm & Complete Run'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default YieldReportPage;
