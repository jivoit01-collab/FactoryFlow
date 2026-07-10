import { AlertTriangle, ArrowLeft, Footprints, History, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { RETURNABLE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  ReturnableReasonDialog,
  ReturnableStatusBadge,
  ReturnableTimeline,
  ReturnableTypeBadge,
} from '@/modules/maintenance/components/returnable';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';

import {
  useGateOutReturnable,
  useRejectReturnableAtGate,
  useReturnableGatePass,
} from '../../api/returnable';
import { ReturnableVehicleFields } from '../../components/returnable/ReturnableVehicleFields';
import {
  EMPTY_VEHICLE_FORM,
  type ReturnableVehicleFormData,
} from '../../components/returnable/returnableVehicleForm';

function ReadOnlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || '—'}</dd>
    </div>
  );
}

/**
 * Stage 2 of the returnable flow. The gate confirms the items physically match
 * the pass, records its own vehicle and driver details, and lets the material out.
 *
 * The gate cannot change quantities — if what turns up does not match the pass,
 * it goes back to the department with a reason. Silent edits at the gate would
 * make the document useless as an audit trail.
 */
export default function ReturnOutFormPage() {
  const { passId } = useParams<{ passId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const id = passId ? Number(passId) : null;
  const { data: pass, isLoading } = useReturnableGatePass(id);

  const [vehicle, setVehicle] = useState<ReturnableVehicleFormData>(EMPTY_VEHICLE_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ReturnableVehicleFormData, string>>>({});
  const [remarks, setRemarks] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  // Some material simply walks out — a gauge carried to a workshop across the
  // road. There is no vehicle, so the gate records who carried it instead.
  const [isHandCarried, setIsHandCarried] = useState(false);
  const [carriedBy, setCarriedBy] = useState('');
  const [carriedByError, setCarriedByError] = useState('');

  const gateOutMutation = useGateOutReturnable();
  const rejectMutation = useRejectReturnableAtGate();

  const canGateOut = hasPermission(RETURNABLE_PERMISSIONS.GATE_OUT);
  const canReject = hasPermission(RETURNABLE_PERMISSIONS.REJECT_AT_GATE);

  if (isLoading || !pass || !id) {
    return <div className="p-6 text-muted-foreground">Loading gate pass…</div>;
  }

  // Already handled. Show it read-only rather than a dead end — the gate still
  // needs to look up what left, on which vehicle, and what happened since.
  const isAwaitingGateOut = pass.status === 'PENDING_GATE_OUT';

  const validate = () => {
    // A hand-carried pass has no vehicle to validate — only a carrier.
    if (isHandCarried) {
      const nextError = carriedBy.trim() ? '' : 'Name the person carrying the material out';
      setCarriedByError(nextError);
      return !nextError;
    }

    const nextErrors: Partial<Record<keyof ReturnableVehicleFormData, string>> = {};
    if (!vehicle.vehicleId && !vehicle.vehicleNumber.trim()) {
      nextErrors.vehicleNumber = 'Select a vehicle or enter the vehicle number';
    }
    if (!vehicle.driverId && !vehicle.driverName.trim()) {
      nextErrors.driverName = 'Select a driver or enter the driver name';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleGateOut = async () => {
    if (!validate()) return;
    try {
      await gateOutMutation.mutateAsync({
        passId: id,
        payload: isHandCarried
          ? {
              is_hand_carried: true,
              carried_by_name: carriedBy.trim(),
              security_name: vehicle.securityName,
              out_remarks: remarks,
            }
          : {
              is_hand_carried: false,
              vehicle: vehicle.vehicleId || null,
              driver: vehicle.driverId || null,
              transporter: vehicle.transporterId || null,
              vehicle_number_manual: vehicle.vehicleId ? '' : vehicle.vehicleNumber,
              driver_name_manual: vehicle.driverId ? '' : vehicle.driverName,
              driver_mobile: vehicle.driverMobile,
              security_name: vehicle.securityName,
              out_remarks: remarks,
            },
      });
      toast.success(
        pass.is_returnable
          ? `${pass.pass_no} gated out. The department has been notified.`
          : `${pass.pass_no} gated out and closed — non-returnable.`,
      );
      navigate('/gate/return-out');
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Could not gate out this pass.';
      toast.error(detail);
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await rejectMutation.mutateAsync({ passId: id, payload: { reason } });
      toast.success(`${pass.pass_no} sent back to the department.`);
      setIsRejectOpen(false);
      navigate('/gate/return-out');
    } catch {
      toast.error('Could not reject this pass.');
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/gate/return-out')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to queue
        </Button>
        <h1 className="mt-2 text-2xl font-semibold">
          {isAwaitingGateOut ? 'Gate Out' : 'Gate Pass'} — {pass.pass_no}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <ReturnableStatusBadge
            status={pass.status}
            isOverdue={pass.is_overdue}
            daysOverdue={pass.days_overdue}
          />
          <ReturnableTypeBadge isReturnable={pass.is_returnable} />
          <p className="text-sm text-muted-foreground">
            {pass.purpose_display} · {pass.destination}
            {pass.expected_return_date
              ? ` · Expected back ${new Date(pass.expected_return_date).toLocaleDateString()}`
              : ''}
          </p>
        </div>
      </div>

      {!pass.is_returnable && isAwaitingGateOut ? (
        <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Non-returnable — this material is not coming back. Gating it out closes the pass, and it
          will not appear in the Material In queue.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isAwaitingGateOut ? 'Verify Items Leaving' : 'Items'} ({pass.items.length})
          </CardTitle>
          {isAwaitingGateOut ? (
            <p className="text-sm text-muted-foreground">
              Check each line against what is physically loaded. If anything does not match, reject
              the pass instead of gating it out.
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  {/* A non-returnable line carries no serial, make/model or condition. */}
                  {pass.is_returnable ? (
                    <>
                      <th className="px-3 py-2 text-left font-medium">Serial</th>
                      <th className="px-3 py-2 text-left font-medium">Condition</th>
                    </>
                  ) : (
                    <th className="px-3 py-2 text-left font-medium">SAP Code</th>
                  )}
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {pass.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{item.line_num}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{item.item_name}</div>
                      {pass.is_returnable && item.make_model ? (
                        <div className="text-xs text-muted-foreground">{item.make_model}</div>
                      ) : null}
                    </td>
                    {pass.is_returnable ? (
                      <>
                        <td className="px-3 py-2">{item.serial_no || '—'}</td>
                        <td className="px-3 py-2">{item.condition_out_display}</td>
                      </>
                    ) : (
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {item.item_code || '—'}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      {item.quantity_out} {item.uom}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {isAwaitingGateOut ? (
        <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How is it leaving?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={isHandCarried}
              onCheckedChange={(checked) => {
                setIsHandCarried(checked === true);
                setCarriedByError('');
              }}
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Footprints className="h-4 w-4" />
                Carried out by hand — no vehicle
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                For material walked out to a nearby workshop. No vehicle or driver is recorded.
              </span>
            </span>
          </label>

          {isHandCarried ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="carried-by">Carried By</Label>
                <Input
                  id="carried-by"
                  placeholder="Ramesh Kumar"
                  value={carriedBy}
                  onChange={(event) => {
                    setCarriedBy(event.target.value);
                    if (carriedByError) setCarriedByError('');
                  }}
                />
                {carriedByError ? (
                  <p className="text-sm text-destructive">{carriedByError}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="security-name-hand">Security Guard Name</Label>
                <Input
                  id="security-name-hand"
                  value={vehicle.securityName}
                  onChange={(event) =>
                    setVehicle({ ...vehicle, securityName: event.target.value })
                  }
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!isHandCarried ? (
        <ReturnableVehicleFields
          title="Outgoing Vehicle"
          description="Which vehicle is carrying these items out of the gate."
          value={vehicle}
          onChange={setVehicle}
          errors={errors}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gate Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            value={remarks}
            placeholder="Anything the gate wants on record about this movement."
            onChange={(event) => setRemarks(event.target.value)}
          />
        </CardContent>
      </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gate Out Record</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              {pass.is_hand_carried ? (
                <>
                  <ReadOnlyField label="Conveyance" value="Hand-carried (no vehicle)" />
                  <ReadOnlyField label="Carried By" value={pass.carried_by_name} />
                </>
              ) : (
                <>
                  <ReadOnlyField
                    label="Vehicle"
                    value={pass.vehicle_number || pass.vehicle_number_manual}
                  />
                  <ReadOnlyField
                    label="Driver"
                    value={pass.driver_name || pass.driver_name_manual}
                  />
                  <ReadOnlyField label="Driver Mobile" value={pass.driver_mobile} />
                  <ReadOnlyField label="Transporter" value={pass.transporter_name} />
                </>
              )}
              <ReadOnlyField label="Security" value={pass.security_name} />
              <ReadOnlyField
                label="Gated Out At"
                value={pass.gate_out_at ? new Date(pass.gate_out_at).toLocaleString() : ''}
              />
              <ReadOnlyField label="Gated Out By" value={pass.gate_out_by_name} />
              <ReadOnlyField label="Remarks" value={pass.out_remarks} />
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Audit trail — who raised, submitted, approved and rejected this pass,
          and when. The gate should see the whole story before letting it out. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Audit History
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Every action taken on {pass.pass_no}, newest first.
          </p>
        </CardHeader>
        <CardContent>
          <ReturnableTimeline passId={id} />
        </CardContent>
      </Card>

      {isAwaitingGateOut ? (
      <div className="flex flex-wrap justify-end gap-2">
        {canReject ? (
          <Button variant="destructive" onClick={() => setIsRejectOpen(true)}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject &amp; Send Back
          </Button>
        ) : null}
        {canGateOut ? (
          <Button onClick={handleGateOut} disabled={gateOutMutation.isPending}>
            <Truck className="mr-2 h-4 w-4" />
            {gateOutMutation.isPending ? 'Gating out…' : 'Approve & Gate Out'}
          </Button>
        ) : null}
      </div>
      ) : null}

      <ReturnableReasonDialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title={`Reject ${pass.pass_no}`}
        description="The pass goes back to the department as a draft. They will correct it and resubmit."
        confirmLabel="Reject & Send Back"
        destructive
        isPending={rejectMutation.isPending}
        onConfirm={handleReject}
      />
    </div>
  );
}
