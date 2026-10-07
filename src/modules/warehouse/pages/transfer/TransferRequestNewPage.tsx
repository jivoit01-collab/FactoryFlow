import { ArrowLeft, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { confirmSapPost } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Label, NativeSelect, Textarea } from '@/shared/components/ui';

import { useCreateTransferRequest, useWarehouseScope, useWMSWarehouses } from '../../api';
import {
  batchProblems,
  type DraftLine,
  filledLines,
  hasFractionalWholeUnit,
  newDraftLine,
  toLineInputs,
} from './transferDraftLines';
import { TransferLinesEditor } from './TransferLinesEditor';

export default function TransferRequestNewPage() {
  const navigate = useNavigate();
  const { data: warehouseData, isLoading: warehousesLoading } = useWMSWarehouses();
  const warehouses = useMemo(() => warehouseData?.warehouses ?? [], [warehouseData]);

  // Only a warehouse's own manager may send its stock out, so the source list is
  // narrowed to theirs rather than letting them pick one the server will refuse.
  // The destination stays open: they are asking another warehouse to accept, and
  // that warehouse's manager is the one who decides.
  const scope = useWarehouseScope();
  const sourceWarehouses = useMemo(
    () => (scope.unrestricted ? warehouses : warehouses.filter((w) => scope.manages(w.code))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope.unrestricted, scope.codes, warehouses],
  );
  // Only when the scope is KNOWN and genuinely empty. An unreachable endpoint
  // must not tell people to go and see an administrator.
  const noSourceWarehouse = scope.managesNothing;
  const createRequest = useCreateTransferRequest();

  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([newDraftLine()]);
  const [error, setError] = useState('');

  const filled = useMemo(() => filledLines(lines), [lines]);
  const unbalanced = useMemo(() => batchProblems(filled), [filled]);

  const sameWarehouse = !!fromWarehouse && fromWarehouse === toWarehouse;
  const canSubmit =
    !!fromWarehouse &&
    !!toWarehouse &&
    !sameWarehouse &&
    filled.length > 0 &&
    !hasFractionalWholeUnit(filled) &&
    unbalanced.length === 0;

  // Items are picked from a specific warehouse's stock, so changing the source
  // invalidates every line — keeping them would show another warehouse's
  // free-stock figures against these items.
  function changeSource(next: string) {
    setFromWarehouse(next);
    setLines([newDraftLine()]);
  }

  async function submit() {
    setError('');
    const confirmed = await confirmSapPost({
      title: 'Raise this request in SAP?',
      details: [
        { label: 'Creates', value: 'Inventory Transfer Request' },
        { label: 'From', value: fromWarehouse },
        { label: 'To', value: toWarehouse },
        { label: 'Lines', value: filled.length },
      ],
      confirmLabel: 'Raise the request',
    });
    if (!confirmed) return;
    try {
      const created = await createRequest.mutateAsync({
        from_warehouse: fromWarehouse,
        to_warehouse: toWarehouse,
        remarks,
        lines: toLineInputs(filled),
      });
      navigate(`/warehouse/inventory-transfer/${created.id}`);
    } catch (err) {
      // The backend refuses routes SAP would reject and says why, so surface its
      // message verbatim rather than a generic failure.
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Could not raise the request. Try again in a moment.';
      setError(message);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Raise a Transfer Request"
      >
        <Button variant="outline" onClick={() => navigate('/warehouse/inventory-transfer')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </DashboardHeader>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from-warehouse">Send from</Label>
              <NativeSelect
                id="from-warehouse"
                value={fromWarehouse}
                onChange={(e) => changeSource(e.target.value)}
                disabled={warehousesLoading || noSourceWarehouse}
              >
                <option value="">
                  {noSourceWarehouse ? 'No warehouse assigned to you' : 'Select a warehouse…'}
                </option>
                {sourceWarehouses.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </NativeSelect>
              {noSourceWarehouse && (
                <p className="text-sm text-red-600">
                  You are not set as the manager of any warehouse in this company, so you
                  cannot raise a transfer. An administrator assigns this on Admin →
                  Warehouse Managers.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-warehouse">Send to</Label>
              <NativeSelect
                id="to-warehouse"
                value={toWarehouse}
                onChange={(e) => setToWarehouse(e.target.value)}
                disabled={warehousesLoading}
              >
                <option value="">Select a warehouse…</option>
                {warehouses.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {sameWarehouse && (
            <p className="text-sm text-red-600">
              Source and destination are the same warehouse, so nothing would move.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="remarks">Why (optional)</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Anything the receiving warehouse should know"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <TransferLinesEditor warehouse={fromWarehouse} lines={lines} onChange={setLines} />

      {/* Said by the button as well as on the line, which may be scrolled away. */}
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
        <Button variant="outline" onClick={() => navigate('/warehouse/inventory-transfer')}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!canSubmit || createRequest.isPending}>
          <Send className="mr-2 h-4 w-4" />
          {createRequest.isPending ? 'Raising…' : 'Raise request'}
        </Button>
      </div>
    </div>
  );
}
