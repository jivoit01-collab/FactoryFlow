import { AlertCircle, FileText, Paperclip, Scale, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  useCompleteEmptyVehicleGateIn,
  useEmptyVehicleGateIn,
  useGateAttachments,
  useWeighment,
} from '@/modules/gate/api';
import {
  GateStatusBadge,
  StepFooter,
  StepHeader,
  StepLoadingSpinner,
} from '@/modules/gate/components';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  EMPTY_VEHICLE_IN_ROUTES,
  EMPTY_VEHICLE_IN_TOTAL_STEPS,
  getGateInId,
} from './emptyVehicleInRoutes';

export default function EmptyVehicleInReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gateInId = getGateInId(searchParams);
  const [error, setError] = useState('');

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
  } = useEmptyVehicleGateIn(gateInId);
  const vehicleEntryId = entry?.vehicle_entry || null;
  const { data: weighment, isLoading: isWeighmentLoading } = useWeighment(vehicleEntryId);
  const { data: attachments = [], isLoading: isAttachmentsLoading } =
    useGateAttachments(vehicleEntryId);
  const completeEmptyGateIn = useCompleteEmptyVehicleGateIn();
  const isLoading = isEntryLoading || isWeighmentLoading || isAttachmentsLoading;

  const handleComplete = async () => {
    if (!entry) {
      setError('Empty vehicle entry details not found.');
      return;
    }

    if (!weighment?.tare_weight) {
      setError('Tare weight is required before completing the entry.');
      return;
    }

    // Already completed (revisiting the wizard) -> don't re-run completion, which
    // would re-snapshot covers. Just return to the dashboard.
    if (entry.vehicle_entry_status === 'COMPLETED') {
      navigate(EMPTY_VEHICLE_IN_ROUTES.dashboard);
      return;
    }

    try {
      await completeEmptyGateIn.mutateAsync(entry.id);
      toast.success('Empty vehicle entry completed');
      navigate(EMPTY_VEHICLE_IN_ROUTES.dashboard);
    } catch (completeError) {
      setError(getErrorMessage(completeError, 'Failed to complete empty vehicle entry'));
    }
  };

  if (isLoading) return <StepLoadingSpinner />;

  if (!gateInId || !entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={4}
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
        currentStep={4}
        totalSteps={EMPTY_VEHICLE_IN_TOTAL_STEPS}
        title="Empty Vehicle In"
        error={error || null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Vehicle & Driver
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Entry No." value={entry.entry_no} />
          <InfoItem label="Vehicle" value={entry.vehicle_number} />
          <InfoItem label="Driver" value={entry.driver_name} />
          <InfoItem label="Driver Mobile" value={entry.driver_mobile} />
          <InfoItem label="Reason" value={entry.reason_display} />
          <InfoItem label="Gate In Date" value={entry.gate_in_date} />
          <InfoItem label="In Time" value={entry.in_time} />
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1">
              <GateStatusBadge status={entry.vehicle_entry_status} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Reference" value={entry.document_reference || entry.sap_doc_num} />
          <InfoItem label="SAP Doc" value={entry.sap_doc_num} />
          <InfoItem label="From" value={entry.sap_from_warehouse} />
          <InfoItem label="To" value={entry.sap_to_warehouse} />
          <InfoItem label="Notes" value={entry.document_notes} className="md:col-span-2 xl:col-span-4" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Weighment
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Gross Weight" value={weighment?.gross_weight} />
          <InfoItem label="Tare Weight" value={weighment?.tare_weight} />
          <InfoItem label="Net Weight" value={weighment?.net_weight} />
          <InfoItem label="Slip No." value={weighment?.weighbridge_slip_no} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">
            {attachments.length} attachment{attachments.length === 1 ? '' : 's'} uploaded
          </p>
        </CardContent>
      </Card>

      <StepFooter
        onPrevious={() => navigate(EMPTY_VEHICLE_IN_ROUTES.attachments(gateInId))}
        onCancel={() => navigate(EMPTY_VEHICLE_IN_ROUTES.dashboard)}
        onNext={handleComplete}
        isSaving={completeEmptyGateIn.isPending}
        nextLabel={completeEmptyGateIn.isPending ? 'Completing...' : 'Complete Entry'}
      />
    </div>
  );
}

function InfoItem({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | number | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap font-medium">{value || '-'}</p>
    </div>
  );
}
