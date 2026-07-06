import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Home,
  PackageCheck,
  Truck,
  User,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_STATUS } from '@/config/constants';
import { GateStatusBadge } from '@/modules/gate/components';
import { EntryTimeSummary } from '@/shared/components';
import { Button, Card, CardContent, CardHeader, CardTitle, Label } from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';
import { cn } from '@/shared/utils';
import {
  getErrorMessage,
  getServerErrorMessage,
  isServerError as checkServerError,
} from '@/shared/utils';

import {
  useCompleteMaintenanceEntry,
  useMaintenanceFullView,
  useReceiveMaintenanceSpare,
} from '../../api/maintenance/maintenance.queries';
import { useEntryId, useEntryStepTracker } from '../../hooks';

// Status badge component
function StatusBadge({ status }: { status: string }) {
  return <GateStatusBadge status={status} />;
}

// Urgency badge component
function UrgencyBadge({ level }: { level: string }) {
  const getUrgencyColor = () => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getUrgencyColor())}>
      {level}
    </span>
  );
}

// Success Screen Component with animated checkmark
function SuccessScreen({
  onNavigateToDashboard,
  onNavigateToHome,
}: {
  onNavigateToDashboard: () => void;
  onNavigateToHome: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Animated Checkmark */}
      <div className="relative mb-8">
        <svg className="h-32 w-32 text-green-500" viewBox="0 0 100 100">
          {/* Circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="animate-draw-circle"
            style={{ strokeDasharray: 283, strokeDashoffset: 283 }}
          />
          {/* Checkmark */}
          <path
            d="M30 50 L45 65 L70 35"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw-check"
            style={{ strokeDasharray: 60, strokeDashoffset: 60 }}
          />
        </svg>
      </div>

      {/* Success Message */}
      <h1 className="mb-2 text-3xl font-bold text-foreground opacity-0 animate-fade-in-delay-1">
        Entry Completed!
      </h1>
      <p className="mb-12 text-muted-foreground opacity-0 animate-fade-in-delay-2">
        Maintenance gate entry has been successfully completed
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row opacity-0 animate-fade-in-delay-3">
        <Button size="lg" onClick={onNavigateToDashboard} className="min-w-[200px]">
          <Wrench className="mr-2 h-5 w-5" />
          Maintenance Dashboard
        </Button>
        <Button size="lg" variant="outline" onClick={onNavigateToHome} className="min-w-[200px]">
          <Home className="mr-2 h-5 w-5" />
          Home
        </Button>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { entryId, entryIdNumber, isEditMode } = useEntryId();
  useEntryStepTracker();

  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleNavigateToList = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    queryClient.invalidateQueries({ queryKey: ['maintenanceFullView'] });
    navigate('/gate/maintenance');
  };

  const handleNavigateToHome = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    queryClient.invalidateQueries({ queryKey: ['maintenanceFullView'] });
    navigate('/');
  };
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Scroll to first error when errors occur
  useScrollToError(apiErrors);

  // Fetch full maintenance entry data
  const { data: gateEntry, isLoading, error: fetchError } = useMaintenanceFullView(entryIdNumber);

  const completeMaintenanceEntry = useCompleteMaintenanceEntry();
  const receiveMaintenanceSpare = useReceiveMaintenanceSpare(entryIdNumber || 0);
  const maintenanceDetails = gateEntry?.maintenance_details;
  const maintenanceLink = maintenanceDetails?.maintenance_link;

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/maintenance/edit/${entryId}/attachments`);
    } else {
      navigate(`/gate/maintenance/new/attachments?entryId=${entryId}`);
    }
  };

  const handleComplete = async () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing.' });
      return;
    }

    setApiErrors({});
    setIsCompleting(true);

    try {
      // Complete the gate entry
      await completeMaintenanceEntry.mutateAsync(entryIdNumber!);

      // Show success screen
      setShowSuccess(true);
    } catch (error) {
      if (checkServerError(error)) {
        setApiErrors({
          general: 'Cannot complete the entry at the moment. Please try again later.',
        });
      } else {
        setApiErrors({ general: getErrorMessage(error, 'Failed to complete gate entry') });
      }
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReceiveSpare = async () => {
    if (!entryIdNumber || !maintenanceDetails?.maintenance_link) {
      setApiErrors({ general: 'Maintenance spare link is missing.' });
      return;
    }
    setApiErrors({});
    try {
      await receiveMaintenanceSpare.mutateAsync({
        qc_status: maintenanceDetails.maintenance_link.qc_status,
        grpo_reference: maintenanceDetails.maintenance_link.grpo_reference || undefined,
        grpo_doc_entry: maintenanceDetails.maintenance_link.grpo_doc_entry || undefined,
        grpo_doc_num: maintenanceDetails.maintenance_link.grpo_doc_num || undefined,
        remarks: 'Received from maintenance gate review',
      });
      queryClient.invalidateQueries({ queryKey: ['maintenanceFullView', entryIdNumber] });
    } catch (error) {
      setApiErrors({ general: getErrorMessage(error, 'Failed to receive spare into stock') });
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show success screen after completion
  if (showSuccess) {
    return (
      <SuccessScreen
        onNavigateToDashboard={handleNavigateToList}
        onNavigateToHome={handleNavigateToHome}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (fetchError) {
    const errorMessage = checkServerError(fetchError)
      ? getServerErrorMessage()
      : 'Failed to load gate entry details. Please try again.';
    return (
      <div className="space-y-6 pb-6">
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={handlePrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
        </div>
      </div>
    );
  }

  if (!gateEntry) {
    return null;
  }

  const isAlreadyCompleted = gateEntry.gate_entry.status === ENTRY_STATUS.COMPLETED;
  const canReceiveLinkedSpare =
    !!maintenanceLink?.spare &&
    maintenanceLink.receipt_status !== 'RECEIVED' &&
    (!maintenanceLink.qc_required ||
      ['ACCEPTED', 'WAIVED', 'NOT_REQUIRED'].includes(maintenanceLink.qc_status));

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileCheck className="h-8 w-8" />
            Final Review
          </h2>
          <p className="text-muted-foreground">
            Review all details before completing the maintenance gate entry
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/gate/maintenance/edit/${entryId}/step1`)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Full Entry
        </Button>
      </div>

      {apiErrors.general && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {apiErrors.general}
        </div>
      )}

      <div className="space-y-6">
        {/* Gate Entry Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Gate Entry Information
              </span>
              <StatusBadge status={gateEntry.gate_entry.status} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label className="text-muted-foreground text-xs">Entry Number</Label>
                <p className="font-medium">{gateEntry.gate_entry.entry_no}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Entry Type</Label>
                <p className="font-medium">{gateEntry.gate_entry.entry_type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Created At</Label>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {formatDateTime(gateEntry.gate_entry.created_at)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Locked</Label>
                <p className="font-medium">{gateEntry.gate_entry.is_locked ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-muted-foreground text-xs">Vehicle Number</Label>
                <p className="font-medium">{gateEntry.vehicle.vehicle_number}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Vehicle Type</Label>
                <p className="font-medium">{gateEntry.vehicle.vehicle_type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Capacity</Label>
                <p className="font-medium">{gateEntry.vehicle.capacity_ton} Tons</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Driver Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-muted-foreground text-xs">Driver Name</Label>
                <p className="font-medium">{gateEntry.driver.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Mobile Number</Label>
                <p className="font-medium">{gateEntry.driver.mobile_no}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">License Number</Label>
                <p className="font-medium">{gateEntry.driver.license_no}</p>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Maintenance Details */}
        {maintenanceDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance Details
                </span>
                <UrgencyBadge level={maintenanceDetails.urgency_level} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Urgency Warning */}
              {(maintenanceDetails.urgency_level === 'CRITICAL' ||
                maintenanceDetails.urgency_level === 'HIGH') && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {maintenanceDetails.urgency_level === 'CRITICAL' ? 'Critical' : 'High'}{' '}
                      Priority Item
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Please ensure expedited processing.
                    </p>
                  </div>
                </div>
              )}

              {/* Work Order & Type */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Work Order Number</Label>
                  <p className="font-medium text-primary">{maintenanceDetails.work_order_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Maintenance Type</Label>
                  <p className="font-medium">{maintenanceDetails.maintenance_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Supplier Name</Label>
                  <p className="font-medium">{maintenanceDetails.supplier_name}</p>
                </div>
              </div>

              {/* Material Info */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4" />
                  Material Information
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground text-xs">Material Description</Label>
                    <p className="font-medium">{maintenanceDetails.material_description}</p>
                  </div>
                  {maintenanceDetails.part_number && (
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        Part Number / Model Number
                      </Label>
                      <p className="font-medium">{maintenanceDetails.part_number}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground text-xs">Quantity</Label>
                    <p className="font-medium text-lg text-primary">
                      {maintenanceDetails.quantity} {maintenanceDetails.unit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Documentation & Assignment */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4" />
                  Documentation & Assignment
                </h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {maintenanceDetails.invoice_number && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Invoice Number</Label>
                      <p className="font-medium">{maintenanceDetails.invoice_number}</p>
                    </div>
                  )}
                  {maintenanceDetails.equipment_id && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Equipment ID</Label>
                      <p className="font-medium">{maintenanceDetails.equipment_id}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground text-xs">Receiving Department</Label>
                    <p className="font-medium">{maintenanceDetails.receiving_department}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Inward Time</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatDateTime(maintenanceDetails.inward_time)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Created By</Label>
                    <p className="font-medium">{maintenanceDetails.created_by}</p>
                  </div>
                </div>
              </div>

              {maintenanceLink && (
                <div className="border-t pt-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <PackageCheck className="h-4 w-4" />
                      Maintenance Links
                    </h4>
                    {maintenanceLink.spare && maintenanceLink.receipt_status !== 'RECEIVED' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleReceiveSpare()}
                        disabled={!canReceiveLinkedSpare || receiveMaintenanceSpare.isPending}
                      >
                        <PackageCheck className="h-4 w-4 mr-2" />
                        {receiveMaintenanceSpare.isPending ? 'Receiving...' : 'Receive Spare'}
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label className="text-muted-foreground text-xs">Asset</Label>
                      <p className="font-medium">
                        {maintenanceLink.asset_code
                          ? `${maintenanceLink.asset_code} - ${maintenanceLink.asset_name}`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Work Order</Label>
                      <p className="font-medium">
                        {maintenanceLink.work_order_no
                          ? `${maintenanceLink.work_order_no} - ${maintenanceLink.work_order_title}`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Spare</Label>
                      <p className="font-medium">
                        {maintenanceLink.spare_part_number
                          ? `${maintenanceLink.spare_part_number} - ${maintenanceLink.spare_name}`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">QC Status</Label>
                      <p className="font-medium">
                        {maintenanceLink.qc_required
                          ? maintenanceLink.qc_status.replaceAll('_', ' ')
                          : 'Not Required'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Receipt Status</Label>
                      <p className="font-medium">{maintenanceLink.receipt_status.replaceAll('_', ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Received Qty</Label>
                      <p className="font-medium">
                        {maintenanceLink.received_quantity} {maintenanceLink.spare_uom}
                      </p>
                    </div>
                    {(maintenanceLink.grpo_reference ||
                      maintenanceLink.grpo_doc_entry ||
                      maintenanceLink.grpo_doc_num) && (
                      <div className="md:col-span-3">
                        <Label className="text-muted-foreground text-xs">GRPO</Label>
                        <p className="font-medium">
                          {[
                            maintenanceLink.grpo_reference,
                            maintenanceLink.grpo_doc_entry
                              ? `DocEntry ${maintenanceLink.grpo_doc_entry}`
                              : '',
                            maintenanceLink.grpo_doc_num
                              ? `DocNum ${maintenanceLink.grpo_doc_num}`
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' | ')}
                        </p>
                      </div>
                    )}
                  </div>
                  {maintenanceLink.spare &&
                    maintenanceLink.receipt_status !== 'RECEIVED' &&
                    !canReceiveLinkedSpare && (
                      <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                        QC must be accepted or waived before this spare can be received.
                      </p>
                    )}
                </div>
              )}

              {/* Remarks */}
              {maintenanceDetails.remarks && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Remarks / Notes</Label>
                  <p className="text-sm">{maintenanceDetails.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>

      {/* Entry Time Summary */}
      {(() => {
        return (
          <EntryTimeSummary
            startedAt={gateEntry.gate_entry.created_at}
            completedAt={gateEntry.maintenance_details?.created_at || gateEntry.gate_entry.created_at}
          />
        )
      })()}

      {/* Footer Actions */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={handlePrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={handleNavigateToList}>
            Cancel
          </Button>
          {!isAlreadyCompleted && (
            <Button type="button" onClick={handleComplete} disabled={isCompleting}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isCompleting ? 'Completing...' : 'Complete Entry'}
            </Button>
          )}
          {isAlreadyCompleted && (
            <Button
              type="button"
              onClick={handleNavigateToList}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Entry Completed
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
