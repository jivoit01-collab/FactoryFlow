import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  X,
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/components/ui';

import {
  useProductionQCPending,
  useApproveProductionQCSession,
  useRejectProductionQCSession,
} from '../../api/productionQC';

export default function ProductionQCApprovalPage() {
  const navigate = useNavigate();
  const { data: pendingSessions = [], isLoading } = useProductionQCPending();
  const approveSession = useApproveProductionQCSession();
  const rejectSession = useRejectProductionQCSession();

  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject';
    sessionId: number;
  } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [overallResult, setOverallResult] = useState<'PASS' | 'FAIL'>('PASS');

  const handleAction = async () => {
    if (!actionDialog) return;
    try {
      if (actionDialog.type === 'approve') {
        await approveSession.mutateAsync({
          sessionId: actionDialog.sessionId,
          data: { remarks, overall_result: overallResult },
        });
        toast.success(`QC session approved as ${overallResult}`);
      } else {
        await rejectSession.mutateAsync({
          sessionId: actionDialog.sessionId,
          data: { remarks },
        });
        toast.success('QC session rejected');
      }
      setActionDialog(null);
      setRemarks('');
      setOverallResult('PASS');
    } catch {
      toast.error(`Failed to ${actionDialog.type} session`);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/qc/production')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Production QC
      </Button>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Production QC Approvals</h2>
        <p className="text-muted-foreground text-sm">
          Review and approve submitted QC sessions
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : pendingSessions.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border rounded-lg">
          No QC sessions awaiting approval
        </div>
      ) : (
        <div className="space-y-3">
          {pendingSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/qc/production/sessions/${session.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Run #{session.run_number} — Round {session.session_number}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        session.session_type === 'FINAL'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
                      }`}>
                        {session.session_type === 'FINAL' ? 'Final' : 'In-Process'}
                      </span>
                      {session.overall_result && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          session.overall_result === 'PASS'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {session.overall_result}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.product} &middot; {session.line_name} &middot;{' '}
                      {session.run_date} &middot; {session.pass_count}/{session.total_params} pass
                      {session.checked_by_name && ` · by ${session.checked_by_name}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setActionDialog({ type: 'reject', sessionId: session.id })}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setActionDialog({ type: 'approve', sessionId: session.id })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/qc/production/sessions/${session.id}`)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve/Reject Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === 'approve' ? 'Approve' : 'Reject'} QC Session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {actionDialog?.type === 'approve' && (
              <div>
                <Label>QC Result</Label>
                <Select value={overallResult} onValueChange={(v) => setOverallResult(v as 'PASS' | 'FAIL')}>
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
            )}
            <div>
              <Label>Remarks (optional)</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={`Add ${actionDialog?.type === 'approve' ? 'approval' : 'rejection'} remarks...`}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={approveSession.isPending || rejectSession.isPending}
                className={actionDialog?.type === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
              >
                {(approveSession.isPending || rejectSession.isPending) ? 'Processing...' : (
                  actionDialog?.type === 'approve' ? 'Approve' : 'Reject'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
