import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Shield, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button, Card, CardContent,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui';

import {
  useLineClearances, useLineClearanceDetail, useApproveLineClearance,
} from '@/modules/production/execution/api';
import { ClearanceStatusBadge } from '@/modules/production/execution/components/ClearanceStatusBadge';
import type { LineClearance } from '@/modules/production/execution/types';

function LineClearanceQAPage() {
  const [statusFilter, setStatusFilter] = useState<string>('SUBMITTED');
  const { data: clearances = [] } = useLineClearances(undefined, statusFilter === 'ALL' ? undefined : statusFilter);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: detail, isLoading: detailLoading } = useLineClearanceDetail(selectedId);
  const approveMutation = useApproveLineClearance(selectedId || 0);
  const navigate = useNavigate();

  const handleApprove = async (approved: boolean) => {
    if (!selectedId) return;
    try {
      await approveMutation.mutateAsync({ approved });
      toast.success(approved ? 'Clearance approved' : 'Clearance rejected');
      setSelectedId(null);
    } catch { toast.error('Failed'); }
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
            <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedId(c.id)}>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail / Approve Dialog */}
      <Dialog open={selectedId !== null} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="max-w-lg">
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

              {/* Approve / Reject buttons */}
              {detail.status === 'SUBMITTED' && (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="destructive" onClick={() => handleApprove(false)} disabled={approveMutation.isPending}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button onClick={() => handleApprove(true)} disabled={approveMutation.isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                  </Button>
                </div>
              )}

              {detail.status !== 'SUBMITTED' && detail.production_run && (
                <div className="flex justify-end pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedId(null); navigate(`/production/execution/runs/${detail.production_run}`); }}>
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
