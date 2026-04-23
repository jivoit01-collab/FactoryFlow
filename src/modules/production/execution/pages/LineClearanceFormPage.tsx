import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch,
} from '@/shared/components/ui';

import { useHasPermission } from '@/core/auth/hooks/usePermission';
import { EXECUTION_PERMISSIONS } from '@/config/permissions/production.permissions';

import {
  useCreateLineClearance, useLineClearanceDetail, useUpdateLineClearance,
  useSubmitLineClearance, useApproveLineClearance, useLines, useRunDetail,
} from '../api';
import { ClearanceStatusBadge } from '../components/ClearanceStatusBadge';

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

  const effectiveLineId = linkedRun ? linkedRun.line : lineId;
  const effectiveDate = linkedRun ? linkedRun.date : date;

  const isDraft = clearance?.status === 'DRAFT';

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

  const handleToggleChecks = async (checked: boolean) => {
    try {
      await updateClearance.mutateAsync({ all_checks_passed: checked });
      toast.success(checked ? 'All checks marked as passed' : 'Checks marked as not passed');
    } catch { toast.error('Failed to update'); }
  };

  const handleSupervisorChange = async (name: string) => {
    try {
      await updateClearance.mutateAsync({ production_supervisor_sign: name });
    } catch { toast.error('Failed to save supervisor name'); }
  };

  const handleSubmit = async () => {
    try {
      await submitClearance.mutateAsync();
      toast.success('Submitted for QA approval');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    }
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

          {/* Checklist — read-only reference list */}
          <Card>
            <CardHeader><CardTitle>Checklist Items</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {clearance.items.map((item, idx) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground font-medium min-w-[1.5rem]">{idx + 1}.</span>
                    <span>{item.checkpoint}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Single toggle + supervisor */}
          <Card>
            <CardHeader><CardTitle>Verification</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">All checks passed</p>
                  <p className="text-sm text-muted-foreground">Confirm that all the above checklist items have been verified</p>
                </div>
                {isDraft ? (
                  <Switch
                    checked={clearance.all_checks_passed}
                    onChange={handleToggleChecks}
                    disabled={updateClearance.isPending}
                  />
                ) : (
                  <span className={`text-sm font-medium ${clearance.all_checks_passed ? 'text-green-600' : 'text-red-600'}`}>
                    {clearance.all_checks_passed ? 'Yes' : 'No'}
                  </span>
                )}
              </div>

              <div className="max-w-sm">
                <Label>Supervisor</Label>
                {isDraft ? (
                  <Input
                    defaultValue={clearance.production_supervisor_sign}
                    placeholder="Enter supervisor name"
                    onBlur={(e) => {
                      if (e.target.value !== clearance.production_supervisor_sign) {
                        handleSupervisorChange(e.target.value);
                      }
                    }}
                  />
                ) : (
                  <p className="font-medium mt-1">{clearance.production_supervisor_sign || '-'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {isDraft && (
              <Button
                onClick={handleSubmit}
                disabled={!clearance.all_checks_passed || !clearance.production_supervisor_sign || submitClearance.isPending}
                title={!clearance.all_checks_passed ? 'Mark all checks as passed first' : !clearance.production_supervisor_sign ? 'Enter supervisor name first' : undefined}
              >
                <Send className="h-4 w-4 mr-1" />
                {submitClearance.isPending ? 'Submitting...' : 'Submit for QA Approval'}
              </Button>
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
            {clearance.status === 'CLEARED' && (
              <p className="text-sm text-green-600 font-medium">Approved by QA</p>
            )}
            {clearance.status === 'NOT_CLEARED' && (
              <p className="text-sm text-red-600 font-medium">Rejected by QA</p>
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
