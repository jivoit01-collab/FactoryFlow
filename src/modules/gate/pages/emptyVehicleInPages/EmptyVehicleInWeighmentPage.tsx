import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type CreateWeighmentRequest,
  useCreateWeighment,
  useEmptyVehicleGateIn,
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
} from '@/modules/gate/utils';
import { Button } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  EMPTY_VEHICLE_IN_ROUTES,
  EMPTY_VEHICLE_IN_TOTAL_STEPS,
  getGateInId,
} from './emptyVehicleInRoutes';

function buildValuesFromWeighment(
  weighment?: {
    gross_weight?: string;
    tare_weight?: string;
    weighbridge_slip_no?: string;
    first_weighment_time?: string | null;
    second_weighment_time?: string | null;
  } | null,
): RequiredWeighmentValues {
  if (!weighment) return EMPTY_REQUIRED_WEIGHMENT;

  return {
    grossWeight: weighment.gross_weight || '',
    tareWeight: weighment.tare_weight || '',
    weighbridgeSlipNo: weighment.weighbridge_slip_no || '',
    firstWeighmentTime: weighment.first_weighment_time
      ? weighment.first_weighment_time.slice(11, 16)
      : '',
    secondWeighmentTime: weighment.second_weighment_time
      ? weighment.second_weighment_time.slice(11, 16)
      : '',
  };
}

function validateTareWeighment(values: RequiredWeighmentValues) {
  const tare = Number(values.tareWeight);
  if (!Number.isFinite(tare) || tare < 0) return 'Tare weight is required.';

  if (values.grossWeight) {
    const gross = Number(values.grossWeight);
    if (!Number.isFinite(gross) || gross < 0) return 'Enter a valid gross weight.';
    if (tare > gross) return 'Tare weight cannot be greater than gross weight.';
  }

  return '';
}

export default function EmptyVehicleInWeighmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gateInId = getGateInId(searchParams);
  const [values, setValues] = useState<RequiredWeighmentValues>(EMPTY_REQUIRED_WEIGHMENT);
  const [error, setError] = useState('');

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
  } = useEmptyVehicleGateIn(gateInId);
  const vehicleEntryId = entry?.vehicle_entry || null;
  const { data: weighment, isLoading: isWeighmentLoading } = useWeighment(vehicleEntryId);
  const createWeighment = useCreateWeighment(vehicleEntryId || 0);

  useEffect(() => {
    if (!weighment) return;

    const timerId = window.setTimeout(() => {
      setValues(buildValuesFromWeighment(weighment));
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [weighment]);

  const handleValueChange = (field: keyof RequiredWeighmentValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleNext = async () => {
    if (!gateInId || !entry || !vehicleEntryId) {
      setError('Empty vehicle entry details not found.');
      return;
    }

    const validationError = validateTareWeighment(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Already saved and unchanged -> just advance; no redundant save + toast.
    if (
      weighment &&
      JSON.stringify(values) === JSON.stringify(buildValuesFromWeighment(weighment))
    ) {
      navigate(EMPTY_VEHICLE_IN_ROUTES.attachments(gateInId));
      return;
    }

    const payload: CreateWeighmentRequest = {
      tare_weight: Number(values.tareWeight),
      weighbridge_slip_no: values.weighbridgeSlipNo,
      first_weighment_time: buildRequiredWeighmentDateTime(values.firstWeighmentTime),
      second_weighment_time: buildRequiredWeighmentDateTime(values.secondWeighmentTime),
    };
    if (values.grossWeight) payload.gross_weight = Number(values.grossWeight);

    try {
      await createWeighment.mutateAsync(payload);
      toast.success('Tare weight saved');
      navigate(EMPTY_VEHICLE_IN_ROUTES.attachments(gateInId));
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Failed to save tare weight'));
    }
  };

  if (isEntryLoading || isWeighmentLoading) return <StepLoadingSpinner />;

  if (!gateInId || !entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={2}
          totalSteps={EMPTY_VEHICLE_IN_TOTAL_STEPS}
          title="Empty Vehicle In"
          error={error || (entryError ? getErrorMessage(entryError, 'Entry not found') : null)}
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Empty vehicle entry details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(EMPTY_VEHICLE_IN_ROUTES.details())}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={2}
        totalSteps={EMPTY_VEHICLE_IN_TOTAL_STEPS}
        title="Empty Vehicle In"
        error={error || null}
      />

      <RequiredWeighmentForm
        values={values}
        onChange={handleValueChange}
        disabled={createWeighment.isPending}
        requiredFields={{ grossWeight: false, tareWeight: true }}
      />

      <StepFooter
        onPrevious={() => navigate(EMPTY_VEHICLE_IN_ROUTES.details(gateInId))}
        onCancel={() => navigate(EMPTY_VEHICLE_IN_ROUTES.dashboard)}
        onNext={handleNext}
        isSaving={createWeighment.isPending}
        nextLabel={createWeighment.isPending ? 'Saving...' : 'Save and Next'}
      />
    </div>
  );
}
