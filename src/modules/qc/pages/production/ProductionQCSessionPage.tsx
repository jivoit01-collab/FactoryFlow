import {
  ArrowLeft,
  CheckCircle2,
  Save,
  Send,
  XCircle,
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useProductionQCSession,
  useSubmitProductionQCSession,
  useUpdateProductionQCResults,
} from '../../api/productionQC';
import type { UpdateProductionQCResultRequest } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface ParameterState {
  result_value: string;
  result_numeric?: number;
  is_within_spec: boolean;
  remarks: string;
}

const getResultPlaceholder = (paramType: string) => {
  switch (paramType) {
    case 'NUMERIC': return 'Enter numeric value';
    case 'RANGE': return 'Enter numeric value';
    case 'BOOLEAN': return 'Select Pass or Fail';
    case 'TEXT': default: return 'Enter text value';
  }
};

// ============================================================================
// Component
// ============================================================================

export default function ProductionQCSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const numSessionId = Number(sessionId);

  const { data: session, isLoading } = useProductionQCSession(numSessionId || null);
  const updateResults = useUpdateProductionQCResults(
    numSessionId,
    session?.production_run ?? 0,
  );
  const submitSession = useSubmitProductionQCSession(session?.production_run ?? 0);

  const [parameterResults, setParameterResults] = useState<Record<number, ParameterState>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitResult, setSubmitResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from session data
  useEffect(() => {
    if (session?.results) {
      const state: Record<number, ParameterState> = {};
      for (const r of session.results) {
        state[r.parameter_master] = {
          result_value: r.result_value || (r.result_numeric != null ? String(r.result_numeric) : ''),
          result_numeric: r.result_numeric ?? undefined,
          is_within_spec: r.is_within_spec ?? true,
          remarks: r.remarks || '',
        };
      }
      setParameterResults(state);
      setHasChanges(false);
    }
  }, [session]);

  const isEditable = session?.workflow_status === 'DRAFT';

  // Same handler pattern as InspectionDetailPage
  const handleParameterChange = (
    parameterId: number,
    field: keyof ParameterState,
    value: string | number | boolean,
  ) => {
    setParameterResults((prev) => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        result_value: prev[parameterId]?.result_value || '',
        remarks: prev[parameterId]?.remarks || '',
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleResultValueChange = (
    parameterId: number,
    value: string,
    paramType: string,
    minValue?: string | number | null,
    maxValue?: string | number | null,
  ) => {
    handleParameterChange(parameterId, 'result_value', value);

    if (paramType === 'NUMERIC' || paramType === 'RANGE') {
      const numericVal = parseFloat(value);
      if (!isNaN(numericVal)) {
        handleParameterChange(parameterId, 'result_numeric', numericVal);
        if (paramType === 'RANGE' && minValue != null && maxValue != null) {
          const min = typeof minValue === 'string' ? parseFloat(minValue) : minValue;
          const max = typeof maxValue === 'string' ? parseFloat(maxValue) : maxValue;
          if (!isNaN(min) && !isNaN(max)) {
            handleParameterChange(parameterId, 'is_within_spec', numericVal >= min && numericVal <= max);
          }
        }
      }
    } else if (paramType === 'BOOLEAN') {
      handleParameterChange(parameterId, 'is_within_spec', value === 'Pass');
    }
  };

  const handleSave = async () => {
    if (!session) return;
    setIsSaving(true);
    const results: UpdateProductionQCResultRequest[] = session.results.map((r) => {
      const state = parameterResults[r.parameter_master];
      return {
        parameter_master_id: r.parameter_master,
        result_value: state?.result_value || '',
        result_numeric: state?.result_numeric ?? null,
        is_within_spec: state?.is_within_spec ?? null,
        remarks: state?.remarks || '',
      };
    });

    try {
      await updateResults.mutateAsync(results);
      toast.success('Results saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save results');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    if (hasChanges) await handleSave();
    try {
      await submitSession.mutateAsync({
        sessionId: numSessionId,
        data: { overall_result: submitResult },
      });
      toast.success(`QC session submitted as ${submitResult}`);
      setShowSubmitDialog(false);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to submit';
      toast.error(msg);
    }
  };

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/qc/production/runs/${session.production_run}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Run
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {session.session_type === 'FINAL' ? 'Final QC' : `QC Round #${session.session_number}`}
            </h2>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              session.workflow_status === 'SUBMITTED'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {session.workflow_status === 'SUBMITTED' ? 'Submitted' : 'Draft'}
            </span>
            {session.workflow_status === 'SUBMITTED' && session.overall_result && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                session.overall_result === 'PASS'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {session.overall_result === 'PASS' ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {session.overall_result}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Run #{session.run_number} &middot; {session.material_type_name} &middot;{' '}
            {new Date(session.checked_at).toLocaleString()}
            {session.checked_by_name && ` · by ${session.checked_by_name}`}
          </p>
        </div>
      </div>

      {/* Submitted Info */}
      {session.workflow_status === 'SUBMITTED' && session.submitted_by_name && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          session.overall_result === 'PASS'
            ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800'
        }`}>
          {session.overall_result === 'PASS' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span>
            Submitted as <strong>{session.overall_result}</strong> by {session.submitted_by_name} on{' '}
            {new Date(session.submitted_at!).toLocaleString()}
          </span>
        </div>
      )}

      {/* QC Parameters — same layout as InspectionDetailPage */}
      <Card>
        <CardHeader>
          <CardTitle>QC Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: stacked card layout */}
          <div className="md:hidden space-y-4">
            {session.results.map((param) => {
              const parameterId = param.parameter_master;
              const currentValue = parameterResults[parameterId] || {
                result_value: '',
                is_within_spec: true,
                remarks: '',
              };

              return (
                <div key={parameterId} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {param.parameter_name}
                      {param.is_mandatory && <span className="text-destructive"> *</span>}
                    </span>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={currentValue.is_within_spec}
                        onChange={(e) =>
                          handleParameterChange(parameterId, 'is_within_spec', e.target.checked)
                        }
                        disabled={!isEditable || isSaving || param.parameter_type === 'BOOLEAN' || param.parameter_type === 'RANGE'}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-muted-foreground">Within Spec</span>
                    </label>
                  </div>
                  <div className="text-sm text-muted-foreground">Standard: {param.standard_value}</div>
                  <div className="space-y-1">
                    <Label className="text-xs">Result{param.is_mandatory && <span className="text-destructive"> *</span>}</Label>
                    {param.parameter_type === 'BOOLEAN' ? (
                      <select
                        value={currentValue.result_value}
                        onChange={(e) => handleResultValueChange(parameterId, e.target.value, param.parameter_type)}
                        disabled={!isEditable || isSaving}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select Pass or Fail</option>
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                      </select>
                    ) : (
                      <Input
                        type={param.parameter_type === 'NUMERIC' || param.parameter_type === 'RANGE' ? 'number' : 'text'}
                        step={param.parameter_type === 'NUMERIC' || param.parameter_type === 'RANGE' ? 'any' : undefined}
                        value={currentValue.result_value}
                        onChange={(e) => handleResultValueChange(parameterId, e.target.value, param.parameter_type, param.min_value, param.max_value)}
                        disabled={!isEditable || isSaving}
                        className="w-full"
                        placeholder={getResultPlaceholder(param.parameter_type)}
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Remarks</Label>
                    <Input
                      value={currentValue.remarks}
                      onChange={(e) => handleParameterChange(parameterId, 'remarks', e.target.value)}
                      disabled={!isEditable || isSaving}
                      className="w-full"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Parameter</th>
                  <th className="text-left p-3 font-medium">Standard Value</th>
                  <th className="text-left p-3 font-medium">Result</th>
                  <th className="text-center p-3 font-medium">Within Spec</th>
                  <th className="text-left p-3 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {session.results.map((param) => {
                  const parameterId = param.parameter_master;
                  const currentValue = parameterResults[parameterId] || {
                    result_value: '',
                    is_within_spec: true,
                    remarks: '',
                  };

                  return (
                    <tr key={parameterId} className="border-b">
                      <td className="p-3">
                        <span className="font-medium">
                          {param.parameter_name}
                          {param.is_mandatory && <span className="text-destructive"> *</span>}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{param.standard_value}</td>
                      <td className="p-3">
                        {param.parameter_type === 'BOOLEAN' ? (
                          <select
                            value={currentValue.result_value}
                            onChange={(e) => handleResultValueChange(parameterId, e.target.value, param.parameter_type)}
                            disabled={!isEditable || isSaving}
                            className={cn(
                              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                            )}
                          >
                            <option value="">Select Pass or Fail</option>
                            <option value="Pass">Pass</option>
                            <option value="Fail">Fail</option>
                          </select>
                        ) : (
                          <Input
                            type={param.parameter_type === 'NUMERIC' || param.parameter_type === 'RANGE' ? 'number' : 'text'}
                            step={param.parameter_type === 'NUMERIC' || param.parameter_type === 'RANGE' ? 'any' : undefined}
                            value={currentValue.result_value}
                            onChange={(e) => handleResultValueChange(parameterId, e.target.value, param.parameter_type, param.min_value, param.max_value)}
                            disabled={!isEditable || isSaving}
                            className="w-full"
                            placeholder={getResultPlaceholder(param.parameter_type)}
                          />
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={currentValue.is_within_spec}
                          onChange={(e) => handleParameterChange(parameterId, 'is_within_spec', e.target.checked)}
                          disabled={!isEditable || isSaving || param.parameter_type === 'BOOLEAN' || param.parameter_type === 'RANGE'}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={currentValue.remarks}
                          onChange={(e) => handleParameterChange(parameterId, 'remarks', e.target.value)}
                          disabled={!isEditable || isSaving}
                          className="w-full"
                          placeholder="Optional"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer Actions — same position as arrival slip inspection */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => navigate(`/qc/production/runs/${session.production_run}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-4">
          {isEditable && (
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
          {isEditable && (
            <Button onClick={() => setShowSubmitDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          )}
        </div>
      </div>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit QC Session</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will finalize the session. Results cannot be changed after submission.
          </p>
          <div>
            <Label>QC Result</Label>
            <Select value={submitResult} onValueChange={(v) => setSubmitResult(v as 'PASS' | 'FAIL')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PASS">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Pass
                  </span>
                </SelectItem>
                <SelectItem value="FAIL">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-3.5 w-3.5 text-red-600" /> Fail
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitSession.isPending}
              className={submitResult === 'FAIL' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {submitSession.isPending ? 'Submitting...' : `Submit as ${submitResult}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
