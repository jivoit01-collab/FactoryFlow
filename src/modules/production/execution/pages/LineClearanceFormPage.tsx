import { ArrowLeft, CheckCircle2, Save, Send, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EXECUTION_PERMISSIONS } from '@/config/permissions/production.permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui';

import { useApproveLineClearance, useCreateLineClearance, useLineClearanceDetail, useLines, useRunDetail,useSubmitLineClearance, useUpdateLineClearance } from '../api';
import { ClearanceChecklistTable } from '../components/ClearanceChecklistTable';
import { ClearanceStatusBadge } from '../components/ClearanceStatusBadge';
import { SignatureBlock } from '../components/SignatureBlock';
import type { ClearanceResult } from '../types';

function LineClearanceFormPage() {
  const { clearanceId } = useParams<{ clearanceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !clearanceId;
  const numId = clearanceId ? Number(clearanceId) : null;
  const runIdParam = searchParams.get('run_id');
  const linkedRunId = runIdParam ? Number(runIdParam) : null;

  const { data: lines } = useLines(true);
  const { data: linkedRun } = useRunDetail(linkedRunId);
  const { data: clearance, isLoading } = useLineClearanceDetail(numId);
  const createClearance = useCreateLineClearance();
  const updateClearance = useUpdateLineClearance(numId || 0);
  const submitClearance = useSubmitLineClearance(numId || 0);
  const approveClearance = useApproveLineClearance(numId || 0);

  const canApproveQA = useHasPermission(EXECUTION_PERMISSIONS.APPROVE_CLEARANCE_QA);

  const [lineId, setLineId] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Local state for checklist items (only saved on "Save")
  const [localItems, setLocalItems] = useState<{ id: number; result: ClearanceResult; remarks: string }[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize local items from server data
  useEffect(() => {
    if (clearance?.items) {
      setLocalItems(clearance.items.map((i) => ({ id: i.id, result: i.result, remarks: i.remarks })));
      setHasUnsavedChanges(false);
    }
  }, [clearance?.items]);

  const effectiveLineId = linkedRun ? linkedRun.line : lineId;
  const effectiveDate = linkedRun ? linkedRun.date : date;

  const handleCreate = async () => {
    try {
      const result = await createClearance.mutateAsync({
        production_run_id: linkedRunId || undefined,
        date: effectiveDate,
        line_id: effectiveLineId,
      });
      toast.success('Line clearance created');
      navigate(`/production/execution/line-clearance/${result.id}`, { replace: true });
    } catch { toast.error('Failed to create clearance'); }
  };

  const handleLocalItemChange = (itemId: number, result: ClearanceResult) => {
    setLocalItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, result } : i))
    );
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateClearance.mutateAsync({ items: localItems });
      toast.success('Clearance saved');
      setHasUnsavedChanges(false);
    } catch { toast.error('Failed to save'); }
  };

  const handleSubmit = async () => {
    try {
      await submitClearance.mutateAsync();
      toast.success('Submitted for QA review');
    } catch { toast.error('Failed to submit'); }
  };

  const handleApprove = async (approved: boolean) => {
    try {
      await approveClearance.mutateAsync({ approved });
      toast.success(approved ? 'Clearance approved' : 'Clearance rejected');
    } catch { toast.error('Failed to update approval'); }
  };

  if (!isNew && isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  // Check if all items are filled (not NA)
  const allItemsFilled = localItems.length > 0 && localItems.every((i) => i.result !== 'NA');

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      {isNew ? (
        <>
          <DashboardHeader
            title="New Line Clearance"
            description={linkedRun ? `For Run #${linkedRun.run_number} — ${linkedRun.line_name} — ${linkedRun.product}` : 'Create a pre-production line clearance checklist'}
          />
          <Card className="max-w-lg">
            <CardContent className="p-6 space-y-4">
              {linkedRun ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Production Run</span>
                    <p className="font-medium">Run #{linkedRun.run_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Product</span>
                    <p className="font-medium">{linkedRun.product}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Line</span>
                    <p className="font-medium">{linkedRun.line_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date</span>
                    <p className="font-medium">{linkedRun.date}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Production Line</Label>
                    <Select onValueChange={(v) => setLineId(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                      <SelectContent>{lines?.map((l) => (<SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </>
              )}
              <Button onClick={handleCreate} disabled={(!linkedRun && !lineId) || createClearance.isPending}>
                {createClearance.isPending ? 'Creating...' : 'Create Clearance'}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : clearance ? (
        <>
          <div className="flex items-center gap-3">
            <DashboardHeader
              title={`Line Clearance ${clearance.document_id || `#${clearance.id}`}`}
              description={clearance.run_number ? `Run #${clearance.run_number} · ${clearance.line_name} · ${clearance.date}` : `${clearance.line_name} · ${clearance.date}`}
            />
            <ClearanceStatusBadge status={clearance.status} />
          </div>

          <Card>
            <CardHeader><CardTitle>Checklist</CardTitle></CardHeader>
            <CardContent>
              <ClearanceChecklistTable
                items={clearance.items}
                localItems={clearance.status === 'DRAFT' ? localItems : undefined}
                onLocalChange={clearance.status === 'DRAFT' ? handleLocalItemChange : undefined}
                readOnly={clearance.status !== 'DRAFT'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Signatures</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <SignatureBlock
                  label="Production Supervisor"
                  sign={clearance.production_supervisor_sign}
                  signedAt={null}
                  editable={clearance.status === 'DRAFT'}
                  onSign={async (sign) => {
                    try {
                      await updateClearance.mutateAsync({ production_supervisor_sign: sign });
                      toast.success('Supervisor signature saved');
                    } catch { toast.error('Failed to save signature'); }
                  }}
                />
                <SignatureBlock
                  label="Production Incharge"
                  sign={clearance.production_incharge_sign}
                  signedAt={null}
                  editable={clearance.status === 'DRAFT'}
                  onSign={async (sign) => {
                    try {
                      await updateClearance.mutateAsync({ production_incharge_sign: sign });
                      toast.success('Incharge signature saved');
                    } catch { toast.error('Failed to save signature'); }
                  }}
                />
                <SignatureBlock label="QA Approved By" sign={clearance.qa_approved ? 'Approved' : ''} signedAt={clearance.qa_approved_at} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            {clearance.status === 'DRAFT' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || updateClearance.isPending}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {updateClearance.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={hasUnsavedChanges || !allItemsFilled || submitClearance.isPending}
                  title={hasUnsavedChanges ? 'Save changes first' : !allItemsFilled ? 'Fill all checklist items first' : undefined}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {submitClearance.isPending ? 'Submitting...' : 'Submit for QA'}
                </Button>
              </>
            )}
            {clearance.status === 'SUBMITTED' && canApproveQA && (
              <>
                <Button variant="destructive" onClick={() => handleApprove(false)} disabled={approveClearance.isPending}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => handleApprove(true)} disabled={approveClearance.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
              </>
            )}
            {clearance.status === 'SUBMITTED' && !canApproveQA && (
              <p className="text-sm text-muted-foreground italic">Waiting for QA approval</p>
            )}
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-muted-foreground">Clearance not found</div>
      )}
    </div>
  );
}

export default LineClearanceFormPage;
