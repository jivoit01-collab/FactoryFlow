import { AlertCircle, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  type CreateWeighmentRequest,
  type EmptyVehicleEligibleEntry,
  useCreateEmptyVehicleGateOut,
  useCreateWeighment,
  useWeighment,
} from '@/modules/gate/api';
import { ChallanWeightCard } from '@/modules/gate/components/ChallanWeightCard';
import { RequiredWeighmentForm } from '@/modules/gate/components/RequiredWeighmentForm';
import { buildEmptyOutSideEffectMessage } from '@/modules/gate/pages/emptyVehicleOutPages/emptyVehicleOutDraft.storage';
import {
  buildRequiredWeighmentDateTime,
  EMPTY_REQUIRED_WEIGHMENT,
  type RequiredWeighmentValues,
  validateRequiredWeighment,
} from '@/modules/gate/utils';
import {
  Button,
  type ButtonProps,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

function nowParts() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

function toFiniteNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

/**
 * A per-entry "mark out empty" button that opens the quick out modal. Render it on a
 * dashboard row (or a detail page) for a vehicle that the eligible-entries API says can
 * still leave empty. Everything the modal needs (requires_weighment, dispatch side
 * effects, vehicle/driver labels) comes from that eligible-entry payload.
 */
export function EmptyVehicleOutButton({
  entry,
  onCompleted,
  size = 'sm',
  variant = 'outline',
  label = 'Out (empty)',
  className,
}: {
  entry: EmptyVehicleEligibleEntry;
  onCompleted?: () => void;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    // Rows this button sits in are often clickable (navigate to detail). The dialog is
    // portaled, but React still bubbles its events up the component tree, so a Cancel /
    // overlay / X click would fire the row's onClick and navigate away. Swallow clicks
    // here so the row is never triggered from the button or its dialog.
    <span className="contents" onClick={(event) => event.stopPropagation()}>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <LogOut className="h-4 w-4" />
        {label}
      </Button>
      <EmptyVehicleOutDialog
        entry={entry}
        open={open}
        onOpenChange={setOpen}
        onCompleted={onCompleted}
      />
    </span>
  );
}

export function EmptyVehicleOutDialog({
  entry,
  open,
  onOpenChange,
  onCompleted,
}: {
  entry: EmptyVehicleEligibleEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {/* Mount the form only while open so each open starts fresh (now-defaults,
            cleared fields) via useState initializers — no reset effect needed. */}
        {open ? (
          <EmptyVehicleOutForm
            entry={entry}
            onClose={() => onOpenChange(false)}
            onCompleted={onCompleted}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EmptyVehicleOutForm({
  entry,
  onClose,
  onCompleted,
}: {
  entry: EmptyVehicleEligibleEntry;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const vehicleEntryId = entry.id;
  const requiresWeighment = entry.requires_weighment;
  const initial = nowParts();

  const [values, setValues] = useState<RequiredWeighmentValues>(EMPTY_REQUIRED_WEIGHMENT);
  const [challanWeight, setChallanWeight] = useState('');
  const [gateOutDate, setGateOutDate] = useState(initial.date);
  const [outTime, setOutTime] = useState(initial.time);
  const [securityName, setSecurityName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const createWeighment = useCreateWeighment(vehicleEntryId);
  const createGateOut = useCreateEmptyVehicleGateOut();
  const { data: existingWeighment } = useWeighment(vehicleEntryId);

  // Prefill any weighment already recorded for this vehicle entry.
  useEffect(() => {
    if (!existingWeighment) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the weighment step: sync fetched weighment into the editable form.
    setValues({
      grossWeight: existingWeighment.gross_weight || '',
      tareWeight: existingWeighment.tare_weight || '',
      weighbridgeSlipNo: existingWeighment.weighbridge_slip_no || '',
      firstWeighmentTime: existingWeighment.first_weighment_time
        ? existingWeighment.first_weighment_time.slice(11, 16)
        : '',
      secondWeighmentTime: existingWeighment.second_weighment_time
        ? existingWeighment.second_weighment_time.slice(11, 16)
        : '',
    });
    if (existingWeighment.challan_weight != null) {
      setChallanWeight(String(existingWeighment.challan_weight));
    }
  }, [existingWeighment]);

  const isSaving = createWeighment.isPending || createGateOut.isPending;
  const sideEffectMessage = buildEmptyOutSideEffectMessage(
    entry.release_invoice_count ?? 0,
    entry.release_cancels_docking ?? false,
  );

  const grossNum = toFiniteNumber(values.grossWeight);
  const tareNum = toFiniteNumber(values.tareWeight);
  const netWeight = grossNum !== null && tareNum !== null ? grossNum - tareNum : null;
  const showWeighment = requiresWeighment || Boolean(values.grossWeight) || Boolean(values.tareWeight);

  const handleValueChange = (field: keyof RequiredWeighmentValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleComplete = async () => {
    if (!gateOutDate || !outTime) {
      setError('Enter the gate-out date and time.');
      return;
    }

    // RM / job-work must weigh; exempt vehicles weigh only if a weight was typed.
    const enteredWeight = values.grossWeight.trim() !== '' || values.tareWeight.trim() !== '';
    const mustWeigh = requiresWeighment || enteredWeight;

    if (mustWeigh) {
      const validationError = validateRequiredWeighment(values);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    let challanWeightValue: number | null = null;
    if (challanWeight.trim() !== '') {
      challanWeightValue = Number(challanWeight);
      if (!Number.isFinite(challanWeightValue) || challanWeightValue < 0) {
        setError('Enter a valid challan weight, or leave it blank.');
        return;
      }
    }

    try {
      if (mustWeigh) {
        const requestData: CreateWeighmentRequest = {
          gross_weight: parseFloat(values.grossWeight),
          tare_weight: parseFloat(values.tareWeight),
          challan_weight: challanWeightValue,
          weighbridge_slip_no: values.weighbridgeSlipNo,
          first_weighment_time: buildRequiredWeighmentDateTime(values.firstWeighmentTime),
          second_weighment_time: buildRequiredWeighmentDateTime(values.secondWeighmentTime),
        };
        await createWeighment.mutateAsync(requestData);
      }

      await createGateOut.mutateAsync({
        vehicle_entry_id: vehicleEntryId,
        gate_out_date: gateOutDate,
        out_time: outTime,
        security_name: securityName,
        remarks,
      });

      toast.success('Vehicle marked out empty');
      onClose();
      onCompleted?.();
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Failed to mark the vehicle out empty'));
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <LogOut className="h-5 w-5" />
          Mark Vehicle Out (Empty)
        </DialogTitle>
        <DialogDescription>
          {entry.vehicle_number}
          {entry.driver_name ? ` · ${entry.driver_name}` : ''} · In entry {entry.entry_no}
          {requiresWeighment ? ' — weighment required before exit.' : '.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="evo-gate-out-date">Gate-out Date</Label>
            <Input
              id="evo-gate-out-date"
              type="date"
              value={gateOutDate}
              disabled={isSaving}
              onChange={(event) => {
                setGateOutDate(event.target.value);
                setError('');
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="evo-out-time">Out Time</Label>
            <Input
              id="evo-out-time"
              type="time"
              value={outTime}
              disabled={isSaving}
              onChange={(event) => {
                setOutTime(event.target.value);
                setError('');
              }}
            />
          </div>
        </div>

        {showWeighment ? (
          <>
            <RequiredWeighmentForm
              values={values}
              onChange={handleValueChange}
              disabled={isSaving}
              requiredFields={{ grossWeight: requiresWeighment, tareWeight: requiresWeighment }}
            />
            <ChallanWeightCard
              value={challanWeight}
              onChange={(next) => {
                setChallanWeight(next);
                setError('');
              }}
              net={netWeight}
              disabled={isSaving}
            />
          </>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="evo-security">Security Name (optional)</Label>
            <Input
              id="evo-security"
              value={securityName}
              disabled={isSaving}
              onChange={(event) => setSecurityName(event.target.value)}
              placeholder="Guard on duty"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="evo-remarks">Remarks (optional)</Label>
            <Input
              id="evo-remarks"
              value={remarks}
              disabled={isSaving}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Any note"
            />
          </div>
        </div>

        {sideEffectMessage ? (
          <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{sideEffectMessage} This happens when you complete the gate out.</span>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void handleComplete()} disabled={isSaving}>
          <LogOut className="h-4 w-4" />
          {isSaving ? 'Marking out...' : 'Complete Gate Out'}
        </Button>
      </DialogFooter>
    </>
  );
}
