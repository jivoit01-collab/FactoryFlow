import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@/shared/components/ui';

import {
  useCreateFinalQC,
  useCreateInProcessQC,
  useDeleteInProcessQC,
  useFinalQC,
  useInProcessQC,
  useRunDetail,
  useUpdateFinalQC,
} from '../api';
import { FINAL_QC_COLORS, FINAL_QC_LABELS,QC_RESULT_COLORS, QC_RESULT_LABELS } from '../constants';
import {
  type CreateFinalQCFormData,
  createFinalQCSchema,
  type CreateInProcessQCFormData,
  createInProcessQCSchema,
} from '../schemas';
import type { FinalQCResult, QCResult } from '../types';

function QCPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const numRunId = Number(runId);

  const { data: run } = useRunDetail(numRunId || null);
  const { data: inProcessChecks = [] } = useInProcessQC(numRunId);
  const { data: finalQC, error: finalQCError } = useFinalQC(numRunId);

  const createInProcess = useCreateInProcessQC(numRunId);
  const deleteInProcess = useDeleteInProcessQC(numRunId);
  const createFinal = useCreateFinalQC(numRunId);
  const updateFinal = useUpdateFinalQC(numRunId);

  const [showInProcessDialog, setShowInProcessDialog] = useState(false);
  const [showFinalDialog, setShowFinalDialog] = useState(false);

  const hasFinalQC = !!finalQC && !finalQCError;

  // In-process form
  const ipForm = useForm<CreateInProcessQCFormData>({
    resolver: zodResolver(createInProcessQCSchema),
    defaultValues: {
      checked_at: new Date().toISOString().slice(0, 16),
      result: 'PASS',
    },
  });

  const onSubmitInProcess = async (data: CreateInProcessQCFormData) => {
    try {
      await createInProcess.mutateAsync({
        ...data,
        checked_at: new Date(data.checked_at).toISOString(),
      });
      toast.success('QC check recorded');
      setShowInProcessDialog(false);
      ipForm.reset({ checked_at: new Date().toISOString().slice(0, 16), result: 'PASS' });
    } catch {
      toast.error('Failed to record QC check');
    }
  };

  // Final QC form
  const finalForm = useForm<CreateFinalQCFormData>({
    resolver: zodResolver(createFinalQCSchema),
    defaultValues: {
      checked_at: new Date().toISOString().slice(0, 16),
      overall_result: 'PASS',
      parameters: [{ name: '', expected: '', actual: '', result: 'PASS' }],
    },
  });

  const onSubmitFinal = async (data: CreateFinalQCFormData) => {
    try {
      const payload = {
        ...data,
        checked_at: new Date(data.checked_at).toISOString(),
      };
      if (hasFinalQC) {
        await updateFinal.mutateAsync(payload);
        toast.success('Final QC updated');
      } else {
        await createFinal.mutateAsync(payload);
        toast.success('Final QC recorded');
      }
      setShowFinalDialog(false);
    } catch {
      toast.error('Failed to save final QC');
    }
  };

  const addParameter = () => {
    const current = finalForm.getValues('parameters');
    finalForm.setValue('parameters', [...current, { name: '', expected: '', actual: '', result: 'PASS' as QCResult }]);
  };

  const removeParameter = (index: number) => {
    const current = finalForm.getValues('parameters');
    finalForm.setValue('parameters', current.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title={`Quality Control — Run #${run?.run_number || ''}`}
        description={run ? `${run.date} · ${run.line_name} · ${run.product}` : ''}
      />

      <Tabs defaultValue="inprocess" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inprocess">In-Process QC ({inProcessChecks.length})</TabsTrigger>
          <TabsTrigger value="final">Final QC {hasFinalQC ? '(1)' : '(0)'}</TabsTrigger>
        </TabsList>

        <TabsContent value="inprocess">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="font-semibold">In-Process Quality Checks</h3>
                <Button size="sm" onClick={() => setShowInProcessDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Check
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Time</th>
                    <th className="text-left p-2 font-medium">Parameter</th>
                    <th className="text-right p-2 font-medium">Min</th>
                    <th className="text-right p-2 font-medium">Max</th>
                    <th className="text-right p-2 font-medium">Actual</th>
                    <th className="text-left p-2 font-medium">Result</th>
                    <th className="text-left p-2 font-medium">Remarks</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {inProcessChecks.map((c) => {
                    const resultColors = QC_RESULT_COLORS[c.result];
                    return (
                      <tr key={c.id} className="border-b">
                        <td className="p-2 text-xs">{new Date(c.checked_at).toLocaleString()}</td>
                        <td className="p-2">{c.parameter}</td>
                        <td className="p-2 text-right">{c.acceptable_min || '-'}</td>
                        <td className="p-2 text-right">{c.acceptable_max || '-'}</td>
                        <td className="p-2 text-right font-medium">{c.actual_value || '-'}</td>
                        <td className="p-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${resultColors.bg} ${resultColors.text} ${resultColors.darkBg} ${resultColors.darkText}`}>
                            {QC_RESULT_LABELS[c.result]}
                          </span>
                        </td>
                        <td className="p-2 text-muted-foreground truncate max-w-[150px]">{c.remarks || '-'}</td>
                        <td className="p-2">
                          <Button variant="ghost" size="sm" onClick={async () => { if (confirm('Delete this check?')) { try { await deleteInProcess.mutateAsync(c.id); toast.success('Deleted'); } catch { toast.error('Failed'); } } }}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {inProcessChecks.length === 0 && (
                    <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No in-process checks recorded</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="final">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="font-semibold">Final Quality Check</h3>
                <Button size="sm" onClick={() => setShowFinalDialog(true)}>
                  {hasFinalQC ? 'Edit Final QC' : 'Record Final QC'}
                </Button>
              </div>
              {hasFinalQC && finalQC ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Result</p>
                      {(() => { const c = FINAL_QC_COLORS[finalQC.overall_result]; return (
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${c.bg} ${c.text} ${c.darkBg} ${c.darkText}`}>
                          {FINAL_QC_LABELS[finalQC.overall_result]}
                        </span>
                      ); })()}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Checked At</p>
                      <p className="font-medium">{new Date(finalQC.checked_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {finalQC.remarks && <p className="text-sm"><span className="text-muted-foreground">Remarks:</span> {finalQC.remarks}</p>}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Parameter</th>
                        <th className="text-left p-2 font-medium">Expected</th>
                        <th className="text-left p-2 font-medium">Actual</th>
                        <th className="text-left p-2 font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finalQC.parameters.map((p, i) => {
                        const rc = QC_RESULT_COLORS[p.result];
                        return (
                          <tr key={i} className="border-b">
                            <td className="p-2">{p.name}</td>
                            <td className="p-2">{p.expected}</td>
                            <td className="p-2">{p.actual}</td>
                            <td className="p-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${rc.bg} ${rc.text} ${rc.darkBg} ${rc.darkText}`}>
                                {QC_RESULT_LABELS[p.result]}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No final QC check recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* In-Process Dialog */}
      <Dialog open={showInProcessDialog} onOpenChange={setShowInProcessDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add In-Process QC Check</DialogTitle></DialogHeader>
          <form onSubmit={ipForm.handleSubmit(onSubmitInProcess)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Check Time</Label><Input type="datetime-local" {...ipForm.register('checked_at')} /></div>
              <div><Label>Parameter</Label><Input {...ipForm.register('parameter')} placeholder="e.g., Fill Weight" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Acceptable Min</Label><Input {...ipForm.register('acceptable_min')} /></div>
              <div><Label>Acceptable Max</Label><Input {...ipForm.register('acceptable_max')} /></div>
              <div><Label>Actual Value</Label><Input {...ipForm.register('actual_value')} /></div>
            </div>
            <div>
              <Label>Result</Label>
              <Select onValueChange={(v) => ipForm.setValue('result', v as QCResult)} defaultValue="PASS">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASS">Pass</SelectItem>
                  <SelectItem value="FAIL">Fail</SelectItem>
                  <SelectItem value="NA">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Remarks</Label><Textarea {...ipForm.register('remarks')} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowInProcessDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createInProcess.isPending}>
                {createInProcess.isPending ? 'Saving...' : 'Add Check'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Final QC Dialog */}
      <Dialog open={showFinalDialog} onOpenChange={setShowFinalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{hasFinalQC ? 'Edit' : 'Record'} Final QC</DialogTitle></DialogHeader>
          <form onSubmit={finalForm.handleSubmit(onSubmitFinal)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Check Time</Label><Input type="datetime-local" {...finalForm.register('checked_at')} /></div>
              <div>
                <Label>Overall Result</Label>
                <Select onValueChange={(v) => finalForm.setValue('overall_result', v as FinalQCResult)} defaultValue="PASS">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASS">Pass</SelectItem>
                    <SelectItem value="FAIL">Fail</SelectItem>
                    <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Parameters</Label>
                <Button type="button" size="sm" variant="outline" onClick={addParameter}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
              {finalForm.watch('parameters').map((_, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 mb-2">
                  <Input placeholder="Name" {...finalForm.register(`parameters.${index}.name`)} />
                  <Input placeholder="Expected" {...finalForm.register(`parameters.${index}.expected`)} />
                  <Input placeholder="Actual" {...finalForm.register(`parameters.${index}.actual`)} />
                  <Select onValueChange={(v) => finalForm.setValue(`parameters.${index}.result`, v as QCResult)} defaultValue="PASS">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASS">Pass</SelectItem>
                      <SelectItem value="FAIL">Fail</SelectItem>
                      <SelectItem value="NA">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeParameter(index)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div><Label>Remarks</Label><Textarea {...finalForm.register('remarks')} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowFinalDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createFinal.isPending || updateFinal.isPending}>
                {(createFinal.isPending || updateFinal.isPending) ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QCPage;
