import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui';

import { useCreateLineClearance, useLineClearanceDetail, useUpdateLineClearance, useSubmitLineClearance, useApproveLineClearance, useLines } from '../api';
import { ClearanceChecklistTable } from '../components/ClearanceChecklistTable';
import { ClearanceStatusBadge } from '../components/ClearanceStatusBadge';
import { SignatureBlock } from '../components/SignatureBlock';
import type { ClearanceResult } from '../types';

function LineClearanceFormPage() {
  const { clearanceId } = useParams<{ clearanceId: string }>();
  const navigate = useNavigate();
  const isNew = !clearanceId;
  const numId = clearanceId ? Number(clearanceId) : null;

  const { data: lines } = useLines(true);
  const { data: clearance, isLoading } = useLineClearanceDetail(numId);
  const createClearance = useCreateLineClearance();
  const updateClearance = useUpdateLineClearance(numId || 0);
  const submitClearance = useSubmitLineClearance(numId || 0);
  const approveClearance = useApproveLineClearance(numId || 0);

  const [lineId, setLineId] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleCreate = async () => {
    try {
      const result = await createClearance.mutateAsync({ date, line_id: lineId });
      toast.success('Line clearance created');
      navigate(`/production/execution/line-clearance/${result.id}`, { replace: true });
    } catch { toast.error('Failed to create clearance'); }
  };

  const handleUpdateItem = async (itemId: number, result: ClearanceResult) => {
    if (!clearance) return;
    const updatedItems = clearance.items.map((i) => ({
      id: i.id,
      result: i.id === itemId ? result : i.result,
      remarks: i.remarks,
    }));
    try {
      await updateClearance.mutateAsync({ items: updatedItems });
    } catch { toast.error('Failed to update'); }
  };

  const handleSubmit = async () => {
    try { await submitClearance.mutateAsync(); toast.success('Submitted for QA review'); } catch { toast.error('Failed to submit'); }
  };

  const handleApprove = async (approved: boolean) => {
    try {
      await approveClearance.mutateAsync({ approved });
      toast.success(approved ? 'Clearance approved' : 'Clearance rejected');
    } catch { toast.error('Failed to update approval'); }
  };

  if (!isNew && isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/production/execution/line-clearance')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      {isNew ? (
        <>
          <DashboardHeader title="New Line Clearance" description="Create a pre-production line clearance checklist" />
          <Card className="max-w-lg">
            <CardContent className="p-6 space-y-4">
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
              <Button onClick={handleCreate} disabled={!lineId || createClearance.isPending}>
                {createClearance.isPending ? 'Creating...' : 'Create Clearance'}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : clearance ? (
        <>
          <div className="flex items-center gap-3">
            <DashboardHeader title={`Line Clearance ${clearance.document_id || `#${clearance.id}`}`} />
            <ClearanceStatusBadge status={clearance.status} />
          </div>

          <Card>
            <CardHeader><CardTitle>Checklist</CardTitle></CardHeader>
            <CardContent>
              <ClearanceChecklistTable
                items={clearance.items}
                onUpdateItem={handleUpdateItem}
                readOnly={clearance.status !== 'DRAFT'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Signatures</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <SignatureBlock label="Production Supervisor" sign={clearance.production_supervisor_sign} signedAt={null} />
                <SignatureBlock label="Production Incharge" sign={clearance.production_incharge_sign} signedAt={null} />
                <SignatureBlock label="QA Approved By" sign={clearance.qa_approved ? 'Approved' : ''} signedAt={clearance.qa_approved_at} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            {clearance.status === 'DRAFT' && (
              <Button onClick={handleSubmit} disabled={submitClearance.isPending}>
                <Send className="h-4 w-4 mr-1" /> Submit for QA
              </Button>
            )}
            {clearance.status === 'SUBMITTED' && (
              <>
                <Button variant="destructive" onClick={() => handleApprove(false)} disabled={approveClearance.isPending}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => handleApprove(true)} disabled={approveClearance.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
              </>
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
