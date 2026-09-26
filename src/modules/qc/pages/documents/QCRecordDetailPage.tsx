import { ArrowLeft, CheckCircle2, Loader2, Printer, Save, Send, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import {
  useDecideQCRecord,
  useQCRecord,
  useSaveRecordCells,
  useSaveRecordValues,
  useSubmitQCRecord,
} from '../../api/qcRecord';
import SheetViewport from '../../components/sheet/SheetViewport';
import type { RecordStatus } from '../../types/qcRecord.types';
import { cellKey, toHHMM } from '../../utils/recordGrid';
import { signature } from '../../utils/sheetLayout';
import RecordFillGrid from './RecordFillGrid';
import { useQCRecordPrint } from './useQCRecordPrint';

const STATUS_VARIANT: Record<RecordStatus, 'default' | 'secondary' | 'success' | 'destructive'> = {
  DRAFT: 'secondary',
  SUBMITTED: 'default',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

/** Current wall-clock time as HH:MM — the sensible default for a new column. */
function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function QCRecordDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();

  const canFill = hasAnyPermission([QC_PERMISSIONS.QC_RECORD.FILL]);
  const canApprove = hasAnyPermission([QC_PERMISSIONS.QC_RECORD.APPROVE]);

  const id = recordId ? Number(recordId) : null;
  const { data: record, isLoading } = useQCRecord(id);
  const saveValues = useSaveRecordValues();
  const saveCells = useSaveRecordCells();
  const submitRecord = useSubmitQCRecord();
  const decideRecord = useDecideQCRecord();
  const { print, printPortal } = useQCRecordPrint();

  /** Unsaved cell edits, keyed `HH:MM|parameterId`. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  /** Time columns added on screen but not yet persisted (they have no cells). */
  const [pendingSlots, setPendingSlots] = useState<string[]>([]);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [newTime, setNewTime] = useState('');
  /** A sheet form's unsaved edits, keyed by cell ('D10'). */
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});
  /** A sheet form's unsaved remarks; null while untouched. */
  const [remarksDraft, setRemarksDraft] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!record) {
    return <p className="py-20 text-center text-muted-foreground">Record not found.</p>;
  }

  const isApproved = record.status === 'APPROVED';
  const readOnly = !canFill || isApproved;
  const isSheet = record.template_detail.kind === 'SHEET' && !!record.template_detail.layout;
  const dirtyCount = isSheet
    ? Object.keys(cellDrafts).length + (remarksDraft !== null ? 1 : 0)
    : Object.keys(drafts).length;
  const canSubmit = canFill && (record.status === 'DRAFT' || record.status === 'REJECTED');

  // A locally-added column has no id yet, so give the grid a synthetic one.
  const recordForGrid = {
    ...record,
    time_slots: [
      ...record.time_slots,
      ...pendingSlots.map((slotTime, index) => ({
        id: -1 - index,
        sequence: record.time_slots.length + index,
        slot_time: slotTime,
      })),
    ],
  };

  const existingTimes = recordForGrid.time_slots.map((slot) => toHHMM(slot.slot_time));

  const handleOpenTimeDialog = () => {
    setNewTime(nowHHMM());
    setIsTimeDialogOpen(true);
  };

  const handleAddTimeSlot = () => {
    const match = newTime.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      toast.error('Enter the time as HH:MM, e.g. 08:10.');
      return;
    }
    const hours = Number(match[1]);
    if (hours > 23 || Number(match[2]) > 59) {
      toast.error('That is not a valid time.');
      return;
    }

    const normalised = `${String(hours).padStart(2, '0')}:${match[2]}`;
    if (existingTimes.includes(normalised)) {
      toast.error(`${normalised} is already a column on this sheet.`);
      return;
    }

    setPendingSlots((current) => [...current, normalised]);
    setIsTimeDialogOpen(false);
  };

  const handleCellChange = (slotTime: string, parameterId: number, value: string) => {
    setDrafts((current) => ({ ...current, [cellKey(slotTime, parameterId)]: value }));
  };

  const handleSaveSheet = async () => {
    try {
      await saveCells.mutateAsync({
        id: record.id,
        cells: cellDrafts,
        ...(remarksDraft !== null ? { remarks: remarksDraft } : {}),
      });
      setCellDrafts({});
      setRemarksDraft(null);
      toast.success(`Saved ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}.`);
    } catch (error) {
      toast.error((error as ApiError).message || 'Failed to save the sheet.');
    }
  };

  const handleSave = async () => {
    if (dirtyCount === 0) {
      toast.info('Nothing to save.');
      return;
    }
    if (isSheet) {
      await handleSaveSheet();
      return;
    }
    const cells = Object.entries(drafts).map(([key, value]) => {
      const [slot_time, parameter] = key.split('|');
      return { slot_time, parameter: Number(parameter), value };
    });

    try {
      const saved = await saveValues.mutateAsync({ id: record.id, cells });
      setDrafts({});
      // Saved cells created their columns server-side. Drop only those local
      // copies, so a column the user added but has not filled yet survives
      // instead of vanishing on save.
      const persisted = new Set(saved.time_slots.map((slot) => toHHMM(slot.slot_time)));
      setPendingSlots((current) => current.filter((time) => !persisted.has(time)));
      toast.success(`Saved ${cells.length} cell${cells.length === 1 ? '' : 's'}.`);
    } catch (error) {
      toast.error((error as ApiError).message || 'Failed to save the sheet.');
    }
  };

  const handleSubmit = async () => {
    if (dirtyCount > 0) {
      toast.error('Save your changes before submitting the sheet.');
      return;
    }
    try {
      await submitRecord.mutateAsync(record.id);
      toast.success('Submitted for approval.');
    } catch (error) {
      toast.error((error as ApiError).message || 'Failed to submit the sheet.');
    }
  };

  const handleDecision = async (decision: 'APPROVE' | 'REJECT') => {
    try {
      await decideRecord.mutateAsync({ id: record.id, decision });
      toast.success(decision === 'APPROVE' ? 'Record approved.' : 'Record rejected.');
    } catch (error) {
      toast.error((error as ApiError).message || 'Failed to record the decision.');
    }
  };

  const template = record.template_detail;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/qc/documents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{template.title}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono">{template.document_code}</span>
              <span>{record.record_date}</span>
              {record.shift && <span>Shift {record.shift}</span>}
              {template.revision_label && <span>Rev {template.revision_label}</span>}
            </p>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[record.status]} className="text-sm">
          {record.status_label}
        </Badge>
      </div>

      {isApproved && (
        <div className="rounded-md border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-3 text-sm text-green-800 dark:text-green-400">
          Approved{record.approved_by_name ? ` by ${record.approved_by_name}` : ''} — this sheet is
          locked and can no longer be edited.
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {template.organisation || 'Monitoring record'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSheet && template.layout ? (
            <SheetViewport
              layout={template.layout}
              fields={template.cell_fields}
              mode="fill"
              values={{ ...record.cell_values, ...cellDrafts }}
              dirty={new Set(Object.keys(cellDrafts))}
              checks={record.cell_checks}
              readOnly={readOnly}
              bound={{
                recordDate: record.record_date,
                shift: record.shift,
                remarks: remarksDraft ?? record.remarks,
                submittedBy: signature(record.submitted_by_name, record.submitted_at),
                // Set on a rejection too, so only an approval signs the sheet.
                approvedBy: isApproved
                  ? signature(record.approved_by_name, record.approved_at)
                  : '',
              }}
              onChange={(ref, value) => setCellDrafts((current) => ({ ...current, [ref]: value }))}
              onRemarksChange={setRemarksDraft}
            />
          ) : (
            <RecordFillGrid
              record={recordForGrid}
              drafts={drafts}
              onCellChange={handleCellChange}
              onAddTimeSlot={handleOpenTimeDialog}
              readOnly={readOnly}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => print(record)}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            {!readOnly && (
              <Button
                onClick={handleSave}
                disabled={saveValues.isPending || saveCells.isPending || dirtyCount === 0}
              >
                {saveValues.isPending || saveCells.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
              </Button>
            )}

            {canSubmit && (
              <Button
                variant="outline"
                onClick={handleSubmit}
                disabled={submitRecord.isPending || dirtyCount > 0}
                title={dirtyCount > 0 ? 'Save your changes first' : 'Send the sheet for approval'}
              >
                <Send className="mr-2 h-4 w-4" />
                Submit for approval
              </Button>
            )}

            {canApprove && record.status === 'SUBMITTED' && (
              <>
                <Button onClick={() => handleDecision('APPROVE')} disabled={decideRecord.isPending}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDecision('REJECT')}
                  disabled={decideRecord.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}

            {dirtyCount > 0 && (
              <span className="text-sm text-amber-700 dark:text-amber-400">
                {dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Cells outside their specification are shown in red; amber means edited but not yet
            saved.
          </p>
        </CardContent>
      </Card>

      {/* ---- add an observation-time column ---- */}
      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add observation time</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="slot-time">Time</Label>
            <Input
              id="slot-time"
              type="time"
              value={newTime}
              autoFocus
              onChange={(event) => setNewTime(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleAddTimeSlot();
              }}
            />
            <p className="text-xs text-muted-foreground">
              Adds a column to the sheet. The column is stored when you save the first value in it.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTimeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTimeSlot}>Add column</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printPortal}
    </div>
  );
}
