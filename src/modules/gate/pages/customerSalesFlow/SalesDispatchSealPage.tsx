import { AlertCircle, ExternalLink, FileText, Loader2, Save, ShieldCheck, Upload } from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  type SalesDispatchAttachment,
  useRecordSalesDispatchSeal,
  useSalesDispatchAttachments,
  useSalesDispatchByVehicleEntry,
} from '@/modules/gate/api';
import { StepFooter, StepHeader, StepLoadingSpinner } from '@/modules/gate/components';
import { useEntryId } from '@/modules/gate/hooks';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { getErrorMessage, resolveFileUrl } from '@/shared/utils';

import { formatValue } from './salesDispatchFlow.helpers';
import { getSalesDispatchRoutes } from './salesDispatchRoutes';

const SEAL_TOTAL_STEPS = 2;

// The truck is gone (or the load never left as itself); its seal is now history.
const SEAL_CLOSED_STATUSES = ['DISPATCHED', 'REJECTED', 'CANCELLED'];

/**
 * The gate's record of the seal it fastened on a truck at exit: the number stamped
 * on it, and a photo of it closed on the door.
 *
 * Lives in the Sales Dispatch Out flow rather than on the docking steps because the
 * seal goes on at the gate, long after the dock has finished with the load — by then
 * the docking is PRINT_COMMITTED and its own attachment endpoints have closed. Both
 * fields are optional: nothing here holds a truck back, it is a record for later.
 *
 * One seal holds one physical truck, so the server writes what is entered here to
 * every company's docking on the same trip; the gate says it once.
 */
export default function SalesDispatchSealPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routes = getSalesDispatchRoutes(location.pathname);
  const { hasPermission } = usePermission();
  const { entryIdNumber } = useEntryId();
  const [sealNumber, setSealNumber] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
    refetch: refetchEntry,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const { data: attachments = [], isLoading: isAttachmentsLoading } = useSalesDispatchAttachments(
    entry?.id,
  );
  const recordSeal = useRecordSalesDispatchSeal();

  const canRecordSeal = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.UPLOAD_PHOTO);
  const isClosed = entry ? SEAL_CLOSED_STATUSES.includes(entry.status) : false;
  const isDisabled = !canRecordSeal || isClosed || recordSeal.isPending;
  const sealPhotos: SalesDispatchAttachment[] = attachments.filter(
    (attachment) => attachment.attachment_type === 'SEAL_PHOTO',
  );

  useEffect(() => {
    setSealNumber(entry?.seal_number || '');
  }, [entry]);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPendingPhoto(file);
    setError(null);
  };

  const handleSave = async () => {
    if (!entry) {
      setError('Sales dispatch out entry not found.');
      return;
    }
    if (!sealNumber.trim()) {
      setError('Enter the seal number to record it.');
      return;
    }

    setError(null);
    try {
      await recordSeal.mutateAsync({
        id: entry.id,
        data: { seal_number: sealNumber.trim(), seal_photo: pendingPhoto },
      });
      setPendingPhoto(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Seal recorded for this truck');
      await refetchEntry();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Failed to record the seal'));
    }
  };

  if (isEntryLoading || isAttachmentsLoading) {
    return <StepLoadingSpinner />;
  }

  if (!entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={1}
          totalSteps={SEAL_TOTAL_STEPS}
          title="Sales Dispatch Out"
          error={
            error ||
            (entryError ? getErrorMessage(entryError, 'Sales dispatch out entry not found') : null)
          }
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-amber-900 dark:text-amber-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Sales dispatch out entry not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(routes.dashboard)}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={1}
        totalSteps={SEAL_TOTAL_STEPS}
        title="Sales Dispatch Out"
        error={error}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Truck Seal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <InfoItem label="Docking" value={entry.entry_no} />
            <InfoItem label="Vehicle" value={entry.vehicle_no} />
            <InfoItem label="Customer" value={entry.customer_name} />
          </div>

          <p className="text-sm text-muted-foreground">
            Record the seal fastened on this truck at the gate. One seal holds the whole
            truck, so this is saved against every company&apos;s docking on the trip. Both
            fields are optional — nothing here holds the truck back.
          </p>

          {isClosed ? (
            <p className="rounded-md border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-400">
              This truck has already left the gate; its seal can no longer be changed.
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sales-dispatch-out-seal-number">Seal No.</Label>
              <Input
                id="sales-dispatch-out-seal-number"
                value={sealNumber}
                disabled={isDisabled}
                placeholder="Number stamped on the seal"
                onChange={(event) => {
                  setSealNumber(event.target.value);
                  setError(null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sales-dispatch-out-seal-photo">Seal Photo</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDisabled}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {pendingPhoto ? 'Change photo' : 'Choose photo'}
                </Button>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {pendingPhoto ? pendingPhoto.name : 'No new photo chosen'}
                </span>
              </div>
              <input
                ref={fileInputRef}
                id="sales-dispatch-out-seal-photo"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isDisabled}
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {sealPhotos.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">On file</p>
              {sealPhotos.map((attachment) => (
                <a
                  key={attachment.id}
                  href={resolveFileUrl(attachment.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {attachment.original_filename || 'Seal photo'}
                  </span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={isDisabled}>
              {recordSeal.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Seal
            </Button>
          </div>
        </CardContent>
      </Card>

      <StepFooter
        onPrevious={() => navigate(routes.detail(entry.id))}
        onCancel={() => navigate(routes.dashboard)}
        onNext={() => navigate(routes.gatepass(entry.vehicle_entry))}
        nextLabel="Continue to Gate Out"
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{formatValue(value)}</p>
    </div>
  );
}
