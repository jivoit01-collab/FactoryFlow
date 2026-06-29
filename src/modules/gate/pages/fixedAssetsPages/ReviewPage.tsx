import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileCheck,
  Home,
  Package,
  Truck,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_STATUS } from '@/config/constants';
import { GateStatusBadge } from '@/modules/gate/components';
import { Button, Card, CardContent, CardHeader, CardTitle, Label } from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';
import {
  getErrorMessage,
  getServerErrorMessage,
  isServerError as checkServerError,
} from '@/shared/utils';

import {
  useCompleteFixedAssetEntry,
  useFixedAssetEntry,
} from '../../api/fixedAssets/fixedAssets.queries';
import { useVehicleEntry } from '../../api/vehicle/vehicleEntry.queries';
import { useEntryId, useEntryStepTracker } from '../../hooks';

function SuccessScreen({
  onNavigateToDashboard,
  onNavigateToHome,
}: {
  onNavigateToDashboard: () => void;
  onNavigateToHome: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
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
      <h1 className="mb-2 text-3xl font-bold text-foreground opacity-0 animate-fade-in-delay-1">
        Entry Completed!
      </h1>
      <p className="mb-12 text-muted-foreground opacity-0 animate-fade-in-delay-2">
        Fixed asset gate entry has been successfully completed
      </p>
      <div className="flex flex-col gap-4 sm:flex-row opacity-0 animate-fade-in-delay-3">
        <Button size="lg" onClick={onNavigateToDashboard} className="min-w-[200px]">
          <Package className="mr-2 h-5 w-5" />
          Fixed Assets Dashboard
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
  const { entryId, entryIdNumber } = useEntryId();
  useEntryStepTracker();

  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  useScrollToError(apiErrors);

  const {
    data: vehicleEntry,
    isLoading: isLoadingVehicle,
    error: vehicleError,
  } = useVehicleEntry(entryIdNumber);
  const { data: assetData, isLoading: isLoadingAsset } = useFixedAssetEntry(entryIdNumber);

  const completeFixedAssetEntry = useCompleteFixedAssetEntry();

  const handleNavigateToList = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    navigate('/gate/fixed-assets');
  };

  const handleNavigateToHome = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    navigate('/');
  };

  const handlePrevious = () => {
    if (entryId) {
      navigate(`/gate/fixed-assets/edit/${entryId}/attachments`);
    }
  };

  const handleComplete = async () => {
    if (!entryIdNumber) {
      setApiErrors({ general: 'Entry ID is missing.' });
      return;
    }

    setApiErrors({});
    setIsCompleting(true);

    try {
      await completeFixedAssetEntry.mutateAsync(entryIdNumber);
      setShowSuccess(true);
    } catch (error) {
      if (checkServerError(error)) {
        setApiErrors({ general: 'Cannot complete the entry at the moment. Please try again later.' });
      } else {
        setApiErrors({ general: getErrorMessage(error, 'Failed to complete gate entry') });
      }
    } finally {
      setIsCompleting(false);
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (showSuccess) {
    return (
      <SuccessScreen
        onNavigateToDashboard={handleNavigateToList}
        onNavigateToHome={handleNavigateToHome}
      />
    );
  }

  if (isLoadingVehicle || isLoadingAsset) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (vehicleError) {
    const errorMessage = checkServerError(vehicleError)
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

  if (!vehicleEntry) {
    return null;
  }

  const isAlreadyCompleted = vehicleEntry.status === ENTRY_STATUS.COMPLETED;
  const items = assetData?.items ?? [];

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
            Review all details before completing the fixed asset gate entry
          </p>
        </div>
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
              <GateStatusBadge status={vehicleEntry.status} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-muted-foreground text-xs">Entry Number</Label>
                <p className="font-medium">{vehicleEntry.entry_no}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Entry Type</Label>
                <p className="font-medium">{vehicleEntry.entry_type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Created At</Label>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {formatDateTime(vehicleEntry.created_at)}
                </p>
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
                <p className="font-medium">{vehicleEntry.vehicle?.vehicle_number || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Vehicle Type</Label>
                <p className="font-medium">{vehicleEntry.vehicle?.vehicle_type?.name || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Capacity</Label>
                <p className="font-medium">
                  {vehicleEntry.vehicle?.capacity_ton
                    ? `${vehicleEntry.vehicle.capacity_ton} Tons`
                    : '-'}
                </p>
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
                <p className="font-medium">{vehicleEntry.driver?.name || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Mobile Number</Label>
                <p className="font-medium">{vehicleEntry.driver?.mobile_no || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">License Number</Label>
                <p className="font-medium">{vehicleEntry.driver?.license_no || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Details */}
        {assetData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Asset Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Supplier / shipment header */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Work Order Number</Label>
                  <p className="font-medium">{assetData.work_order_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Supplier Name</Label>
                  <p className="font-medium">{assetData.supplier_name}</p>
                </div>
                {assetData.invoice_number && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Invoice / Bill Number</Label>
                    <p className="font-medium">{assetData.invoice_number}</p>
                  </div>
                )}
              </div>

              {/* Items table */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4" />
                  Assets ({items.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">#</th>
                        <th className="py-2 pr-3 font-medium">Category</th>
                        <th className="py-2 pr-3 font-medium">Asset Name</th>
                        <th className="py-2 pr-3 font-medium">Serial Number</th>
                        <th className="py-2 pr-3 font-medium text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const category =
                          typeof item.asset_category === 'object'
                            ? item.asset_category.category_name
                            : '-';
                        const unit = typeof item.unit === 'object' ? item.unit.name : '';
                        return (
                          <tr key={item.id ?? i} className="border-b last:border-0">
                            <td className="py-2 pr-3">{i + 1}</td>
                            <td className="py-2 pr-3">{category}</td>
                            <td className="py-2 pr-3 font-medium">{item.asset_name}</td>
                            <td className="py-2 pr-3">{item.serial_number || '-'}</td>
                            <td className="py-2 pr-3 text-right font-medium">
                              {item.quantity} {unit}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              {assetData.remarks && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Remarks / Notes</Label>
                  <p className="text-sm">{assetData.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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
          {!isAlreadyCompleted ? (
            <Button type="button" onClick={handleComplete} disabled={isCompleting}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isCompleting ? 'Completing...' : 'Complete Entry'}
            </Button>
          ) : (
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
