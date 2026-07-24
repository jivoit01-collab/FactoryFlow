import { ArrowLeft, CheckCircle2, Plus, Printer, RotateCcw, Send, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { QC_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useApproveOnlineRecord,
  useOnlineMonitoringRecord,
  useOnlineMonitoringSpecs,
  useRejectOnlineRecord,
  useReopenOnlineRecord,
  useSubmitOnlineRecord,
} from '../../api/onlineMonitoring';
import type { OnlineRecordStatus } from '../../types';
import { ReadingCard } from './ReadingCard';
import { buildSpecMap } from './specValidation';
import { useOnlineRecordPrint } from './useOnlineRecordPrint';

const STATUS_BADGE: Record<OnlineRecordStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function OnlineMonitoringRecordPage() {
  const { recordId: idParam } = useParams();
  const recordId = Number(idParam);
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canEdit = hasAnyPermission([QC_PERMISSIONS.ONLINE_MONITORING.CREATE]);
  const canSubmit = hasAnyPermission([QC_PERMISSIONS.ONLINE_MONITORING.SUBMIT]);
  const canApprove = hasAnyPermission([QC_PERMISSIONS.ONLINE_MONITORING.APPROVE]);

  const { data: record, isLoading } = useOnlineMonitoringRecord(recordId);
  const { data: specs } = useOnlineMonitoringSpecs();
  const specMap = useMemo(() => buildSpecMap(specs), [specs]);

  const submit = useSubmitOnlineRecord();
  const approve = useApproveOnlineRecord();
  const reject = useRejectOnlineRecord();
  const reopen = useReopenOnlineRecord();
  const { print, printPortal } = useOnlineRecordPrint();

  const [addingReading, setAddingReading] = useState(false);

  if (isLoading || !record) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isDraft = record.status === 'DRAFT';
  const editable = isDraft && canEdit;

  const doSubmit = () =>
    submit.mutate(
      { recordId, args: undefined as never },
      {
        onSuccess: () => toast.success('Submitted for approval'),
        onError: (e) => toast.error(getErrorMessage(e, 'Could not submit')),
      },
    );

  const doApprove = () =>
    approve.mutate(
      { recordId, args: { remarks: '' } },
      {
        onSuccess: () => toast.success('Approved'),
        onError: (e) => toast.error(getErrorMessage(e, 'Could not approve')),
      },
    );

  const doReject = () => {
    const remarks = window.prompt('Reason for rejection?') ?? '';
    reject.mutate(
      { recordId, args: { remarks } },
      {
        onSuccess: () => toast.success('Rejected'),
        onError: (e) => toast.error(getErrorMessage(e, 'Could not reject')),
      },
    );
  };

  const doReopen = () =>
    reopen.mutate(
      { recordId, args: undefined as never },
      {
        onSuccess: () => toast.success('Reopened for correction'),
        onError: (e) => toast.error(getErrorMessage(e, 'Could not reopen')),
      },
    );

  const header: [string, string][] = [
    ['Date', record.date],
    ['Line', record.line_name],
    ['SKU', record.sku || '-'],
    ['Product', record.product_name || '-'],
    ['Flavour', record.flavour || '-'],
    ['Shift', record.shift || '-'],
    ['Batch', record.batch_no || '-'],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate('/qc/online-monitoring')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold tracking-tight">Online Quality Monitoring</h2>
          <Badge className={STATUS_BADGE[record.status]}>{record.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => print(record, specMap)}>
            <Printer className="mr-1.5 h-4 w-4" /> Print
          </Button>
          {isDraft && canSubmit && (
            <Button size="sm" onClick={doSubmit} disabled={submit.isPending}>
              <Send className="mr-1.5 h-4 w-4" /> Submit
            </Button>
          )}
          {record.status === 'SUBMITTED' && canApprove && (
            <>
              <Button size="sm" onClick={doApprove} disabled={approve.isPending}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={doReject} disabled={reject.isPending}>
                <XCircle className="mr-1.5 h-4 w-4" /> Reject
              </Button>
            </>
          )}
          {record.status === 'REJECTED' && canSubmit && (
            <Button size="sm" onClick={doReopen} disabled={reopen.isPending}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Revise
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4 lg:grid-cols-7">
          {header.map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="font-medium">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {record.status === 'REJECTED' && record.rejection_remarks && (
        <div className="rounded-md border border-red-500/40 bg-red-50 p-3 text-sm dark:bg-red-900/10">
          <span className="font-medium text-red-700 dark:text-red-400">Rejected: </span>
          {record.rejection_remarks}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            Readings ({record.readings.length})
          </h3>
          {editable && !addingReading && (
            <Button size="sm" onClick={() => setAddingReading(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Reading
            </Button>
          )}
        </div>

        {addingReading && (
          <ReadingCard
            recordId={recordId}
            reading={null}
            specMap={specMap}
            editable
            onClose={() => setAddingReading(false)}
          />
        )}

        {record.readings.length === 0 && !addingReading && (
          <div className="flex h-20 items-center justify-center rounded-md border text-sm text-muted-foreground">
            No readings yet.{editable ? ' Click “Add Reading” to record the first time interval.' : ''}
          </div>
        )}

        {record.readings.map((reading) => (
          <ReadingCard
            key={reading.id}
            recordId={recordId}
            reading={reading}
            specMap={specMap}
            editable={editable}
          />
        ))}
      </div>

      {record.remarks && (
        <div className="text-sm text-muted-foreground">Record remarks: {record.remarks}</div>
      )}
      {printPortal}
    </div>
  );
}
