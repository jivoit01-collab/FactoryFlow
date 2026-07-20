import { CheckCircle2, Clock, History, Paperclip, PauseCircle, Shield, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { QC_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  useApproveLineClearance,
  useHoldLineClearance,
  useLineClearanceDetail,
  useLineClearances,
  useManagerDecideLineClearance,
} from '@/modules/production/execution/api';
import { ClearanceStatusBadge } from '@/modules/production/execution/components/ClearanceStatusBadge';
import type { ClearanceStatus, LineClearance } from '@/modules/production/execution/types';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button, Card, CardContent,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Textarea,
} from '@/shared/components/ui';

const isImageFile = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url.split('?')[0]);
const fileNameFromUrl = (url: string, fallback?: string) =>
  fallback || decodeURIComponent(url.split('?')[0].split('/').pop() || 'attachment');

type Decision = 'CLEARED' | 'NOT_CLEARED' | 'ON_HOLD';

function LineClearanceQAPage() {
  const [statusFilter, setStatusFilter] = useState<string>('SUBMITTED');
  const { data: clearances = [] } = useLineClearances(undefined, statusFilter === 'ALL' ? undefined : statusFilter);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState('');
  const { data: detail, isLoading: detailLoading } = useLineClearanceDetail(selectedId);
  const approveMutation = useApproveLineClearance(selectedId || 0);
  const holdMutation = useHoldLineClearance(selectedId || 0);
  const managerMutation = useManagerDecideLineClearance(selectedId || 0);
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canApproveLineClearance = hasAnyPermission([
    QC_PERMISSIONS.LINE_CLEARANCE_QC.APPROVE,
  ]);
  const canManageLineClearance = hasAnyPermission([
    QC_PERMISSIONS.LINE_CLEARANCE_QC.MANAGE,
  ]);

  const openClearance = (id: number) => {
    setRemarks('');
    setSelectedId(id);
  };

  const closeDialog = () => {
    setSelectedId(null);
    setRemarks('');
  };

  const trimmedRemarks = remarks.trim();

  const pending = detail?.status === 'SUBMITTED' || detail?.status === 'ON_HOLD';
  const decided = detail?.status === 'CLEARED' || detail?.status === 'NOT_CLEARED';
  const lineStarted = Boolean(detail?.is_line_started);

  // Normal QC acts on pending items; a manager may also change a decided one
  // (an override) as long as the line has not started yet.
  const canActNormally = pending && canApproveLineClearance;
  const canOverride = canManageLineClearance && !lineStarted && (pending || decided);
  const showDecisionUI = canActNormally || canOverride;
  const useManagerPath = canManageLineClearance && (decided || !canApproveLineClearance);
  const showHold = (useManagerPath || detail?.status === 'SUBMITTED') && detail?.status !== 'ON_HOLD';
  const decisionLocked = canManageLineClearance && lineStarted && detail?.status !== 'DRAFT' && !showDecisionUI;

  const actionsPending =
    approveMutation.isPending || holdMutation.isPending || managerMutation.isPending;

  const submitDecision = async (decision: Decision) => {
    if (!selectedId) return;
    if (decision !== 'CLEARED' && !trimmedRemarks) {
      toast.error(`Remarks are required to ${decision === 'ON_HOLD' ? 'hold' : 'reject'} a clearance`);
      return;
    }
    try {
      if (useManagerPath) {
        await managerMutation.mutateAsync({ decision, remarks: trimmedRemarks });
      } else if (decision === 'ON_HOLD') {
        await holdMutation.mutateAsync(trimmedRemarks);
      } else {
        await approveMutation.mutateAsync({ approved: decision === 'CLEARED', remarks: trimmedRemarks });
      }
      toast.success(
        decision === 'CLEARED' ? 'Clearance approved'
          : decision === 'NOT_CLEARED' ? 'Clearance rejected'
            : 'Clearance put on hold',
      );
      closeDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Line Clearance QA"
        description="Review and approve line clearances submitted by production"
      />

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SUBMITTED">Pending Approval</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="CLEARED">Approved</SelectItem>
            <SelectItem value="NOT_CLEARED">Rejected</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{clearances.length} clearance{clearances.length !== 1 ? 's' : ''}</span>
      </div>

      {clearances.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {statusFilter === 'SUBMITTED' ? 'No clearances pending approval' : 'No clearances found'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {clearances.map((c: LineClearance) => (
            <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openClearance(c.id)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {c.line_name} — {c.date}
                      {c.run_number && <span className="text-muted-foreground ml-2">Run #{c.run_number}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supervisor: {c.production_supervisor_sign || '-'}
                      {' · '}
                      Checks: {c.all_checks_passed ? 'Passed' : 'Not Passed'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ClearanceStatusBadge status={c.status} />
                  {c.status === 'SUBMITTED' && <Clock className="h-4 w-4 text-amber-500" />}
                  {c.status === 'ON_HOLD' && <PauseCircle className="h-4 w-4 text-amber-500" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail / Approve Dialog */}
      <Dialog open={selectedId !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Line Clearance Review</DialogTitle>
          </DialogHeader>
          {detailLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Line</span>
                  <p className="font-medium">{detail.line_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">{detail.date}</p>
                </div>
                {detail.run_number && (
                  <div>
                    <span className="text-muted-foreground">Production Run</span>
                    <p className="font-medium">Run #{detail.run_number}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Supervisor</span>
                  <p className="font-medium">{detail.production_supervisor_sign || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">All Checks Passed</span>
                  <p className={`font-medium ${detail.all_checks_passed ? 'text-green-600' : 'text-red-600'}`}>
                    {detail.all_checks_passed ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-0.5"><ClearanceStatusBadge status={detail.status} /></div>
                </div>
              </div>

              {/* Checklist items */}
              <div>
                <p className="text-sm font-medium mb-2">Checklist Items</p>
                <ul className="space-y-1.5">
                  {detail.items.map((item, idx) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground min-w-[1.5rem]">{idx + 1}.</span>
                      <span>{item.checkpoint}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Attachments from production */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" /> Cleared Line Attachments
                </p>
                {detail.attachments.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {detail.attachments.map((att) => {
                      const name = fileNameFromUrl(att.file, att.original_name);
                      return (
                        <a
                          key={att.id}
                          href={att.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-md border overflow-hidden hover:border-primary/50"
                          title={name}
                        >
                          {isImageFile(att.file) ? (
                            <img src={att.file} alt={name} className="h-24 w-full object-cover" />
                          ) : (
                            <div className="flex h-24 w-full items-center justify-center bg-muted">
                              <Paperclip className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <p className="truncate px-1.5 py-1 text-xs">{name}</p>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No attachments provided.</p>
                )}
              </div>

              {/* Existing QA remarks (shown for held/decided clearances) */}
              {detail.qa_remarks && (
                <div>
                  <p className="text-sm font-medium mb-1">QA Remarks</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md border bg-muted/40 p-2">
                    {detail.qa_remarks}
                  </p>
                </div>
              )}

              {/* Decision history (audit trail) */}
              {detail.decision_logs.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" /> Decision History
                  </p>
                  <ul className="space-y-2">
                    {detail.decision_logs.map((log, idx) => (
                      <li key={log.id} className="flex items-start gap-2 text-sm">
                        <div className="mt-0.5"><ClearanceStatusBadge status={log.decision as ClearanceStatus} /></div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {log.decided_by_name || 'Unknown'} · {new Date(log.decided_at).toLocaleString()}
                            {idx === 0 && <span className="ml-1 font-medium text-foreground">· Current</span>}
                          </p>
                          {log.remarks && <p className="whitespace-pre-wrap">{log.remarks}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Manager override hint */}
              {decided && canOverride && (
                <p className="text-xs text-muted-foreground rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 p-2">
                  This clearance is already decided. Choosing a decision below changes it — the previous
                  decision is kept in the history above. Allowed until the line starts.
                </p>
              )}

              {/* Decision locked — line already started */}
              {decisionLocked && (
                <p className="text-sm text-muted-foreground rounded-md border p-2">
                  Decision locked — the line has already started, so it can no longer be changed.
                </p>
              )}

              {/* Remarks input + Approve / Reject / Hold buttons */}
              {showDecisionUI && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <Label htmlFor="qa-remarks">
                      Remarks <span className="font-normal text-muted-foreground">(required to hold or reject)</span>
                    </Label>
                    <Textarea
                      id="qa-remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add remarks for this decision..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => submitDecision('NOT_CLEARED')}
                      disabled={actionsPending || !trimmedRemarks}
                      title={!trimmedRemarks ? 'Enter remarks to reject' : undefined}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    {showHold && (
                      <Button
                        variant="outline"
                        onClick={() => submitDecision('ON_HOLD')}
                        disabled={actionsPending || !trimmedRemarks}
                        title={!trimmedRemarks ? 'Enter remarks to hold' : undefined}
                      >
                        <PauseCircle className="h-4 w-4 mr-1" /> Hold
                      </Button>
                    )}
                    <Button onClick={() => submitDecision('CLEARED')} disabled={actionsPending}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              )}

              {detail.production_run && (detail.status === 'CLEARED' || detail.status === 'NOT_CLEARED') && (
                <div className="flex justify-end pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => { closeDialog(); navigate(`/production/execution/runs/${detail.production_run}`); }}>
                    View Production Run
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LineClearanceQAPage;
