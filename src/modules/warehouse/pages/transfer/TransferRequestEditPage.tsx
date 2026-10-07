/**
 * Change a transfer request while it waits for a decision.
 *
 * Open to whoever raised it until the other side approves or rejects — after
 * that the quantities are the approver's to trim. The route is fixed: it
 * decides who approves, so a different route is a different request.
 *
 * Changed lines replace the request in SAP: a new inventory transfer request
 * carries them and the old one is closed, so the stock stays reserved
 * throughout. Remarks are the app's alone and never reach SAP.
 */

import { ArrowLeft, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { useAuth, usePermission } from '@/core/auth';
import { confirmSapPost } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Label, Textarea } from '@/shared/components/ui';

import { useTransferRequest, useUpdateTransferRequest } from '../../api';
import type { TransferRequestDetail } from '../../types';
import { Route, RouteBadge } from './TransferBadges';
import {
  batchProblems,
  draftFromLine,
  type DraftLine,
  filledLines,
  hasFractionalWholeUnit,
  sameAsSaved,
  sameBatchesAsSaved,
  toLineInputs,
} from './transferDraftLines';
import { TransferLinesEditor } from './TransferLinesEditor';

export default function TransferRequestEditPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { data: request, isLoading, isError } = useTransferRequest(Number(requestId));

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading request…</p>;
  if (isError || !request) {
    return <p className="p-6 text-sm text-red-600">Could not load this transfer request.</p>;
  }
  // Keyed so the form starts from the request as it was opened, and a
  // background refetch never overwrites what is being typed.
  return <EditForm key={request.id} request={request} />;
}

function EditForm({ request: r }: { request: TransferRequestDetail }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const update = useUpdateTransferRequest();

  const [remarks, setRemarks] = useState(r.remarks);
  const [lines, setLines] = useState<DraftLine[]>(() => r.lines.map(draftFromLine));
  const [error, setError] = useState('');

  const filled = useMemo(() => filledLines(lines), [lines]);
  const linesChanged = !sameAsSaved(filled, r.lines);
  // Batches never reach SAP, so a change to them alone saves without replacing
  // SAP's request — and without asking to.
  const batchesChanged = !linesChanged && !sameBatchesAsSaved(filled, r.lines);
  const unbalanced = useMemo(() => batchProblems(filled), [filled]);
  const canSave =
    filled.length > 0 &&
    !hasFractionalWholeUnit(filled) &&
    unbalanced.length === 0 &&
    (linesChanged || batchesChanged || remarks !== r.remarks);

  const backToRequest = () => navigate(`/warehouse/inventory-transfer/${r.id}`);

  // The server refuses both of these anyway; saying so here beats a form that
  // only fails on save.
  const refusal =
    r.status !== 'PENDING'
      ? `${r.entry_no} is already ${r.status_display.toLowerCase()}, so it can no longer be changed.`
      : !user ||
          user.id !== r.requested_by ||
          !hasPermission(WAREHOUSE_PERMISSIONS.CREATE_TRANSFER_REQUEST)
        ? `Only ${r.requested_by_name || 'the person who raised it'} can change ${r.entry_no}.`
        : '';

  async function save() {
    setError('');
    if (linesChanged) {
      const confirmed = await confirmSapPost({
        title: 'Replace the request in SAP?',
        description:
          'The changed lines go to SAP as a new transfer request and the old one is closed, so the stock stays reserved throughout.',
        details: [
          !!r.sap_request_doc_num && {
            label: 'Closes',
            value: `Inventory Transfer Request ${r.sap_request_doc_num}`,
          },
          { label: 'Creates', value: 'Inventory Transfer Request' },
          { label: 'From', value: r.from_warehouse },
          { label: 'To', value: r.to_warehouse },
          { label: 'Lines', value: filled.length },
        ],
        confirmLabel: 'Save and replace it',
      });
      if (!confirmed) return;
    }
    try {
      await update.mutateAsync({
        requestId: r.id,
        data: { remarks, lines: toLineInputs(filled) },
      });
      backToRequest();
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Could not save the changes. Try again in a moment.',
      );
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Edit ${r.entry_no}`}
        description="Items, quantities, batches and remarks can change until the request is approved or rejected."
      >
        <Button variant="outline" onClick={backToRequest}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </DashboardHeader>

      {refusal ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {refusal}
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <div className="text-sm font-medium">Route</div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Route from={r.from_warehouse} to={r.to_warehouse} />
                  <RouteBadge routeType={r.route_type} />
                </div>
                <p className="text-xs text-muted-foreground">
                  The route decides who approves, so it stays as raised. For a different route,
                  raise a new request.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Why (optional)</Label>
                <Textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Anything the other warehouse should know"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <TransferLinesEditor
            warehouse={r.from_warehouse}
            lines={lines}
            onChange={setLines}
            excludeRequest={r.id}
          />

          {linesChanged && r.sap_request_doc_num && (
            <p className="text-xs text-muted-foreground">
              Saving closes SAP request {r.sap_request_doc_num} and raises a new one with these
              lines.
            </p>
          )}

          {unbalanced.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
              {unbalanced.map((problem) => (
                <p key={problem}>{problem}</p>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={backToRequest}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!canSave || update.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
