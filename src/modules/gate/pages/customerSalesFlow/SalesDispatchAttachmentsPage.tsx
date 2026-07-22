import {
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
  LocateFixed,
  Paperclip,
  Save,
  Upload,
} from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  type SalesDispatchAttachment,
  type SalesDispatchAttachmentType,
  usePreviewSalesDispatchGatepass,
  useSalesDispatchAttachments,
  useSalesDispatchByVehicleEntry,
  useUpdateSalesDispatch,
  useUploadSalesDispatchAttachment,
} from '@/modules/gate/api';
import { useUploadArrivalTruckPhoto } from '@/modules/gate/api/arrivals/arrivals.queries';
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
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage, resolveFileUrl } from '@/shared/utils';

import { ReviewModeBanner } from './ReviewModeBanner';
import { DOCKING_TOTAL_STEPS, formatValue } from './salesDispatchFlow.helpers';
import { DOCKING_ROUTES } from './salesDispatchRoutes';

interface UploadPanelConfig {
  type: SalesDispatchAttachmentType;
  label: string;
  description: string;
  required?: boolean;
  needsGeolocation?: boolean;
  accept?: string;
}

interface TransportDocumentForm {
  eway_bill: string;
  bilty_no: string;
  bilty_date: string;
  freight: string;
  total_freight: string;
}

type TransportDocumentErrors = Partial<Record<keyof TransportDocumentForm | 'attachments', string>>;

const EMPTY_TRANSPORT_DOCUMENT_FORM: TransportDocumentForm = {
  eway_bill: '',
  bilty_no: '',
  bilty_date: '',
  freight: '',
  total_freight: '',
};

const UPLOAD_PANELS: UploadPanelConfig[] = [
  {
    type: 'TRUCK_PHOTO',
    label: 'Truck Photo',
    description: 'Live vehicle photo with GPS coordinates',
    required: true,
    needsGeolocation: true,
    accept: 'image/*',
  },
  {
    type: 'INVOICE_COPY',
    label: 'Invoice Copy',
    description: 'Invoice scan, photo, or PDF',
  },
  {
    type: 'DELIVERY_NOTE',
    label: 'Delivery Note',
    description: 'Delivery note or dispatch note',
  },
  {
    type: 'EWAY_BILL',
    label: 'E-way Bill',
    description: 'E-way bill document',
  },
  {
    type: 'BILTY',
    label: 'Bilty / LR',
    description: 'Freight document or LR copy',
  },
  {
    type: 'OTHER',
    label: 'Other Document',
    description: 'Any other supporting file',
  },
];

// Docking statuses where box scanning is still the active gate. Only these are subject
// to the scan-lock redirect; from GATEPASS_PRINTED onward the load has already moved
// forward (and older loads may pre-date the stricter box count), so they stay viewable.
const SCAN_LOCK_OPEN_STATUSES: string[] = ['DOCKED', 'PHOTO_ATTACHED', 'READY_FOR_GATEPASS'];

export default function SalesDispatchAttachmentsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { entryId, entryIdNumber } = useEntryId();
  const [searchParams] = useSearchParams();
  const isReview = searchParams.get('review') === '1';
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<SalesDispatchAttachmentType | null>(null);
  const [uploadingMessage, setUploadingMessage] = useState('');
  const [transportForm, setTransportForm] = useState<TransportDocumentForm>(
    EMPTY_TRANSPORT_DOCUMENT_FORM,
  );
  const [transportErrors, setTransportErrors] = useState<TransportDocumentErrors>({});

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
    refetch: refetchEntry,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const { data: attachments = [], isLoading: isAttachmentsLoading } = useSalesDispatchAttachments(
    entry?.id,
  );
  const uploadAttachment = useUploadSalesDispatchAttachment();
  const uploadArrivalTruckPhoto = useUploadArrivalTruckPhoto();
  const updateSalesDispatch = useUpdateSalesDispatch();
  // A multi-company truck is one physical load: its photo attaches to (and locks)
  // every company's docking in one upload via the arrival endpoint, instead of a
  // separate photo per company.
  const isMultiCompanyArrival = (entry?.arrival_company_count ?? 0) > 1 && Boolean(entry?.arrival);
  const previewGatepass = usePreviewSalesDispatchGatepass();

  const isReadOnly = entry
    ? ['PRINT_COMMITTED', 'DISPATCHED', 'REJECTED', 'CANCELLED'].includes(entry.status)
    : false;
  const canUploadAttachments = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.UPLOAD_PHOTO);
  const canEditDispatch = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.EDIT);
  const isLoading = isEntryLoading || isAttachmentsLoading;
  const hasTruckPhoto =
    attachments.some(
      (attachment) =>
        attachment.attachment_type === 'TRUCK_PHOTO' &&
        attachment.latitude !== null &&
        attachment.longitude !== null,
    ) || Boolean(entry?.gatepass_readiness.has_truck_photo_geolocation);
  const hasBiltyAttachment = attachments.some(
    (attachment) => attachment.attachment_type === 'BILTY',
  );
  const hasEwayBillAttachment = attachments.some(
    (attachment) => attachment.attachment_type === 'EWAY_BILL',
  );
  const ewayBillRequired = entry ? requiresEwayBill(entry) : false;
  const uploadPanels = UPLOAD_PANELS.map((panel) => ({
    ...panel,
    required:
      panel.required ||
      panel.type === 'BILTY' ||
      (panel.type === 'EWAY_BILL' && ewayBillRequired),
  }));

  // Hard scan-lock: an un-cleared docking load may not sit on the attachments step.
  // If box scanning isn't complete/approved yet, bounce back to the scanning step where
  // the operator scans or requests skip / partial-dispatch approval. Never in review mode,
  // and only for the open pre-print statuses so already-printed loads stay viewable.
  useEffect(() => {
    if (!entry || isReview) return;
    if (!SCAN_LOCK_OPEN_STATUSES.includes(entry.status)) return;
    if (entry.gatepass_readiness?.has_box_scans === false) {
      toast.warning(
        'Finish box scanning — or get skip / partial-dispatch approval — before adding attachments.',
      );
      navigate(DOCKING_ROUTES.barcodeScan(entryId || entry.vehicle_entry), { replace: true });
    }
  }, [entry, isReview, entryId, navigate]);

  useEffect(() => {
    if (!entry) {
      setTransportForm(EMPTY_TRANSPORT_DOCUMENT_FORM);
      return;
    }

    setTransportForm({
      eway_bill: entry.eway_bill || '',
      bilty_no: entry.bilty_no || '',
      bilty_date: entry.bilty_date || '',
      freight: entry.freight ?? '',
      total_freight: entry.total_freight ?? '',
    });
  }, [entry]);

  const updateTransportField = <K extends keyof TransportDocumentForm>(
    field: K,
    value: TransportDocumentForm[K],
  ) => {
    setTransportForm((prev) => ({ ...prev, [field]: value }));
    setTransportErrors((prev) => ({ ...prev, [field]: undefined }));
    setError(null);
  };

  const validateTransportDocuments = (includeAttachments: boolean) => {
    const errors: TransportDocumentErrors = {};
    if (!transportForm.bilty_no.trim()) {
      errors.bilty_no = 'Bilty / LR number is required.';
    }
    if (!transportForm.bilty_date) {
      errors.bilty_date = 'Bilty date is required.';
    }
    if (ewayBillRequired && !transportForm.eway_bill.trim()) {
      errors.eway_bill = 'E-way bill is required for invoices above Rs 50,000.';
    }
    if (includeAttachments && !hasBiltyAttachment) {
      errors.attachments = 'Bilty / LR attachment is required.';
    }
    if (includeAttachments && ewayBillRequired && !hasEwayBillAttachment) {
      errors.attachments = errors.attachments
        ? `${errors.attachments} E-way bill attachment is required for invoices above Rs 50,000.`
        : 'E-way bill attachment is required for invoices above Rs 50,000.';
    }

    setTransportErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0] || 'Please complete required transport document details.');
      return false;
    }
    return true;
  };

  const saveTransportDocuments = async () => {
    if (!entry) {
      setError('Docking details not found.');
      return false;
    }

    setError(null);
    try {
      await updateSalesDispatch.mutateAsync({
        id: entry.id,
        data: {
          eway_bill: transportForm.eway_bill.trim(),
          bilty_no: transportForm.bilty_no.trim(),
          bilty_date: transportForm.bilty_date || null,
          freight: transportForm.freight || null,
          total_freight: transportForm.total_freight || null,
        },
      });
      toast.success('Transport document details saved');
      await refetchEntry();
      return true;
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Failed to save transport document details'));
      return false;
    }
  };

  const handleSaveTransportDocuments = async () => {
    if (!validateTransportDocuments(false)) return;
    await saveTransportDocuments();
  };

  const handleUpload = async (type: SalesDispatchAttachmentType, file: File) => {
    if (!entry) {
      setError('Docking details not found.');
      return;
    }

    if (!canUploadAttachments) {
      setError('You do not have permission to upload Docking photos or documents.');
      return;
    }

    setError(null);
    setUploadingType(type);

    try {
      setUploadingMessage(
        type === 'TRUCK_PHOTO' ? 'Getting GPS location...' : 'Uploading document...',
      );
      const location = type === 'TRUCK_PHOTO' ? await getBrowserPosition() : null;
      setUploadingMessage(
        type === 'TRUCK_PHOTO' ? 'Uploading truck photo...' : 'Uploading document...',
      );
      const uploadOnce = (allowPartial: boolean) =>
        type === 'TRUCK_PHOTO' && isMultiCompanyArrival && entry.arrival
          ? // One physical truck: the photo fans to every company's docking in a
            // single arrival-level upload (and locks the whole truck's load).
            uploadArrivalTruckPhoto.mutateAsync({
              id: entry.arrival,
              data: {
                file,
                notes,
                latitude: location?.latitude ?? null,
                longitude: location?.longitude ?? null,
                ...(allowPartial ? { allow_partial: true } : {}),
              },
            })
          : uploadAttachment.mutateAsync({
              id: entry.id,
              data: {
                attachment_type: type,
                file,
                notes,
                latitude: location?.latitude ?? null,
                longitude: location?.longitude ?? null,
                ...(allowPartial ? { allow_partial: true } : {}),
              },
            });
      try {
        await uploadOnce(false);
      } catch (blockError) {
        // "One docking per truck": the truck photo is blocked while booked bills
        // are still un-docked. Let the operator dock them first, or override to
        // dispatch what's loaded and leave the rest.
        const respData = (
          blockError as {
            response?: {
              data?: {
                requires_partial_override?: boolean;
                detail?: string;
                undocked_bills?: { sap_doc_num: string }[];
              };
            };
          }
        )?.response?.data;
        if (type === 'TRUCK_PHOTO' && respData?.requires_partial_override) {
          const bills = (respData.undocked_bills ?? [])
            .map((b) => b.sap_doc_num)
            .join(', ');
          const proceed = window.confirm(
            `${respData.detail ?? 'This truck has booked bills not on this docking.'}\n\n` +
              `OK = dispatch partial (leave ${bills} behind).\n` +
              `Cancel = go dock the remaining bills onto this docking first.`,
          );
          if (!proceed) {
            toast.info('Dock the remaining bills onto this docking, then upload the photo.');
            return;
          }
          await uploadOnce(true);
        } else {
          throw blockError;
        }
      }
      toast.success(
        type === 'TRUCK_PHOTO' ? 'Truck photo uploaded with location' : 'Document uploaded',
      );
      await refetchEntry();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Failed to upload attachment'));
    } finally {
      setUploadingType(null);
      setUploadingMessage('');
    }
  };

  const handleNext = async () => {
    if (!entry) {
      setError('Docking details not found.');
      return;
    }

    if (!hasTruckPhoto) {
      setError('Truck photo with geolocation is required before gatepass printing.');
      return;
    }
    if (!validateTransportDocuments(true)) return;

    try {
      // Transport docs already saved and unchanged -> skip the redundant PATCH + toast.
      const seededTransport = {
        eway_bill: entry.eway_bill || '',
        bilty_no: entry.bilty_no || '',
        bilty_date: entry.bilty_date || '',
        freight: entry.freight ?? '',
        total_freight: entry.total_freight ?? '',
      };
      const transportChanged = JSON.stringify(transportForm) !== JSON.stringify(seededTransport);
      if (transportChanged) {
        const saved = await saveTransportDocuments();
        if (!saved) return;
      }
      const preview = await previewGatepass.mutateAsync(entry.id);
      if (!preview.gatepass_readiness.ready) {
        setError(formatReadinessError(preview.gatepass_readiness.missing));
        return;
      }
      navigate(DOCKING_ROUTES.gatepass(entry.vehicle_entry));
    } catch (previewError) {
      setError(getErrorMessage(previewError, 'Failed to prepare gatepass'));
    }
  };

  if (isLoading) {
    return <StepLoadingSpinner />;
  }

  if (!entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={3}
          totalSteps={DOCKING_TOTAL_STEPS}
          title="Docking"
          error={
            error || (entryError ? getErrorMessage(entryError, 'Docking details not found') : null)
          }
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Docking details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(DOCKING_ROUTES.newEntry)}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={3} totalSteps={DOCKING_TOTAL_STEPS} title="Docking" error={error} />

      {isReview ? <ReviewModeBanner /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transport Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sales-dispatch-eway-bill">
                E-way Bill {ewayBillRequired && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="sales-dispatch-eway-bill"
                value={transportForm.eway_bill}
                disabled={isReadOnly || !canEditDispatch || updateSalesDispatch.isPending}
                aria-invalid={Boolean(transportErrors.eway_bill)}
                onChange={(event) => updateTransportField('eway_bill', event.target.value)}
              />
              {transportErrors.eway_bill && (
                <p className="text-xs text-destructive">{transportErrors.eway_bill}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sales-dispatch-bilty-no">
                Bilty / LR No. <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sales-dispatch-bilty-no"
                value={transportForm.bilty_no}
                disabled={isReadOnly || !canEditDispatch || updateSalesDispatch.isPending}
                aria-invalid={Boolean(transportErrors.bilty_no)}
                onChange={(event) => updateTransportField('bilty_no', event.target.value)}
              />
              {transportErrors.bilty_no && (
                <p className="text-xs text-destructive">{transportErrors.bilty_no}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sales-dispatch-bilty-date">
                Bilty Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sales-dispatch-bilty-date"
                type="date"
                value={transportForm.bilty_date}
                disabled={isReadOnly || !canEditDispatch || updateSalesDispatch.isPending}
                aria-invalid={Boolean(transportErrors.bilty_date)}
                onChange={(event) => updateTransportField('bilty_date', event.target.value)}
              />
              {transportErrors.bilty_date && (
                <p className="text-xs text-destructive">{transportErrors.bilty_date}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sales-dispatch-freight">Freight</Label>
              <Input
                id="sales-dispatch-freight"
                type="number"
                min={0}
                step="0.01"
                value={transportForm.freight}
                disabled={isReadOnly || !canEditDispatch || updateSalesDispatch.isPending}
                onChange={(event) => updateTransportField('freight', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sales-dispatch-total-freight">Total Freight</Label>
              <Input
                id="sales-dispatch-total-freight"
                type="number"
                min={0}
                step="0.01"
                value={transportForm.total_freight}
                disabled={isReadOnly || !canEditDispatch || updateSalesDispatch.isPending}
                onChange={(event) => updateTransportField('total_freight', event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSaveTransportDocuments}
              disabled={isReadOnly || !canEditDispatch || updateSalesDispatch.isPending}
            >
              {updateSalesDispatch.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Details
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Photo & Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            {uploadPanels.map((panel) => (
              <DocumentUploadPanel
                key={panel.type}
                panel={panel}
                disabled={
                  isReadOnly ||
                  !canUploadAttachments ||
                  uploadAttachment.isPending ||
                  Boolean(uploadingType)
                }
                isUploading={uploadingType === panel.type}
                uploadingMessage={uploadingMessage}
                attachments={attachments.filter(
                  (attachment) => attachment.attachment_type === panel.type,
                )}
                onUpload={handleUpload}
              />
            ))}
          </div>
          {transportErrors.attachments && (
            <p className="text-sm text-destructive">{transportErrors.attachments}</p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4 border-t pt-6">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <FileText className="h-5 w-5" />
          Upload Notes
        </h3>
        <div className="space-y-2">
          <Label htmlFor="sales-dispatch-attachment-notes">Notes</Label>
          <Textarea
            id="sales-dispatch-attachment-notes"
            value={notes}
            disabled={isReadOnly}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional note saved with newly uploaded files"
            rows={4}
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LocateFixed className="h-5 w-5" />
            Gatepass Readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <InfoItem label="Truck Photo Location" value={hasTruckPhoto ? 'Captured' : 'Required'} />
          <InfoItem
            label="Box Scanning"
            value={entry.gatepass_readiness.has_box_scans ? 'Captured' : 'Pending'}
          />
          <InfoItem
            label="SAP Items"
            value={entry.gatepass_readiness.has_items ? 'Available' : 'Missing'}
          />
          <InfoItem
            label="Bilty Details"
            value={
              entry.gatepass_readiness.has_bilty_details && hasBiltyAttachment
                ? 'Captured'
                : 'Required'
            }
          />
          {ewayBillRequired && (
            <InfoItem
              label="E-way Bill"
              value={
                entry.gatepass_readiness.has_eway_bill && hasEwayBillAttachment
                  ? 'Captured'
                  : 'Required'
              }
            />
          )}
        </CardContent>
      </Card>

      <StepFooter
        onPrevious={() =>
          navigate(DOCKING_ROUTES.barcodeScan(entryId || entry.vehicle_entry, isReview))
        }
        onCancel={() => navigate(DOCKING_ROUTES.dashboard)}
        onNext={
          isReview
            ? () => navigate(DOCKING_ROUTES.gatepass(entry.vehicle_entry, true))
            : handleNext
        }
        isSaving={previewGatepass.isPending}
        nextLabel={isReview ? 'Next →' : previewGatepass.isPending ? 'Preparing...' : 'Prepare Gatepass'}
      />
    </div>
  );
}

function DocumentUploadPanel({
  panel,
  disabled,
  isUploading,
  uploadingMessage,
  attachments,
  onUpload,
}: {
  panel: UploadPanelConfig;
  disabled: boolean;
  isUploading: boolean;
  uploadingMessage: string;
  attachments: SalesDispatchAttachment[];
  onUpload: (type: SalesDispatchAttachmentType, file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUpload(panel.type, file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled}
        aria-busy={isUploading}
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">
          {isUploading ? uploadingMessage : panel.label}{' '}
          {!isUploading && panel.required && <span className="text-destructive">*</span>}
        </span>
        <span className="text-xs text-muted-foreground">
          {isUploading ? 'Please wait while this file is saved.' : panel.description}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={panel.accept}
        className="hidden"
        disabled={disabled}
        onChange={handleFileSelect}
      />

      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={resolveFileUrl(attachment.file)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {attachment.original_filename || attachment.file.split('/').pop() || panel.label}
              </span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {panel.required ? `${panel.label} is required.` : 'No file uploaded yet.'}
        </p>
      )}
    </div>
  );
}

function getBrowserPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: roundCoordinate(position.coords.latitude),
          longitude: roundCoordinate(position.coords.longitude),
        });
      },
      () => reject(new Error('Location permission is required for truck photo upload.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function requiresEwayBill(entry: {
  document_type: string;
  sap_doc_total?: string | number | null;
  documents?: Array<{
    document_type: string;
    sap_doc_total?: string | number | null;
  }>;
}) {
  const documents = entry.documents?.length
    ? entry.documents
    : [{ document_type: entry.document_type, sap_doc_total: entry.sap_doc_total }];
  return documents.some(
    (document) =>
      document.document_type === 'INVOICE' && parseAmount(document.sap_doc_total) > 50000,
  );
}

function parseAmount(value?: string | number | null) {
  const amount = typeof value === 'number' ? value : Number.parseFloat(value || '0');
  return Number.isFinite(amount) ? amount : 0;
}

const READINESS_LABELS: Record<string, string> = {
  truck_photo_geolocation: 'truck photo with location',
  box_scans: 'box scanning',
  document_items: 'SAP items',
  bilty_no: 'bilty / LR number',
  bilty_date: 'bilty date',
  bilty_attachment: 'bilty / LR attachment',
  eway_bill: 'e-way bill number',
  eway_bill_attachment: 'e-way bill attachment',
};

function formatReadinessError(missing: string[]) {
  const labels = missing.map((item) => READINESS_LABELS[item] || item).join(', ');
  return `Complete required Docking details before preparing the gatepass: ${labels}.`;
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{formatValue(value)}</p>
    </div>
  );
}
