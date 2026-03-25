import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  Home,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  Unlock,
  User,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_STATUS, getEntryStatusClasses } from '@/config/constants';
import type { ApiError } from '@/core/api/types';
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
  useCompleteOutboundEntry,
  useOutboundFullView,
  useReleaseForLoading,
} from '../../api/outbound';
import { securityCheckApi } from '../../api/securityCheck/securityCheck.api';
import { useEntryId, useEntryStepTracker } from '../../hooks';

// Status badge component (same as maintenance)
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn('px-2 py-1 rounded-full text-xs font-medium', getEntryStatusClasses(status))}
    >
      {status}
    </span>
  );
}

// Boolean icon component (same as maintenance)
function BooleanIcon({ value }: { value: boolean }) {
  return value ? (
    <CheckCircle2 className="h-4 w-4 text-green-500" />
  ) : (
    <XCircle className="h-4 w-4 text-red-500" />
  );
}

// Success Screen Component (full-screen overlay, same as maintenance)
function SuccessScreen({
  onNavigateToDashboard,
  onNavigateToHome,
  onReleaseForLoading,
  showRelease,
  isReleasing,
}: {
  onNavigateToDashboard: () => void;
  onNavigateToHome: () => void;
  onReleaseForLoading?: () => void;
  showRelease: boolean;
  isReleasing: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Animated Checkmark */}
      <div className="relative mb-8">
        <svg className="h-32 w-32 text-green-500" viewBox="0 0 100 100">
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
        Outbound gate entry has been successfully completed
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row opacity-0 animate-fade-in-delay-3">
        {showRelease && onReleaseForLoading && (
          <Button
            size="lg"
            onClick={onReleaseForLoading}
            disabled={isReleasing}
            className="min-w-[200px]"
          >
            <Unlock className="mr-2 h-5 w-5" />
            {isReleasing ? 'Releasing...' : 'Release for Loading'}
          </Button>
        )}
        <Button size="lg" onClick={onNavigateToDashboard} className="min-w-[200px]">
          <Truck className="mr-2 h-5 w-5" />
          Outbound Dashboard
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

  const [isSubmittingSecurity, setIsSubmittingSecurity] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [securityJustSubmitted, setSecurityJustSubmitted] = useState(false);

  const handleNavigateToList = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    queryClient.invalidateQueries({ queryKey: ['outboundFullView'] });
    navigate('/gate/outbound');
  };

  const handleNavigateToHome = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    queryClient.invalidateQueries({ queryKey: ['outboundFullView'] });
    navigate('/');
  };

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  useScrollToError(apiErrors);

  // Fetch full outbound entry data
  const { data: gateEntry, isLoading, error: fetchError } = useOutboundFullView(entryIdNumber);
  const completeOutboundEntry = useCompleteOutboundEntry();
  const releaseForLoading = useReleaseForLoading();

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/outbound/edit/${entryId}/attachments`);
    } else {
      navigate(`/gate/outbound/new/attachments?entryId=${entryId}`);
    }
  };

  const handleSubmitSecurity = async () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing.' });
      return;
    }

    setApiErrors({});
    setIsSubmittingSecurity(true);

    try {
      const securityData = await securityCheckApi.get(entryIdNumber!);
      if (!securityData.id) {
        setApiErrors({
          general: 'Security check data not found. Please complete security check first.',
        });
        setIsSubmittingSecurity(false);
        return;
      }
      await securityCheckApi.submit(securityData.id);
      setSecurityJustSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['outboundFullView', entryIdNumber] });
    } catch (error) {
      const apiError = error as ApiError & { detail?: string };
      const errorMessage =
        apiError.message || apiError.detail || 'Failed to submit security check';
      setApiErrors({ general: errorMessage });
    } finally {
      setIsSubmittingSecurity(false);
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
      await completeOutboundEntry.mutateAsync(entryIdNumber!);
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

  const handleRelease = () => {
    releaseForLoading.mutate(entryIdNumber!, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['outboundFullView', entryIdNumber] });
        queryClient.invalidateQueries({ queryKey: ['availableVehicles'] });
      },
      onError: (err) => setApiErrors({ general: err.message || 'Failed to release' }),
    });
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

  // Success screen
  if (showSuccess) {
    const isEmptyConfirmed = gateEntry?.outbound_details?.vehicle_empty_confirmed ?? false;
    const isReleased = !!gateEntry?.outbound_details?.released_for_loading_at;
    return (
      <SuccessScreen
        onNavigateToDashboard={handleNavigateToList}
        onNavigateToHome={handleNavigateToHome}
        onReleaseForLoading={handleRelease}
        showRelease={isEmptyConfirmed && !isReleased}
        isReleasing={releaseForLoading.isPending}
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

  if (!gateEntry) return null;

  const isAlreadyCompleted = gateEntry.gate_entry.status === ENTRY_STATUS.COMPLETED;
  const outboundDetails = gateEntry.outbound_details;
  const isEmptyConfirmed = outboundDetails?.vehicle_empty_confirmed ?? false;
  const isReleased = !!outboundDetails?.released_for_loading_at;

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
            Review all details before completing the outbound gate entry
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/gate/outbound/edit/${entryId}/step1`)}
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

        {/* Security Check */}
        {gateEntry.security_check && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Security Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <BooleanIcon value={gateEntry.security_check.vehicle_condition_ok} />
                  <span className="text-sm">Vehicle Condition OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <BooleanIcon value={gateEntry.security_check.tyre_condition_ok} />
                  <span className="text-sm">Tyre Condition OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <BooleanIcon value={gateEntry.security_check.alcohol_test_passed} />
                  <span className="text-sm">Alcohol Test Passed</span>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Inspected By</Label>
                  <p className="font-medium">{gateEntry.security_check.inspected_by}</p>
                </div>
              </div>
              {gateEntry.security_check.remarks && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-muted-foreground text-xs">Remarks</Label>
                  <p className="text-sm">{gateEntry.security_check.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Outbound Details */}
        {outboundDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Outbound Details
                </span>
                {!isAlreadyCompleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/gate/outbound/edit/${entryId}/step3`)}
                  >
                    Edit
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Purpose & Customer */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Purpose</Label>
                  <p className="font-medium">{outboundDetails.purpose || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Sales Order Ref</Label>
                  <p className="font-medium">{outboundDetails.sales_order_ref || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Customer</Label>
                  <p className="font-medium">
                    {outboundDetails.customer_name || '-'}
                    {outboundDetails.customer_code && ` (${outboundDetails.customer_code})`}
                  </p>
                </div>
              </div>

              {/* Transport Info */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                  <Truck className="h-4 w-4" />
                  Transport Information
                </h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Transporter</Label>
                    <p className="font-medium">{outboundDetails.transporter_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Contact</Label>
                    <p className="font-medium">{outboundDetails.transporter_contact || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">LR Number</Label>
                    <p className="font-medium">{outboundDetails.lr_number || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Trailer & Zone */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                  <MapPin className="h-4 w-4" />
                  Trailer & Assignment
                </h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Trailer</Label>
                    <p className="font-medium">
                      {outboundDetails.trailer_type || '-'}
                      {outboundDetails.trailer_length_ft &&
                        ` (${outboundDetails.trailer_length_ft} ft)`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Zone</Label>
                    <p className="font-medium">
                      {outboundDetails.assigned_zone === 'ZONE_C'
                        ? `Zone C — Bay ${outboundDetails.assigned_bay || '?'}`
                        : 'Yard'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Expected Loading</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {outboundDetails.expected_loading_time
                        ? formatDateTime(outboundDetails.expected_loading_time)
                        : '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <BooleanIcon value={outboundDetails.vehicle_empty_confirmed} />
                    <span className="text-sm font-medium">Vehicle Empty Confirmed</span>
                  </div>
                  {outboundDetails.created_by && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Created By</Label>
                      <p className="font-medium">{outboundDetails.created_by}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {outboundDetails.remarks && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Remarks / Notes</Label>
                  <p className="text-sm">{outboundDetails.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Released Status */}
        {isReleased && (
          <Card className="border-green-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  Released for loading at{' '}
                  {formatDateTime(outboundDetails!.released_for_loading_at!)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Inspection Status */}
        {!isAlreadyCompleted && (
          <Card className="border-primary/50">
            <CardContent className="pt-6">
              {gateEntry.security_check?.is_submitted || securityJustSubmitted ? (
                <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">
                    Security check submitted. Ready to complete entry.
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Security Inspection Pending</Label>
                    <p className="text-sm text-muted-foreground">
                      Submit security check to proceed with completing the entry
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Entry Time Summary */}
      <EntryTimeSummary
        startedAt={gateEntry.gate_entry.created_at}
        completedAt={
          gateEntry.outbound_details?.created_at ||
          gateEntry.security_check?.created_at ||
          gateEntry.gate_entry.created_at
        }
      />

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
            <>
              {!gateEntry?.security_check?.is_submitted && !securityJustSubmitted ? (
                <Button
                  type="button"
                  onClick={handleSubmitSecurity}
                  disabled={isSubmittingSecurity}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {isSubmittingSecurity ? 'Submitting...' : 'Submit Security'}
                </Button>
              ) : (
                <Button type="button" onClick={handleComplete} disabled={isCompleting}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isCompleting ? 'Completing...' : 'Complete Entry'}
                </Button>
              )}
            </>
          )}
          {isAlreadyCompleted && !isReleased && isEmptyConfirmed && (
            <Button
              type="button"
              onClick={handleRelease}
              disabled={releaseForLoading.isPending}
            >
              <Unlock className="h-4 w-4 mr-2" />
              {releaseForLoading.isPending ? 'Releasing...' : 'Release for Loading'}
            </Button>
          )}
          {isAlreadyCompleted && (isReleased || !isEmptyConfirmed) && (
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
