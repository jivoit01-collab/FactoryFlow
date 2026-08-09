import {
  Eye,
  Factory,
  FileCheck,
  FileText,
  Paperclip,
  Scale,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_TYPES } from '@/config/constants';
import {
  useCompleteJobWorkGateIn,
  useEmptyVehicleEligibleEntries,
  useGateAttachments,
  useJobWorkGateInByVehicleEntry,
  useWeighment,
} from '@/modules/gate/api';
import {
  EmptyVehicleOutButton,
  GateSuccessScreen,
  StepFooter,
  StepHeader,
  StepLoadingSpinner,
} from '@/modules/gate/components';
import { useEntryId, useEntryStepTracker } from '@/modules/gate/hooks';
import { getJobWorkDisplayStatus } from '@/modules/gate/utils';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

function formatProductionStatus(status?: string | null) {
  const labels: Record<string, string> = {
    P: 'Planned',
    R: 'Released',
    L: 'Closed',
    C: 'Cancelled',
  };
  return labels[String(status || '')] || status || '-';
}

export default function JobWorkReviewPage() {
  const navigate = useNavigate();
  const { entryId, entryIdNumber } = useEntryId();
  useEntryStepTracker();
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    data: jobWork,
    isLoading: isJobWorkLoading,
    error: jobWorkError,
  } = useJobWorkGateInByVehicleEntry(entryIdNumber);
  const { data: weighment } = useWeighment(entryIdNumber);
  const { data: attachments = [] } = useGateAttachments(entryIdNumber);
  const completeJobWork = useCompleteJobWorkGateIn();
  const displayStatus = jobWork ? getJobWorkDisplayStatus(jobWork) : null;
  const isGateCompleted = jobWork?.status === 'COMPLETED';

  // Show the one-step "out empty" action once this vehicle can leave empty.
  const { data: eligibleEntries = [] } = useEmptyVehicleEligibleEntries({
    entry_type: ENTRY_TYPES.JOB_WORK,
  });
  const emptyOutEntry = eligibleEntries.find((eligible) => eligible.id === entryIdNumber);

  const handleComplete = async () => {
    if (!entryIdNumber) {
      setError('Entry ID is missing. Please start the job work entry again.');
      return;
    }

    if (!weighment) {
      setError('Weighment is required before this gate-out entry can be completed.');
      return;
    }

    try {
      await completeJobWork.mutateAsync(entryIdNumber);
      setShowSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to complete job work entry'));
    }
  };

  if (showSuccess) {
    return (
      <GateSuccessScreen
        title="Entry Completed!"
        subtitle="Job work gate entry has been successfully completed"
        dashboardLabel="Job Work Dashboard"
        dashboardIcon={Factory}
        onNavigateToDashboard={() => navigate('/gate/job-work')}
        onNavigateToHome={() => navigate('/')}
      />
    );
  }

  if (isJobWorkLoading) {
    return <StepLoadingSpinner />;
  }

  const loadError = jobWorkError ? getErrorMessage(jobWorkError, 'Failed to load job work entry') : '';

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={3} totalSteps={3} title="Job Work" error={error || loadError || null} />

      {jobWork && (
        <>
          <div className="flex flex-wrap justify-end gap-3">
            {emptyOutEntry ? (
              <EmptyVehicleOutButton
                entry={emptyOutEntry}
                size="default"
                onCompleted={() => navigate('/gate/job-work')}
              />
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/gate/job-work/new?entryId=${entryId || jobWork.vehicle_entry}`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Full Entry
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Vehicle & Gate In
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <InfoItem label="Entry No." value={jobWork.entry_no} />
              <InfoItem label="Vehicle" value={jobWork.vehicle_number} />
              <InfoItem label="Vehicle Type" value={jobWork.vehicle_type || ''} />
              <InfoItem label="Transporter" value={jobWork.transporter_name || ''} />
              <InfoItem label="Driver" value={jobWork.driver_name} />
              <InfoItem label="Mobile" value={jobWork.driver_mobile} />
              <InfoItem label="Gate In Date" value={jobWork.gate_in_date} />
              <InfoItem label="In Time" value={jobWork.in_time} />
              <InfoItem label="Security" value={jobWork.security_name || ''} />
              <InfoItem label="Status" value={displayStatus} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                SAP Production Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {jobWork.production_order_doc_entry ? (
                <>
                  <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <InfoItem label="Order No." value={jobWork.production_order_doc_num} />
                    <InfoItem
                      label="Item"
                      value={jobWork.production_item_name || jobWork.production_item_code}
                    />
                    <InfoItem label="Planned Qty" value={jobWork.production_planned_qty} />
                    <InfoItem label="Remaining Qty" value={jobWork.production_remaining_qty} />
                    <InfoItem label="Start Date" value={jobWork.production_start_date} />
                    <InfoItem label="Due Date" value={jobWork.production_due_date} />
                    <InfoItem label="Warehouse" value={jobWork.production_warehouse} />
                    <InfoItem
                      label="Status"
                      value={formatProductionStatus(jobWork.production_status)}
                    />
                  </div>

                  <div className="overflow-hidden rounded-md border">
                    <div className="max-h-[360px] overflow-auto">
                      <table className="w-full min-w-[760px]">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-3 text-left text-sm font-medium">Line</th>
                            <th className="p-3 text-left text-sm font-medium">Component</th>
                            <th className="p-3 text-left text-sm font-medium">Planned Qty</th>
                            <th className="p-3 text-left text-sm font-medium">Warehouse</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobWork.items.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="whitespace-nowrap p-3 text-sm">{item.line_num}</td>
                              <td className="p-3 text-sm">
                                <div className="font-medium">{item.item_code}</div>
                                <div className="text-muted-foreground">{item.item_name}</div>
                              </td>
                              <td className="whitespace-nowrap p-3 text-sm">
                                {item.quantity} {item.uom}
                              </td>
                              <td className="whitespace-nowrap p-3 text-sm">
                                {item.warehouse_code || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  SAP production order is not linked yet.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Weighment
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                {weighment ? (
                  <>
                    <InfoItem label="Gross Weight" value={weighment.gross_weight} />
                    <InfoItem label="Tare Weight" value={weighment.tare_weight} />
                    <InfoItem label="Net Weight" value={weighment.net_weight} />
                    <InfoItem label="Slip No." value={weighment.weighbridge_slip_no || ''} />
                  </>
                ) : (
                  <p className="sm:col-span-2 text-sm text-destructive">
                    Weighment is required before completion.
                  </p>
                )}
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
                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attachments uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                      >
                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                        {attachment.file_name || attachment.file.split('/').pop() || 'Attachment'}
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <StepFooter
        onPrevious={() => navigate(`/gate/job-work/new/attachments?entryId=${entryId}`)}
        onCancel={() => navigate('/gate/job-work')}
        onNext={handleComplete}
        isSaving={completeJobWork.isPending}
        isNextDisabled={isGateCompleted}
        nextLabel={
          isGateCompleted && displayStatus === 'PENDING'
            ? 'Pending Production Link'
            : isGateCompleted
            ? 'Completed'
            : completeJobWork.isPending
              ? 'Completing...'
              : 'Complete Entry'
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
