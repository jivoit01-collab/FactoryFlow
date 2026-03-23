import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
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

import { MaterialTypeSelect } from '../../components';
import {
  useProductionQCRunSessions,
  useCreateProductionQCSession,
  useDeleteProductionQCSession,
} from '../../api/productionQC';
import type { ProductionQCSessionType, ProductionQCWorkflowStatus } from '../../types';

// We need the run detail from production execution module
import { useRunDetail } from '@/modules/production/execution/api';

const WORKFLOW_BADGE: Record<
  ProductionQCWorkflowStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

export default function ProductionQCRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const numRunId = Number(runId);

  const { data: run } = useRunDetail(numRunId || null);
  const { data: sessions = [], isLoading } = useProductionQCRunSessions(numRunId || null);
  const createSession = useCreateProductionQCSession(numRunId);
  const deleteSession = useDeleteProductionQCSession(numRunId);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [materialTypeId, setMaterialTypeId] = useState<number | null>(null);
  const [sessionType, setSessionType] = useState<ProductionQCSessionType>('IN_PROCESS');
  const [checkedAt, setCheckedAt] = useState(new Date().toISOString().slice(0, 16));

  const inProcessSessions = sessions.filter((s) => s.session_type === 'IN_PROCESS');
  const finalSessions = sessions.filter((s) => s.session_type === 'FINAL');
  const hasFinal = finalSessions.length > 0;

  const handleCreate = async () => {
    if (!materialTypeId) {
      toast.error('Please select a material type');
      return;
    }
    try {
      const session = await createSession.mutateAsync({
        material_type_id: materialTypeId,
        session_type: sessionType,
        checked_at: new Date(checkedAt).toISOString(),
      });
      toast.success(`QC Round #${session.session_number} created`);
      setShowCreateDialog(false);
      navigate(`/qc/production/sessions/${session.id}`);
    } catch {
      toast.error('Failed to create QC session');
    }
  };

  const handleDelete = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this draft QC session?')) return;
    try {
      await deleteSession.mutateAsync(sessionId);
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/qc/production')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Production QC
      </Button>

      {/* Run Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Quality Control — Run #{run?.run_number || ''}
          </h2>
          {run && (
            <p className="text-muted-foreground text-sm">
              {run.date} &middot; {run.line_name} &middot; {run.product}
            </p>
          )}
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New QC Round
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* In-Process Rounds */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              In-Process QC Rounds ({inProcessSessions.length})
            </h3>
            {inProcessSessions.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-sm text-muted-foreground border rounded-lg">
                No in-process QC rounds yet
              </div>
            ) : (
              <div className="space-y-2">
                {inProcessSessions.map((session) => {
                  const badge = WORKFLOW_BADGE[session.workflow_status];
                  return (
                    <Card
                      key={session.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/qc/production/sessions/${session.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-full ${
                              session.overall_result === 'PASS'
                                ? 'bg-green-100 dark:bg-green-900/20'
                                : session.overall_result === 'FAIL'
                                  ? 'bg-red-100 dark:bg-red-900/20'
                                  : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              {session.overall_result === 'PASS' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : session.overall_result === 'FAIL' ? (
                                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-gray-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  Round {session.session_number}
                                </span>
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                                  {badge.label}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {new Date(session.checked_at).toLocaleString()} &middot;{' '}
                                {session.material_type_name} &middot;{' '}
                                {session.pass_count}/{session.total_params} pass
                                {session.checked_by_name && ` · ${session.checked_by_name}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {session.workflow_status === 'DRAFT' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDelete(session.id, e)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Final QC */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Final QC {hasFinal ? '(1)' : '(0)'}
            </h3>
            {!hasFinal ? (
              <div className="flex items-center justify-center h-20 text-sm text-muted-foreground border rounded-lg">
                No final QC yet
              </div>
            ) : (
              finalSessions.map((session) => {
                const badge = WORKFLOW_BADGE[session.workflow_status];
                return (
                  <Card
                    key={session.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-purple-500"
                    onClick={() => navigate(`/qc/production/sessions/${session.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-full ${
                            session.overall_result === 'PASS'
                              ? 'bg-green-100 dark:bg-green-900/20'
                              : session.overall_result === 'FAIL'
                                ? 'bg-red-100 dark:bg-red-900/20'
                                : 'bg-gray-100 dark:bg-gray-800'
                          }`}>
                            {session.overall_result === 'PASS' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : session.overall_result === 'FAIL' ? (
                              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">Final QC</span>
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                                {badge.label}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {new Date(session.checked_at).toLocaleString()} &middot;{' '}
                              {session.pass_count}/{session.total_params} pass
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Create Session Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New QC Round</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Material Type (Product)</Label>
              <MaterialTypeSelect
                value={materialTypeId ?? undefined}
                onChange={(mt) => setMaterialTypeId(mt?.id ?? null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select the product type to load its QC parameters
              </p>
            </div>
            <div>
              <Label>Session Type</Label>
              <Select
                value={sessionType}
                onValueChange={(v) => setSessionType(v as ProductionQCSessionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PROCESS">In-Process</SelectItem>
                  <SelectItem value="FINAL" disabled={hasFinal}>
                    Final {hasFinal ? '(already exists)' : ''}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Check Time</Label>
              <Input
                type="datetime-local"
                value={checkedAt}
                onChange={(e) => setCheckedAt(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createSession.isPending}
              >
                {createSession.isPending ? 'Creating...' : 'Create & Fill Results'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
