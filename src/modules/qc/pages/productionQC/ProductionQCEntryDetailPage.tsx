import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit,
  Loader2,
  Minus,
  Undo2,
  XCircle,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useApproveProductionQCEntry,
  useProductionQCEntry,
  useSendBackProductionQCEntry,
} from '../../api/productionQC/productionQC.queries';
import type { ProductionQCEntry, ProductionQCResult } from '../../types/productionQC.types';
import { formatDateTime } from '../../utils/productionQCFormat';
import { describeSpec } from '../../utils/productionQCSpec';
import { ProductionQCStatusBadge, SentBackBanner } from './ProductionQCStatusBadge';

type Decision = 'approve' | 'send-back';

export default function ProductionQCEntryDetailPage() {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId: string }>();
  const id = Number(entryId) || null;
  const { hasPermission } = usePermission();
  const canFill = hasPermission(QC_PERMISSIONS.PRODUCTION_QC.FILL);
  const canApprove = hasPermission(QC_PERMISSIONS.PRODUCTION_QC.APPROVE);

  const { data: entry, isLoading, error, refetch } = useProductionQCEntry(id);
  const [decision, setDecision] = useState<Decision | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !entry) {
    const apiError = error as ApiError | null;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">
              {apiError?.status === 404 ? 'Entry not found' : 'Could not load the entry'}
            </p>
            <p className="text-sm text-muted-foreground">
              {apiError?.status === 404
                ? `There is no QA report entry #${entryId}.`
                : apiError?.message || 'Please try again.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/qc/qa-reports')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to QA Reports
            </Button>
            {apiError?.status !== 404 && <Button onClick={() => refetch()}>Retry</Button>}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isUnfinished = entry.status === 'PENDING' || entry.status === 'SENT_BACK';
  const showEdit = canFill && isUnfinished;
  const showDecision = canApprove && entry.status === 'PENDING';
  // Entries sent together are decided and corrected as one.
  const sentWith = entry.submission_entry_ids.filter((id) => id !== entry.id);
  const all = sentWith.length > 0 ? ` all ${sentWith.length + 1}` : '';
  const results = [...entry.results].sort((a, b) => a.sequence - b.sequence || a.id - b.id);

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/qc/qa-reports')}
            aria-label="Back to QA Reports"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Entry #{entry.id}</h2>
              <ProductionQCStatusBadge status={entry.status} label={entry.status_label} />
            </div>
            <p className="text-sm text-muted-foreground">{entry.parameter_type.name}</p>
            {sentWith.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Sent with{' '}
                {sentWith.map((id, index) => (
                  <span key={id}>
                    {index > 0 && ', '}
                    <Link to={`/qc/qa-reports/entries/${id}`} className="font-medium underline">
                      #{id}
                    </Link>
                  </span>
                ))}{' '}
                — approved, sent back and corrected together.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {showEdit && (
            <Button
              variant="outline"
              onClick={() => navigate(`/qc/qa-reports/entries/${entry.id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              {entry.status === 'SENT_BACK' ? 'Correct' : 'Edit'}
              {all}
            </Button>
          )}
          {showDecision && (
            <>
              <Button variant="outline" onClick={() => setDecision('send-back')}>
                <Undo2 className="mr-2 h-4 w-4" />
                Send back{all}
              </Button>
              <Button onClick={() => setDecision('approve')}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve{all}
              </Button>
            </>
          )}
        </div>
      </div>

      {entry.status === 'SENT_BACK' && (
        <SentBackBanner
          by={entry.sent_back_by_name}
          at={entry.sent_back_at}
          remarks={entry.send_back_remarks}
        />
      )}

      {/* The entry */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Report">
            {entry.parameter_type.name}
            <div className="font-mono text-xs text-muted-foreground">
              {entry.parameter_type.code}
            </div>
          </InfoItem>
          {entry.default_name && <InfoItem label="Default">{entry.default_name}</InfoItem>}
          <InfoItem label="Checked At">{formatDateTime(entry.checked_at)}</InfoItem>
          <InfoItem label="Submitted By">
            {entry.submitted_by_name || '-'}
            {entry.submitted_at && (
              <div className="text-xs text-muted-foreground">
                {formatDateTime(entry.submitted_at)}
              </div>
            )}
          </InfoItem>
          {entry.status === 'APPROVED' && (
            <InfoItem label="Approved By">
              {entry.approved_by_name || '-'}
              {entry.approved_at && (
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(entry.approved_at)}
                </div>
              )}
            </InfoItem>
          )}
          <InfoItem label="Out of Spec">
            <span className={cn(entry.out_of_spec_count > 0 && 'text-destructive')}>
              {entry.out_of_spec_count}
            </span>
          </InfoItem>
        </CardContent>
      </Card>

      {/* Readings */}
      <Card>
        <CardHeader>
          <CardTitle>Results ({results.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Parameter</th>
                  <th className="p-3 text-left font-medium">Spec</th>
                  <th className="p-3 text-left font-medium">Value</th>
                  <th className="p-3 text-center font-medium">In Spec</th>
                  <th className="p-3 text-left font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <ResultRow key={result.id} result={result} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Remarks and the decision */}
      <Card>
        <CardContent className="space-y-4 pt-6 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Remarks
            </p>
            <p className="mt-1 whitespace-pre-wrap">{entry.remarks || '-'}</p>
          </div>
          {entry.status === 'APPROVED' && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Approval Remarks
              </p>
              <p className="mt-1 whitespace-pre-wrap">{entry.approval_remarks || '-'}</p>
            </div>
          )}
          {entry.status !== 'SENT_BACK' && entry.sent_back_at && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sent back earlier
                {entry.sent_back_by_name ? ` by ${entry.sent_back_by_name}` : ''} on{' '}
                {formatDateTime(entry.sent_back_at)}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{entry.send_back_remarks || '-'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {showDecision && (
        <DecisionDialog entry={entry} decision={decision} onClose={() => setDecision(null)} />
      )}
    </div>
  );
}

function ResultRow({ result }: { result: ProductionQCResult }) {
  const outOfSpec = result.is_within_spec === false;
  const value = result.result_value?.trim();
  return (
    <tr className={cn('border-b', outOfSpec && 'bg-destructive/5')}>
      <td className="p-3">
        <div className={cn('font-medium', outOfSpec && 'text-destructive')}>
          {result.parameter_name}
          {result.is_mandatory && <span className="text-destructive"> *</span>}
        </div>
        <div className="font-mono text-xs text-muted-foreground">{result.parameter_code}</div>
      </td>
      <td className="p-3 text-muted-foreground">{describeSpec(result)}</td>
      <td className={cn('p-3 font-medium', outOfSpec && 'text-destructive')}>
        {value
          ? `${value}${result.uom && result.parameter_type !== 'BOOLEAN' ? ` ${result.uom}` : ''}`
          : '-'}
      </td>
      <td className="p-3 text-center">
        {result.is_within_spec === true && (
          <CheckCircle2 className="mx-auto h-5 w-5 text-green-600" aria-label="Within spec" />
        )}
        {result.is_within_spec === false && (
          <XCircle className="mx-auto h-5 w-5 text-destructive" aria-label="Out of spec" />
        )}
        {result.is_within_spec === null && (
          <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Not judged" />
        )}
      </td>
      <td className="p-3 text-muted-foreground">{result.remarks || '-'}</td>
    </tr>
  );
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{children}</div>
    </div>
  );
}

/** Approve (remark optional) or send back (remark required), in one step. */
function DecisionDialog({
  entry,
  decision,
  onClose,
}: {
  entry: ProductionQCEntry;
  decision: Decision | null;
  onClose: () => void;
}) {
  const approve = useApproveProductionQCEntry();
  const sendBack = useSendBackProductionQCEntry();
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const isSendBack = decision === 'send-back';
  const isPending = approve.isPending || sendBack.isPending;
  // The entries sent with it are decided with it.
  const ids = entry.submission_entry_ids;
  const together = ids.length > 1;
  const label = `Entries #${ids.join(', #')}`;
  const what = together ? `all ${ids.length} entries (#${ids.join(', #')})` : `entry #${entry.id}`;

  const close = () => {
    if (isPending) return;
    setRemarks('');
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    const trimmed = remarks.trim();
    if (isSendBack && !trimmed) {
      setError('Say what needs correcting.');
      return;
    }
    setError('');
    try {
      if (isSendBack) {
        await sendBack.mutateAsync({ id: entry.id, remarks: trimmed });
        toast.success(together ? `${label} sent back` : `Entry #${entry.id} sent back`);
      } else {
        await approve.mutateAsync({ id: entry.id, remarks: trimmed });
        toast.success(together ? `${label} approved` : `Entry #${entry.id} approved`);
      }
      setRemarks('');
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(
        apiError?.errors?.remarks?.[0] || apiError?.message || 'Could not save the decision.',
      );
    }
  };

  return (
    <Dialog open={decision !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isSendBack ? `Send back ${what}?` : `Approve ${what}?`}</DialogTitle>
          <DialogDescription>
            {together && 'They were sent together, so they are decided together. '}
            {isSendBack
              ? `${together ? 'They go' : 'It goes'} back to QC to correct and save again.`
              : entry.out_of_spec_count > 0
                ? `On #${entry.id}, ${entry.out_of_spec_count} parameter${entry.out_of_spec_count === 1 ? ' is' : 's are'} out of spec.`
                : together
                  ? `On #${entry.id}, every judged parameter is within spec.`
                  : 'Every judged parameter is within spec.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="production-qc-decision-remarks">
            {isSendBack ? 'What needs correcting' : 'Remark (optional)'}
            {isSendBack && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id="production-qc-decision-remarks"
            value={remarks}
            onChange={(event) => {
              setRemarks(event.target.value);
              if (error) setError('');
            }}
            disabled={isPending}
            className={cn(error && 'border-destructive focus-visible:ring-destructive')}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={close} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={isSendBack ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSendBack ? 'Send back' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
