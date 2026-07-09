import { ArrowLeft, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { RETURNABLE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { ReturnableReasonDialog } from '@/modules/maintenance/components/returnable';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

  const gateOutMutation = useGateOutReturnable();
  const rejectMutation = useRejectReturnableAtGate();

  const canGateOut = hasPermission(RETURNABLE_PERMISSIONS.GATE_OUT);
  const canReject = hasPermission(RETURNABLE_PERMISSIONS.REJECT_AT_GATE);

  if (isLoading || !pass || !id) {
    return <div className="p-6 text-muted-foreground">Loading gate pass…</div>;
  }

  if (pass.status !== 'PENDING_GATE_OUT') {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/gate/return-out')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to queue
        </Button>
        <p className="text-muted-foreground">
          {pass.pass_no} is <strong>{pass.status_display}</strong> and is no longer waiting for gate
          out.
        </p>
      </div>
    );
  }

  const validate = () => {
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
        payload: {
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
      toast.success(`${pass.pass_no} gated out. The department has been notified.`);
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
        <h1 className="mt-2 text-2xl font-semibold">Gate Out — {pass.pass_no}</h1>
        <p className="text-sm text-muted-foreground">
          {pass.purpose_display} · {pass.party_name} · Expected back{' '}
          {new Date(pass.expected_return_date).toLocaleDateString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verify Items Leaving ({pass.items.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Check each line against what is physically loaded. If anything does not match, reject
            the pass instead of gating it out.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-left font-medium">Serial</th>
                  <th className="px-3 py-2 text-left font-medium">Condition</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {pass.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{item.line_num}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{item.item_name}</div>
                      {item.make_model ? (
                        <div className="text-xs text-muted-foreground">{item.make_model}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{item.serial_no || '—'}</td>
                    <td className="px-3 py-2">{item.condition_out_display}</td>
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

      <ReturnableVehicleFields
        title="Outgoing Vehicle"
        description="Which vehicle is carrying these items out of the gate."
        value={vehicle}
        onChange={setVehicle}
        errors={errors}
      />

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
