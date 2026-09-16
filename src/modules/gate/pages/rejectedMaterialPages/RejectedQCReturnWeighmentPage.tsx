import { AlertCircle, FileText, PackageX, Paperclip, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCreateRejectedQCReturn } from '@/modules/gate/api';
import { RequiredWeighmentForm, StepFooter, StepHeader } from '@/modules/gate/components';
import {
  buildRequiredWeighmentDateTime,
  calculateRequiredNetWeight,
  type RequiredWeighmentValues,
  validateRequiredWeighment,
} from '@/modules/gate/utils';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import {
  buildRejectedQCReturnEntryNo,
  clearRejectedQCReturnDraft,
  readRejectedQCReturnDraft,
  type RejectedQCReturnDraft,
  writeRejectedQCReturnEntry,
} from './rejectedQcReturn.storage';

function draftToWeighmentValues(draft: RejectedQCReturnDraft): RequiredWeighmentValues {
  return {
    grossWeight: draft.grossWeight,
    tareWeight: draft.tareWeight,
    weighbridgeSlipNo: draft.weighbridgeSlipNo,
    firstWeighmentTime: draft.firstWeighmentTime,
    secondWeighmentTime: draft.secondWeighmentTime,
  };
}

export default function RejectedQCReturnWeighmentPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<RejectedQCReturnDraft>(() => readRejectedQCReturnDraft());
  const [values, setValues] = useState<RequiredWeighmentValues>(() =>
    draftToWeighmentValues(readRejectedQCReturnDraft()),
  );
  const [error, setError] = useState('');
  const [gatepassFileNames, setGatepassFileNames] = useState<string[]>(() => (
    readRejectedQCReturnDraft().gatepassFileNames || []
  ));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createRejectedQCReturn = useCreateRejectedQCReturn();

  const handleValueChange = (field: keyof RequiredWeighmentValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleGatepassSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setGatepassFileNames((current) => Array.from(new Set([
      ...current,
      ...files.map((file) => file.name),
    ])));
    setError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeGatepassFile = (fileName: string) => {
    setGatepassFileNames((current) => current.filter((name) => name !== fileName));
    setError('');
  };

  const handleComplete = async () => {
    if (!draft.vehicleId || !draft.driverId || draft.items.length === 0) {
      setError('Vehicle and return item details are required before weighment.');
      return;
    }

    const validationError = validateRequiredWeighment(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (gatepassFileNames.length === 0) {
      setError('Gatepass document upload is required before completing rejected QC return.');
      return;
    }

    const netWeight = calculateRequiredNetWeight(values);
    const updatedDraft: RejectedQCReturnDraft = {
      ...draft,
      grossWeight: values.grossWeight,
      tareWeight: values.tareWeight,
      netWeight,
      weighbridgeSlipNo: values.weighbridgeSlipNo,
      firstWeighmentTime: values.firstWeighmentTime,
      secondWeighmentTime: values.secondWeighmentTime,
      gatepassFileNames,
    };
    setDraft(updatedDraft);

    const { items, ...vehicle } = updatedDraft;
    const now = new Date().toISOString();

    try {
      const savedEntry = await createRejectedQCReturn.mutateAsync({
        vehicle_id: updatedDraft.vehicleId,
        driver_id: updatedDraft.driverId,
        gate_out_date: updatedDraft.gateOutDate,
        out_time: updatedDraft.outTime || null,
        challan_no: updatedDraft.challanNo,
        eway_bill_no: updatedDraft.ewayBillNo,
        manual_sap_reference: updatedDraft.manualSapRef,
        security_name: updatedDraft.securityName,
        gross_weight: parseFloat(values.grossWeight),
        tare_weight: parseFloat(values.tareWeight),
        weighbridge_slip_no: values.weighbridgeSlipNo,
        first_weighment_time: buildRequiredWeighmentDateTime(values.firstWeighmentTime),
        second_weighment_time: buildRequiredWeighmentDateTime(values.secondWeighmentTime),
        gatepass_documents: gatepassFileNames,
        remarks: updatedDraft.remarks,
        inspection_ids: items.map((item) => Number(item.id)),
      });

      writeRejectedQCReturnEntry({
        id: String(savedEntry.id),
        entryNo: savedEntry.entry_no || buildRejectedQCReturnEntryNo(),
        status: 'COMPLETED',
        vehicle,
        items,
        values: {
          ...vehicle,
          rejectedQcInspection: items.map((item) => item.id).join(', '),
          rejectedQcLabels: items.map((item) => item.label).join(', '),
          returnAction: 'Return to Vendor',
          grossWeight: values.grossWeight,
          tareWeight: values.tareWeight,
          netWeight,
          weighbridgeSlipNo: values.weighbridgeSlipNo,
          gatepassFileNames: JSON.stringify(gatepassFileNames),
        },
        createdAt: now,
        updatedAt: now,
      });
      clearRejectedQCReturnDraft();
      navigate('/gate/rejected-qc-return');
    } catch (err) {
      const detail =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { detail?: string } }).data?.detail
          : undefined;
      setError(detail || 'Could not save rejected QC return entry');
    }
  };

  if (!draft.vehicleId || draft.items.length === 0) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader currentStep={3} totalSteps={3} title="Rejected QC Return" error={error || null} />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-amber-900 dark:text-amber-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Return details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate('/gate/rejected-qc-return/new')}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={3} totalSteps={3} title="Rejected QC Return" error={error || null} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5" />
            Return Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Vehicle" value={draft.vehicleNo} />
          <InfoItem label="Driver" value={draft.driverName} />
          <InfoItem label="Gate Out" value={`${draft.gateOutDate} ${draft.outTime}`} />
          <InfoItem label="Items" value={draft.items.length} />
        </CardContent>
      </Card>

      <RequiredWeighmentForm
        values={values}
        onChange={handleValueChange}
        disabled={createRejectedQCReturn.isPending}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Gatepass Document
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
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleGatepassSelect}
          />

          {gatepassFileNames.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gatepassFileNames.map((fileName) => (
                <div key={fileName} className="flex items-center gap-3 rounded-md border p-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium" title={fileName}>
                    {fileName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGatepassFile(fileName)}
                    aria-label={`Remove ${fileName}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Gatepass document is required before completing this gate out.
            </p>
          )}
        </CardContent>
      </Card>

      <StepFooter
        onPrevious={() => navigate('/gate/rejected-qc-return/new/items')}
        onCancel={() => navigate('/gate/rejected-qc-return')}
        onNext={handleComplete}
        isSaving={createRejectedQCReturn.isPending}
        nextLabel={createRejectedQCReturn.isPending ? 'Completing...' : 'Complete Entry'}
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
