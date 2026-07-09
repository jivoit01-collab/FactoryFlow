import { AlertTriangle, ArrowLeft, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { RETURNABLE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { RETURN_CONDITION_OPTIONS } from '@/modules/maintenance/constants/returnable.constants';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  type ItemReturnCondition,
  type ReturnableReturnLineInput,
  useRecordReturnableReturn,
  useReturnableGatePass,
} from '../../api/returnable';
import { ReturnableVehicleFields } from '../../components/returnable/ReturnableVehicleFields';
import {
  EMPTY_VEHICLE_FORM,
  type ReturnableVehicleFormData,
} from '../../components/returnable/returnableVehicleForm';

interface LineDraft {
  include: boolean;
  quantity: string;
  condition: ItemReturnCondition;
  remarks: string;
}

/**
 * Stage 3. The gate records one return trip. Partial returns are normal — a
 * vendor may send back three of five motors — so each line is opted in
 * individually and pre-filled with the quantity still pending.
 */
export default function ReturnInFormPage() {
  const { passId } = useParams<{ passId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const id = passId ? Number(passId) : null;
  const { data: pass, isLoading } = useReturnableGatePass(id);
  const recordReturnMutation = useRecordReturnableReturn();

  const canGateIn = hasPermission(RETURNABLE_PERMISSIONS.GATE_IN);

  const [vehicle, setVehicle] = useState<ReturnableVehicleFormData>(EMPTY_VEHICLE_FORM);
  const [remarks, setRemarks] = useState('');
  const [drafts, setDrafts] = useState<Record<number, LineDraft>>({});

  // Only lines with something still outstanding can come back.
  const pendingItems = useMemo(
    () => (pass?.items ?? []).filter((item) => Number(item.pending_return_qty) > 0),
    [pass],
  );

  const draftFor = (itemId: number, pendingQty: string): LineDraft =>
    drafts[itemId] ?? { include: true, quantity: pendingQty, condition: 'OK', remarks: '' };

  const patchDraft = (itemId: number, pendingQty: string, patch: Partial<LineDraft>) =>
    setDrafts((previous) => ({
      ...previous,
      [itemId]: { ...draftFor(itemId, pendingQty), ...patch },
    }));

  if (isLoading || !pass || !id) {
    return <div className="p-6 text-muted-foreground">Loading gate pass…</div>;
  }

  const handleSubmit = async () => {
    const lines: ReturnableReturnLineInput[] = pendingItems
      .map((item) => ({ item, draft: draftFor(item.id, item.pending_return_qty) }))
      .filter(({ draft }) => draft.include && Number(draft.quantity) > 0)
      .map(({ item, draft }) => ({
        pass_item: item.id,
        quantity_returned: draft.quantity,
        return_condition: draft.condition,
        remarks: draft.remarks,
      }));

    if (!lines.length) {
      toast.error('Select at least one item that has come back.');
      return;
    }

    const overReturned = lines.find((line) => {
      const item = pendingItems.find((candidate) => candidate.id === line.pass_item)!;
      return Number(line.quantity_returned) > Number(item.pending_return_qty);
    });
    if (overReturned) {
      toast.error('A returned quantity is larger than what is still pending.');
      return;
    }

    try {
      await recordReturnMutation.mutateAsync({
        passId: id,
        payload: {
          vehicle: vehicle.vehicleId || null,
          driver: vehicle.driverId || null,
          transporter: vehicle.transporterId || null,
          vehicle_number_manual: vehicle.vehicleId ? '' : vehicle.vehicleNumber,
          driver_name_manual: vehicle.driverId ? '' : vehicle.driverName,
          driver_mobile: vehicle.driverMobile,
          security_name: vehicle.securityName,
          remarks,
          lines,
        },
      });
      toast.success('Return recorded. The department has been asked to collect the items.');
      navigate('/gate/return-in');
    } catch (error) {
      const response = (error as { response?: { data?: { detail?: string; lines?: string[] } } })
        ?.response?.data;
      toast.error(response?.lines?.[0] ?? response?.detail ?? 'Could not record this return.');
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/gate/return-in')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to queue
        </Button>
        <h1 className="mt-2 text-2xl font-semibold">Record Return — {pass.pass_no}</h1>
        <p className="text-sm text-muted-foreground">
          {pass.purpose_display} · {pass.party_name} · Gated out{' '}
          {pass.gate_out_at ? new Date(pass.gate_out_at).toLocaleDateString() : '—'}
        </p>
      </div>

      {pass.is_overdue ? (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <AlertTriangle className="h-4 w-4" />
          This pass is {pass.days_overdue} day(s) past its expected return date.
        </div>
      ) : null}

      {pass.return_events.length > 0 ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          {pass.return_events.length} earlier return trip(s) already recorded.{' '}
          {pass.total_quantity_returned} of {pass.total_quantity_out} units are back.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items Coming Back</CardTitle>
          <p className="text-sm text-muted-foreground">
            Untick anything that has not arrived. Quantities are pre-filled with what is still
            pending — reduce them for a partial return.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="w-10 px-3 py-2" />
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-left font-medium">Serial</th>
                  <th className="px-3 py-2 text-right font-medium">Pending</th>
                  <th className="px-3 py-2 text-left font-medium">Returning Qty</th>
                  <th className="px-3 py-2 text-left font-medium">Condition</th>
                  <th className="px-3 py-2 text-left font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      Every item on this pass is already back.
                    </td>
                  </tr>
                ) : (
                  pendingItems.map((item) => {
                    const draft = draftFor(item.id, item.pending_return_qty);
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">
                          <Checkbox
                            checked={draft.include}
                            onCheckedChange={(checked) =>
                              patchDraft(item.id, item.pending_return_qty, {
                                include: checked === true,
                              })
                            }
                            aria-label={`Include ${item.item_name}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{item.item_name}</div>
                          {item.make_model ? (
                            <div className="text-xs text-muted-foreground">{item.make_model}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{item.serial_no || '—'}</td>
                        <td className="px-3 py-2 text-right">
                          {item.pending_return_qty} {item.uom}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            className="w-28"
                            inputMode="decimal"
                            disabled={!draft.include}
                            value={draft.quantity}
                            onChange={(event) =>
                              patchDraft(item.id, item.pending_return_qty, {
                                quantity: event.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <NativeSelect
                            disabled={!draft.include}
                            value={draft.condition}
                            onChange={(event) =>
                              patchDraft(item.id, item.pending_return_qty, {
                                condition: event.target.value as ItemReturnCondition,
                              })
                            }
                          >
                            {RETURN_CONDITION_OPTIONS.map((option) => (
                              <SelectOption key={option.value} value={option.value}>
                                {option.label}
                              </SelectOption>
                            ))}
                          </NativeSelect>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            disabled={!draft.include}
                            value={draft.remarks}
                            onChange={(event) =>
                              patchDraft(item.id, item.pending_return_qty, {
                                remarks: event.target.value,
                              })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ReturnableVehicleFields
        title="Returning Vehicle"
        description="This need not be the vehicle that took the items out — vendors usually send their own."
        value={vehicle}
        onChange={setVehicle}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gate Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            value={remarks}
            placeholder="Condition of the consignment, missing paperwork, anything worth recording."
            onChange={(event) => setRemarks(event.target.value)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        {canGateIn ? (
          <Button
            onClick={handleSubmit}
            disabled={recordReturnMutation.isPending || pendingItems.length === 0}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            {recordReturnMutation.isPending ? 'Recording…' : 'Approve & Record Return'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
