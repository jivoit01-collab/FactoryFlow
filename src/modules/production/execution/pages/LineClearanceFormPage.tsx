import { ArrowLeft, Loader2, Save, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EXECUTION_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardLoading } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import {
  useApproveClearance,
  useClearanceDetail,
  useCreateClearance,
  useProductionLines,
  useSubmitClearance,
  useUpdateClearance,
} from '../api';
import { ClearanceAuthorizationSection } from '../components/ClearanceAuthorizationSection';
import { ClearanceChecklistTable } from '../components/ClearanceChecklistTable';
import { ClearanceDecision } from '../components/ClearanceDecision';
import { ClearanceStatusBadge } from '../components/ClearanceStatusBadge';
import type { ClearanceChecklistItem, ClearanceResult } from '../types';

export default function LineClearanceFormPage() {
  const navigate = useNavigate();
  const { clearanceId: clearanceIdParam } = useParams<{ clearanceId: string }>();
  const clearanceId = clearanceIdParam ? Number(clearanceIdParam) : null;
  const isCreateMode = !clearanceId;

  const { hasPermission } = usePermission();
  const canCreate = hasPermission(EXECUTION_PERMISSIONS.CREATE_CLEARANCE);
  const canApproveQA = hasPermission(EXECUTION_PERMISSIONS.APPROVE_CLEARANCE_QA);

  // ---- Create mode state ----
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lineId, setLineId] = useState<number | ''>('');
  const [planId, setPlanId] = useState<number | ''>('');
  const [documentId, setDocumentId] = useState('');

  // ---- Shared state (for editing checklist items + signatures) ----
  const [items, setItems] = useState<ClearanceChecklistItem[]>([]);
  const [supervisorSign, setSupervisorSign] = useState('');
  const [inchargeSign, setInchargeSign] = useState('');

  // ---- Queries ----
  const { data: detail, isLoading: detailLoading } = useClearanceDetail(clearanceId);
  const { data: lines } = useProductionLines(true);

  // ---- Mutations ----
  const createClearance = useCreateClearance();
  const updateClearance = useUpdateClearance(clearanceId ?? 0);
  const submitClearance = useSubmitClearance(clearanceId ?? 0);
  const approveClearance = useApproveClearance(clearanceId ?? 0);

  // Sync detail data into local state
  useEffect(() => {
    if (detail) {
      setItems(detail.items);
      setSupervisorSign(detail.production_supervisor_sign);
      setInchargeSign(detail.production_incharge_sign);
    }
  }, [detail]);

  const isDraft = !detail || detail.status === 'DRAFT';
  const isSubmitted = detail?.status === 'SUBMITTED';
  const isEditable = isDraft && canCreate;

  // ---- Handlers ----
  const handleItemChange = useCallback(
    (itemId: number, result: ClearanceResult, remarks?: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, result, remarks: remarks ?? item.remarks } : item,
        ),
      );
    },
    [],
  );

  const handleCreate = async () => {
    if (!lineId || !planId) {
      toast.error('Please select a line and production plan');
      return;
    }
    try {
      const result = await createClearance.mutateAsync({
        date,
        line_id: Number(lineId),
        production_plan_id: Number(planId),
        document_id: documentId,
      });
      toast.success('Clearance created');
      navigate(`/production/execution/line-clearance/${result.id}`, { replace: true });
    } catch (err) {
      toast.error('Failed to create clearance');
    }
  };

  const handleSaveDraft = async () => {
    if (!clearanceId) return;
    try {
      await updateClearance.mutateAsync({
        items: items.map((i) => ({ id: i.id, result: i.result, remarks: i.remarks })),
        production_supervisor_sign: supervisorSign,
        production_incharge_sign: inchargeSign,
      });
      toast.success('Draft saved');
    } catch (err) {
      toast.error('Failed to save draft');
    }
  };

  const handleSubmit = async () => {
    if (!clearanceId) return;
    // First save the current state
    try {
      await updateClearance.mutateAsync({
        items: items.map((i) => ({ id: i.id, result: i.result, remarks: i.remarks })),
        production_supervisor_sign: supervisorSign,
        production_incharge_sign: inchargeSign,
      });
    } catch {
      toast.error('Failed to save before submitting');
      return;
    }
    // Then submit
    try {
      await submitClearance.mutateAsync();
      toast.success('Clearance submitted for QA review');
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to submit';
      toast.error(message);
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (!clearanceId) return;
    try {
      await approveClearance.mutateAsync({ approved });
      toast.success(approved ? 'Clearance approved' : 'Clearance rejected');
    } catch (err) {
      toast.error('Failed to update approval');
    }
  };

  const isSaving =
    createClearance.isPending ||
    updateClearance.isPending ||
    submitClearance.isPending ||
    approveClearance.isPending;

  const hasUnfilledItems = items.some((i) => i.result === 'NA');
  const hasSignature = !!(supervisorSign || inchargeSign);
  const canSubmit = !hasUnfilledItems && hasSignature;

  // ---- Loading state ----
  if (!isCreateMode && detailLoading) {
    return <DashboardLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/production/execution/line-clearance')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {isCreateMode ? 'New Line Clearance' : 'Pre-Production Line Clearance Checklist'}
          </h2>
          <p className="text-sm text-muted-foreground">
            JIVO WELLNESS PVT. LTD. — GANAUR
          </p>
        </div>
        {detail && (
          <div className="flex items-center gap-3">
            {detail.document_id && (
              <span className="font-mono text-xs px-2.5 py-1 rounded border bg-muted">
                {detail.document_id}
              </span>
            )}
            <ClearanceStatusBadge status={detail.status} />
          </div>
        )}
      </div>

      {/* Create Mode: Header Fields */}
      {isCreateMode ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Clearance Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clearance_date">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clearance_date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clearance_line">
                  Production Line <span className="text-destructive">*</span>
                </Label>
                <select
                  id="clearance_line"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value ? Number(e.target.value) : '')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select line...</option>
                  {lines?.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clearance_plan">
                  Production Plan ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clearance_plan"
                  type="number"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Enter plan ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clearance_doc_id">Document ID</Label>
                <Input
                  id="clearance_doc_id"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="e.g., PRD-OIL-FRM-15-00-00-04"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={handleCreate} disabled={isSaving || !lineId || !planId}>
                {createClearance.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Clearance
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : detail ? (
        <>
          {/* Detail view: Info bar */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">
                    {new Date(detail.date + 'T00:00:00').toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Line</span>
                  <p className="font-medium">{detail.line_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Production Plan</span>
                  <p className="font-medium">#{detail.production_plan}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Document ID</span>
                  <p className="font-mono text-xs font-medium">
                    {detail.document_id || '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist Table */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ClearanceChecklistTable
                items={items}
                disabled={!isEditable}
                onItemChange={handleItemChange}
              />
            </CardContent>
          </Card>

          {/* Authorization Section */}
          <ClearanceAuthorizationSection
            supervisorSign={supervisorSign}
            inchargeSign={inchargeSign}
            qaApproved={detail.qa_approved}
            qaApprovedBy={detail.qa_approved_by}
            qaApprovedAt={detail.qa_approved_at}
            disabled={!isEditable}
            onSupervisorChange={setSupervisorSign}
            onInchargeChange={setInchargeSign}
          />

          {/* QA Approval Section (only for SUBMITTED clearances with QA permission) */}
          {isSubmitted && canApproveQA && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">QA Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <ClearanceDecision
                  decision={null}
                  onDecision={(decision) => handleApprove(decision === 'CLEARED')}
                  disabled={isSaving}
                />
              </CardContent>
            </Card>
          )}

          {/* Completed decision display */}
          {(detail.status === 'CLEARED' || detail.status === 'NOT_CLEARED') && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Clearance Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <ClearanceDecision
                  decision={detail.status === 'CLEARED' ? 'CLEARED' : 'NOT_CLEARED'}
                  disabled
                  onDecision={() => {}}
                />
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          {isDraft && canCreate && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => navigate('/production/execution/line-clearance')}
              >
                Cancel
              </Button>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                  {updateClearance.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button onClick={handleSubmit} disabled={isSaving || !canSubmit}>
                  {submitClearance.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <Send className="h-4 w-4 mr-2" />
                  Submit for QA
                </Button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
