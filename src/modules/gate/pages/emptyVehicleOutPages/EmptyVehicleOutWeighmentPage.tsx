import { AlertCircle, ExternalLink, FileText, LogOut, Paperclip, Scale, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type CreateWeighmentRequest,
  useCreateEmptyVehicleGateOut,
  useCreateWeighment,
  useGateAttachments,
  useUploadAttachment,
  useWeighment,
} from '@/modules/gate/api';
import {
  RequiredWeighmentForm,
  StepFooter,
  StepHeader,
  StepLoadingSpinner,
} from '@/modules/gate/components';
import {
  buildRequiredWeighmentDateTime,
  EMPTY_REQUIRED_WEIGHMENT,
  type RequiredWeighmentValues,
  validateRequiredWeighment,
} from '@/modules/gate/utils';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { cn, getErrorMessage, isNotFoundError as checkNotFoundError } from '@/shared/utils';

import {
  buildEmptyOutSideEffectMessage,
  clearEmptyVehicleOutDraft,
  type EmptyVehicleOutDraft,
  readEmptyVehicleOutDraft,
} from './emptyVehicleOutDraft.storage';

export default function EmptyVehicleOutWeighmentPage() {
  const navigate = useNavigate();
  const [draft] = useState<EmptyVehicleOutDraft | null>(() => readEmptyVehicleOutDraft());
  const [values, setValues] = useState<RequiredWeighmentValues>(EMPTY_REQUIRED_WEIGHMENT);
  const [challanWeight, setChallanWeight] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createWeighment = useCreateWeighment(draft?.vehicleEntryId || 0);
  const createGateOut = useCreateEmptyVehicleGateOut();
  const { data: gatepassAttachments = [] } = useGateAttachments(draft?.vehicleEntryId || null);
  const uploadGatepass = useUploadAttachment(draft?.vehicleEntryId || 0);
  const {
    data: existingWeighment,
    isLoading,
    error: weighmentError,
  } = useWeighment(draft?.vehicleEntryId || null);

  useEffect(() => {
    if (!existingWeighment) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing fetched weighment into the editable form matches the gate step pattern.
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
    setChallanWeight(
      existingWeighment.challan_weight != null ? String(existingWeighment.challan_weight) : '',
    );
  }, [existingWeighment]);

  const handleValueChange = (field: keyof RequiredWeighmentValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleGatepassSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!draft?.vehicleEntryId || files.length === 0) return;

    setError('');

    for (const file of files) {
      try {
        await uploadGatepass.mutateAsync(file);
      } catch (err) {
        setError(getErrorMessage(err, `Failed to upload ${file.name}`));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // RM / job-work vehicles must weigh. For exempt vehicles this page is reached
  // only via the optional "Record Weighment" path, so weighment is captured only
  // when the operator actually enters a weight -- otherwise we just mark out.
  const requiresWeighment = draft?.requiresWeighment ?? true;

  const handleComplete = async () => {
    if (!draft) {
      setError('Vehicle details are missing. Please fill details again.');
      return;
    }

    const enteredWeight =
      values.grossWeight.trim() !== '' || values.tareWeight.trim() !== '';
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
        vehicle_entry_id: draft.vehicleEntryId,
        gate_out_date: draft.gateOutDate,
        out_time: draft.outTime,
        security_name: draft.securityName,
        remarks: draft.remarks,
      });

      clearEmptyVehicleOutDraft();
      toast.success('Vehicle marked out empty');
      navigate('/gate/empty-vehicle-out');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to complete empty vehicle out'));
    }
  };

  if (isLoading) {
    return <StepLoadingSpinner />;
  }

  if (!draft) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader currentStep={2} totalSteps={2} title="Empty Vehicle Out" error={error || null} />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Vehicle details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate('/gate/empty-vehicle-out/new')}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  const missingExistingWeighment =
    requiresWeighment && weighmentError && checkNotFoundError(weighmentError)
      ? 'No existing weighment found. Fill it before completing gate out.'
      : '';

  const sideEffectMessage = buildEmptyOutSideEffectMessage(
    draft.releaseInvoiceCount ?? 0,
    draft.releaseCancelsDocking ?? false,
  );

  const grossNum = toFiniteNumber(values.grossWeight);
  const tareNum = toFiniteNumber(values.tareWeight);
  const netWeight = grossNum !== null && tareNum !== null ? grossNum - tareNum : null;

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={2}
        totalSteps={2}
        title={requiresWeighment ? 'Empty Vehicle Out' : 'Empty Vehicle Out — Weighment (optional)'}
        error={error || missingExistingWeighment || null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Vehicle Exit
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="In Entry" value={draft.vehicleEntryNo} />
          <InfoItem label="Vehicle" value={draft.vehicleNumber} />
          <InfoItem label="Driver" value={draft.driverName} />
          <InfoItem label="Gate Out" value={`${draft.gateOutDate} ${draft.outTime}`} />
        </CardContent>
      </Card>

      <RequiredWeighmentForm
        values={values}
        onChange={handleValueChange}
        disabled={createWeighment.isPending || createGateOut.isPending}
        requiredFields={{ grossWeight: requiresWeighment, tareWeight: requiresWeighment }}
      />

      <ChallanWeightCard
        value={challanWeight}
        onChange={(next) => {
          setChallanWeight(next);
          setError('');
        }}
        net={netWeight}
        disabled={createWeighment.isPending || createGateOut.isPending}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Gatepass Document (optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            type="button"
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-primary/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm font-medium">Click to upload gatepass document</span>
            <span className="text-xs text-muted-foreground">Gatepass scan, photo, or PDF</span>
            {uploadGatepass.isPending && (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Uploading...
              </span>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleGatepassSelect}
          />

          {gatepassAttachments.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gatepassAttachments.map((attachment) => {
                const fileName = attachment.file_name || attachment.file.split('/').pop() || 'Gatepass';
                return (
                  <a
                    key={attachment.id}
                    href={attachment.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium" title={fileName}>
                      {fileName}
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Optional — attach a gatepass document if you have one.
            </p>
          )}
        </CardContent>
      </Card>

      {sideEffectMessage && (
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            {sideEffectMessage} This happens when you complete the gate out.
          </span>
        </div>
      )}

      <StepFooter
        onPrevious={() => navigate('/gate/empty-vehicle-out/new')}
        onCancel={() => navigate('/gate/empty-vehicle-out')}
        onNext={handleComplete}
        isSaving={createWeighment.isPending || createGateOut.isPending || uploadGatepass.isPending}
        nextLabel={
          createWeighment.isPending || createGateOut.isPending
            ? 'Completing...'
            : 'Complete Gate Out'
        }
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value || '-'}</p>
    </div>
  );
}

const VARIANCE_TONE = {
  good: { box: 'border-emerald-200 bg-emerald-50 text-emerald-800', label: 'Within tolerance' },
  warn: { box: 'border-amber-200 bg-amber-50 text-amber-800', label: 'Check the load' },
  bad: { box: 'border-red-200 bg-red-50 text-red-800', label: 'Large weight mismatch' },
} as const;

function getVarianceTone(pct: number): keyof typeof VARIANCE_TONE {
  const abs = Math.abs(pct);
  if (abs <= 2) return 'good';
  if (abs <= 5) return 'warn';
  return 'bad';
}

function ChallanWeightCard({
  value,
  onChange,
  net,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  net: number | null;
  disabled?: boolean;
}) {
  const challan = toFiniteNumber(value);
  const hasChallan = challan !== null && challan > 0;
  const variance = net !== null && hasChallan ? net - challan : null;
  const variancePct = variance !== null && hasChallan ? (variance / challan) * 100 : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Challan Weight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Enter the weight declared on the delivery challan to check it against the weighbridge net
          weight. Leave it blank if there is no challan.
        </p>
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="challan-weight">Challan Weight (kg)</Label>
          <Input
            id="challan-weight"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder="e.g. 2450"
          />
        </div>

        {net === null ? (
          <p className="text-xs text-muted-foreground">
            Enter gross and tare weight to compare the net weight against the challan.
          </p>
        ) : !hasChallan ? (
          <p className="text-xs text-muted-foreground">
            Net weight is {formatKg(net)}. Enter a challan weight above to compare.
          </p>
        ) : (
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm',
              VARIANCE_TONE[getVarianceTone(variancePct ?? 0)].box,
            )}
          >
            <span className="font-medium">
              {VARIANCE_TONE[getVarianceTone(variancePct ?? 0)].label}
            </span>
            <span>
              Net {formatKg(net)} vs Challan {formatKg(challan)} ·{' '}
              <span className="font-semibold">
                {variance !== null && variance >= 0 ? '+' : ''}
                {variance !== null ? formatKg(variance) : '—'}
                {variancePct !== null
                  ? ` (${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}%)`
                  : ''}
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function toFiniteNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatKg(value: number) {
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)} kg`;
}
