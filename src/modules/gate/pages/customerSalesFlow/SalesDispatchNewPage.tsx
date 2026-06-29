import { FileText, RefreshCw, Truck } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type SalesDispatchDocument,
  type SalesDispatchDocumentType,
  type SalesDispatchGateOut,
  type SalesDispatchPendingBooking,
  useCreateSalesDispatch,
  useSalesDispatchByVehicleEntry,
  useSalesDispatchDocument,
  useSalesDispatchDocuments,
  useSalesDispatchPendingBookings,
  useUpdateSalesDispatch,
} from '@/modules/gate/api';
import {
  DriverSelect,
  type DriverSelection,
  StepFooter,
  StepHeader,
  StepLoadingSpinner,
  VehicleSelect,
  type VehicleSelection,
} from '@/modules/gate/components';
import { SearchableSelect } from '@/shared/components';
import { Button, Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  buildDocumentKey,
  buildDocumentLabel,
  buildEntryDocumentLabel,
  buildEntryDocumentKey,
  DOCKING_TOTAL_STEPS,
  formatDocumentType,
  lockedDateTimeInputClassName,
  toDateInputValue,
  toTimeInputValue,
} from './salesDispatchFlow.helpers';
import { DOCKING_ROUTES } from './salesDispatchRoutes';

interface DispatchDraft {
  vehicle: VehicleSelection | null;
  driver: DriverSelection | null;
  documentType: SalesDispatchDocumentType;
  documentKey: string;
  gateOutDate: string;
  outTime: string;
  securityName: string;
  biltyNo: string;
  biltyDate: string;
  dockIncharge: string;
  remarks: string;
}

const showServerResults = () => true;

function buildEmptyDraft(documentType: SalesDispatchDocumentType = 'INVOICE'): DispatchDraft {
  return {
    vehicle: null,
    driver: null,
    documentType,
    documentKey: '',
    gateOutDate: toDateInputValue(),
    outTime: toTimeInputValue(),
    securityName: '',
    biltyNo: '',
    biltyDate: '',
    dockIncharge: '',
    remarks: '',
  };
}

function dateInputFromTimestamp(value?: string | null) {
  if (!value) return toDateInputValue();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? toDateInputValue() : toDateInputValue(date);
}

function timeInputFromTimestamp(value?: string | null) {
  if (!value) return toTimeInputValue();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? toTimeInputValue() : toTimeInputValue(date);
}

function parseInitialDocumentType(value: string | null): SalesDispatchDocumentType {
  return value === 'STOCK_TRANSFER' ? 'STOCK_TRANSFER' : 'INVOICE';
}

function buildVehicleSelection(entry: SalesDispatchGateOut): VehicleSelection {
  return {
    vehicleId: entry.vehicle,
    vehicleNumber: entry.vehicle_no,
    vehicleType: '',
    vehicleCapacity: '',
    transporterId: entry.transporter || 0,
    transporterName: entry.transporter_name || '',
    transporterContactPerson: entry.transporter_contact_person || '',
    transporterMobile: entry.transporter_mobile_no || '',
  };
}

function buildDriverSelection(entry: SalesDispatchGateOut): DriverSelection {
  return {
    driverId: entry.driver,
    driverName: entry.driver_name,
    mobileNumber: entry.driver_mobile_no,
    drivingLicenseNumber: entry.driver_license_no || '',
    idProofType: entry.driver_id_proof_type || '',
    idProofNumber: entry.driver_id_proof_number || '',
    driverPhoto: null,
  };
}

function buildVehicleSelectionFromPendingBooking(
  booking: SalesDispatchPendingBooking,
): VehicleSelection {
  return {
    vehicleId: booking.vehicle || 0,
    vehicleNumber: booking.vehicle_no,
    vehicleType: '',
    vehicleCapacity: '',
    transporterId: booking.transporter || 0,
    transporterName: booking.transporter_name || '',
    transporterContactPerson: booking.transporter_contact_person || '',
    transporterMobile: booking.transporter_mobile_no || '',
    transporterGstin: booking.transporter_gstin || '',
  };
}

function buildDriverSelectionFromPendingBooking(
  booking: SalesDispatchPendingBooking,
): DriverSelection {
  return {
    driverId: booking.driver || 0,
    driverName: booking.driver_name,
    mobileNumber: booking.driver_mobile_no || '',
    drivingLicenseNumber: booking.driver_license_no || '',
    idProofType: booking.driver_id_proof_type || '',
    idProofNumber: booking.driver_id_proof_number || '',
    driverPhoto: null,
  };
}

function buildDocumentOptionFromPendingBooking(
  booking: SalesDispatchPendingBooking,
): SalesDispatchDocument | null {
  if (!booking.documents.length) return null;

  const primary = booking.documents[0];
  return {
    ...primary,
    doc_num: booking.document_numbers.join(', ') || primary.doc_num,
    card_name: booking.customer_name || primary.card_name,
    place_of_supply: booking.place_of_supply || primary.place_of_supply,
    eway_bill: booking.eway_bill || primary.eway_bill,
    item_summary: booking.item_summary || primary.item_summary,
    total_weight: booking.total_weight || primary.total_weight,
    plan: primary.plan,
  };
}

function buildDocumentOptionFromEntry(entry: SalesDispatchGateOut): SalesDispatchDocument {
  return {
    document_type: entry.document_type,
    doc_entry: entry.sap_doc_entry,
    doc_num: entry.sap_doc_num,
    doc_date: entry.sap_doc_date,
    doc_total: entry.sap_doc_total,
    branch_id: entry.sap_branch_id,
    branch_name: entry.sap_branch_name,
    card_code: entry.customer_code,
    card_name: entry.customer_name,
    ship_to_code: entry.ship_to_code,
    ship_to_address: entry.ship_to_address,
    place_of_supply: entry.place_of_supply,
    bp_gstin: entry.bp_gstin,
    eway_bill: entry.eway_bill,
    vehicle_no: entry.vehicle_no,
    transporter_name: entry.transporter_name,
    bilty_no: entry.bilty_no,
    bilty_date: entry.bilty_date,
    from_warehouse: entry.from_warehouse,
    to_warehouse: entry.to_warehouse,
    warehouses: entry.warehouses,
    item_summary: entry.item_summary,
    base_refs: entry.base_refs,
    total_quantity: entry.total_quantity,
    total_litres: entry.total_litres,
    total_boxes: entry.total_boxes,
    total_weight: entry.total_weight,
    line_count: entry.items?.length || 0,
    items: entry.items || [],
    plan: entry.dispatch_plan ? { id: entry.dispatch_plan } : null,
  };
}

function canEditEntry(entry?: SalesDispatchGateOut | null) {
  return !entry || ['DOCKED', 'PHOTO_ATTACHED', 'READY_FOR_GATEPASS'].includes(entry.status);
}

function parseDocumentKey(value: string) {
  const [documentType, docEntryText] = value.split(':');
  const docEntry = Number(docEntryText);

  if (
    (documentType === 'INVOICE' || documentType === 'STOCK_TRANSFER') &&
    Number.isFinite(docEntry) &&
    docEntry > 0
  ) {
    return {
      documentType,
      docEntry,
    };
  }

  return null;
}

function getCreateDocuments(
  documentType: SalesDispatchDocumentType,
  selectedDocuments: SalesDispatchDocument[],
  selectedDocument: SalesDispatchDocument | null,
) {
  const sourceDocuments =
    documentType === 'INVOICE' && selectedDocuments.length > 0
      ? selectedDocuments
      : selectedDocument
        ? [selectedDocument]
        : [];
  const seen = new Set<string>();

  return sourceDocuments.filter((document) => {
    const key = buildDocumentKey(document);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function SalesDispatchNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingVehicleEntryId = Number(searchParams.get('entryId') || 0) || null;
  const pendingDispatchPlanIds = searchParams.get('dispatchPlanIds') || '';
  const isPendingBookingMode = !existingVehicleEntryId && Boolean(pendingDispatchPlanIds);
  const initialDocumentType = parseInitialDocumentType(searchParams.get('documentType'));

  const [draft, setDraft] = useState<DispatchDraft>(() => buildEmptyDraft(initialDocumentType));
  const [selectedListDocument, setSelectedListDocument] = useState<SalesDispatchDocument | null>(
    null,
  );
  const [selectedDocuments, setSelectedDocuments] = useState<SalesDispatchDocument[]>([]);
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [formError, setFormError] = useState('');

  const { data: existingEntry, isLoading: isExistingLoading } =
    useSalesDispatchByVehicleEntry(existingVehicleEntryId);
  const { data: pendingBookings = [], isLoading: isPendingBookingLoading } =
    useSalesDispatchPendingBookings(
      // all_companies: the docking board is cross-company, so a pending row may
      // belong to a sibling company; resolve the booking regardless of the
      // active Company-Code (the backend keys the create off the plan's company).
      { dispatch_plan_ids: pendingDispatchPlanIds, all_companies: 1 },
      { enabled: isPendingBookingMode },
    );
  const {
    data: documents = [],
    isLoading: isDocumentsLoading,
    isError: isDocumentsError,
    refetch: refetchDocuments,
  } = useSalesDispatchDocuments(
    {
      document_type: draft.documentType,
      search: submittedSearch,
      limit: 50,
      // Manual SAP search spans every company the user belongs to (decorator);
      // a booked invoice still docks under its own company via its plan.
      all_companies: 1,
    },
    { enabled: !isPendingBookingMode && !existingVehicleEntryId },
  );
  const pendingBooking = pendingBookings[0] || null;
  const pendingBookingDocumentOption = useMemo(
    () => (pendingBooking ? buildDocumentOptionFromPendingBooking(pendingBooking) : null),
    [pendingBooking],
  );
  const existingEntryDocumentOption = useMemo(
    () => (existingEntry ? buildDocumentOptionFromEntry(existingEntry) : null),
    [existingEntry],
  );
  const selectedDocumentKey = useMemo(
    () => parseDocumentKey(draft.documentKey),
    [draft.documentKey],
  );
  const { data: selectedDocumentDetail } = useSalesDispatchDocument(
    existingEntry || isPendingBookingMode ? null : selectedDocumentKey?.documentType,
    existingEntry || isPendingBookingMode ? null : selectedDocumentKey?.docEntry,
  );
  const createSalesDispatch = useCreateSalesDispatch();
  const updateSalesDispatch = useUpdateSalesDispatch();
  const documentOptions = useMemo(() => {
    if (existingEntryDocumentOption) return [existingEntryDocumentOption];
    if (pendingBookingDocumentOption) return [pendingBookingDocumentOption];
    return documents;
  }, [documents, existingEntryDocumentOption, pendingBookingDocumentOption]);

  useEffect(() => {
    if (!existingEntry) return;

    setDraft({
      vehicle: buildVehicleSelection(existingEntry),
      driver: buildDriverSelection(existingEntry),
      documentType: existingEntry.document_type,
      documentKey: buildEntryDocumentKey(existingEntry),
      gateOutDate: dateInputFromTimestamp(existingEntry.docked_at),
      outTime: timeInputFromTimestamp(existingEntry.docked_at),
      securityName: existingEntry.security_name || '',
      biltyNo: existingEntry.bilty_no || '',
      biltyDate: existingEntry.bilty_date || '',
      dockIncharge: existingEntry.dock_incharge || '',
      remarks: existingEntry.remarks || '',
    });
    setSelectedDocuments([]);
    setSelectedListDocument(buildDocumentOptionFromEntry(existingEntry));
  }, [existingEntry]);

  useEffect(() => {
    if (!pendingBooking || existingEntry) return;
    const documentOption = buildDocumentOptionFromPendingBooking(pendingBooking);

    setDraft((current) => ({
      ...current,
      vehicle: buildVehicleSelectionFromPendingBooking(pendingBooking),
      driver: buildDriverSelectionFromPendingBooking(pendingBooking),
      documentType: 'INVOICE',
      documentKey: documentOption ? buildDocumentKey(documentOption) : '',
      biltyNo: pendingBooking.bilty_no || '',
      biltyDate: pendingBooking.bilty_date || '',
    }));
    setSelectedDocuments(pendingBooking.documents);
    setSelectedListDocument(documentOption);
    setSubmittedSearch('');
    setFormError('');
  }, [existingEntry, pendingBooking]);

  const documentFromList = useMemo(
    () =>
      documentOptions.find((document) => buildDocumentKey(document) === draft.documentKey) || null,
    [documentOptions, draft.documentKey],
  );
  const selectedDocument = selectedDocumentDetail || selectedListDocument || documentFromList;

  const documentDisplay = selectedDocument
    ? buildDocumentLabel(selectedDocument)
    : existingEntry
      ? buildEntryDocumentLabel(existingEntry)
      : '';
  const isExistingReadOnly = !canEditEntry(existingEntry);
  const isSaving = createSalesDispatch.isPending || updateSalesDispatch.isPending;

  const updateDraft = <K extends keyof DispatchDraft>(key: K, value: DispatchDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const handleDocumentTypeChange = (documentType: SalesDispatchDocumentType) => {
    setSelectedListDocument(null);
    setDraft((current) => ({
      ...current,
      documentType,
      documentKey: '',
    }));
    setSelectedDocuments([]);
    setSubmittedSearch('');
    setFormError('');
  };

  const handleSaveAndNext = async () => {
    if (existingEntry && isExistingReadOnly) {
      navigate(DOCKING_ROUTES.barcodeScan(existingEntry.vehicle_entry));
      return;
    }

    const selectedPayloadDocuments = getCreateDocuments(
      draft.documentType,
      selectedDocuments,
      selectedDocument,
    );

    if (!existingEntry && selectedPayloadDocuments.length === 0) {
      setFormError(`Please select the SAP ${formatDocumentType(draft.documentType).toLowerCase()}`);
      return;
    }

    if (!draft.vehicle?.vehicleId) {
      setFormError('Please select a vehicle');
      return;
    }

    if (!draft.driver?.driverId) {
      setFormError('Please select a driver');
      return;
    }

    if (!draft.gateOutDate) {
      setFormError('Docking date is required');
      return;
    }

    if (!draft.outTime) {
      setFormError('Docking time is required');
      return;
    }

    setFormError('');

    try {
      const payload = {
        security_name: draft.securityName,
        bilty_no: draft.biltyNo,
        bilty_date: draft.biltyDate || null,
        dock_incharge: draft.dockIncharge,
        remarks: draft.remarks,
      };
      // Editing an existing docking with no changes -> just advance; no redundant PATCH + toast.
      if (existingEntry) {
        const seededPayload = {
          security_name: existingEntry.security_name || '',
          bilty_no: existingEntry.bilty_no || '',
          bilty_date: existingEntry.bilty_date || null,
          dock_incharge: existingEntry.dock_incharge || '',
          remarks: existingEntry.remarks || '',
        };
        if (JSON.stringify(payload) === JSON.stringify(seededPayload)) {
          navigate(DOCKING_ROUTES.barcodeScan(existingEntry.vehicle_entry));
          return;
        }
      }
      const entry = existingEntry
        ? await updateSalesDispatch.mutateAsync({ id: existingEntry.id, data: payload })
        : await createSalesDispatch.mutateAsync({
            ...payload,
            document_type: selectedPayloadDocuments[0].document_type,
            sap_doc_entry: selectedPayloadDocuments[0].doc_entry,
            documents: selectedPayloadDocuments.map((document) => ({
              document_type: document.document_type,
              sap_doc_entry: document.doc_entry,
              dispatch_plan_id: getDispatchPlanId(document),
            })),
            vehicle_id: draft.vehicle.vehicleId,
            driver_id: draft.driver.driverId,
            dispatch_plan_id: getDispatchPlanId(selectedPayloadDocuments[0]),
          });

      toast.success('Docking details saved');
      navigate(DOCKING_ROUTES.barcodeScan(entry.vehicle_entry));
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save Docking entry'));
    }
  };

  if (
    (existingVehicleEntryId && isExistingLoading) ||
    (isPendingBookingMode && isPendingBookingLoading)
  ) {
    return <StepLoadingSpinner />;
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={1}
        totalSteps={DOCKING_TOTAL_STEPS}
        title="Docking"
        error={formError || null}
      />

      <div className="space-y-8">
        <FormSection icon={<Truck className="h-5 w-5" />} title="Vehicle & Driver">
          <div className="grid gap-4 lg:grid-cols-2">
            <VehicleSelect
              label="Vehicle Number"
              required
              value={draft.vehicle?.vehicleNumber || ''}
              disabled={isExistingReadOnly || !!existingEntry}
              defaultDisplayText={draft.vehicle?.vehicleNumber || ''}
              onChange={(vehicle) => updateDraft('vehicle', vehicle.vehicleId ? vehicle : null)}
              placeholder="Select vehicle"
            />
            <DriverSelect
              label="Driver"
              required
              value={draft.driver?.driverName || ''}
              disabled={isExistingReadOnly || !!existingEntry}
              defaultDisplayText={draft.driver?.driverName || ''}
              onChange={(driver) => updateDraft('driver', driver.driverId ? driver : null)}
              placeholder="Select driver"
            />
            <ReadOnlyDateTime dateValue={draft.gateOutDate} timeValue={draft.outTime} />
            <TextField
              id="sales-dispatch-security"
              label="Security Name"
              value={draft.securityName}
              disabled={isExistingReadOnly}
              onChange={(value) => updateDraft('securityName', value)}
              placeholder="Security staff name"
            />
          </div>
        </FormSection>

        <FormSection icon={<FileText className="h-5 w-5" />} title="SAP Document">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sales-dispatch-document-type">
                Document Type <span className="text-destructive">*</span>
              </Label>
              <NativeSelect
                id="sales-dispatch-document-type"
                value={draft.documentType}
                disabled={isExistingReadOnly || !!existingEntry || isPendingBookingMode}
                onChange={(event) =>
                  handleDocumentTypeChange(event.target.value as SalesDispatchDocumentType)
                }
              >
                <SelectOption value="INVOICE">Invoice</SelectOption>
                <SelectOption value="STOCK_TRANSFER">Stock Transfer</SelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>
                  SAP {formatDocumentType(draft.documentType)}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPendingBookingMode || !!existingEntry}
                  onClick={() => refetchDocuments()}
                >
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
              <SearchableSelect<SalesDispatchDocument>
                inputId="sales-dispatch-document"
                value={draft.documentKey}
                items={documentOptions}
                isLoading={!isPendingBookingMode && !existingEntry && isDocumentsLoading}
                isError={!isPendingBookingMode && !existingEntry && isDocumentsError}
                disabled={isExistingReadOnly || !!existingEntry || isPendingBookingMode}
                defaultDisplayText={documentDisplay}
                placeholder="Search by document, customer, item, or warehouse"
                getItemKey={buildDocumentKey}
                getItemLabel={buildDocumentLabel}
                filterFn={showServerResults}
                loadingText="Loading SAP documents..."
                emptyText="Search SAP documents"
                notFoundText="No SAP documents found"
                errorText="Failed to load SAP documents"
                onSearchChange={(value) => {
                  if (!isPendingBookingMode && !existingEntry) setSubmittedSearch(value.trim());
                }}
                onClear={() => {
                  setSelectedListDocument(null);
                  setSelectedDocuments([]);
                  updateDraft('documentKey', '');
                }}
                onItemSelect={(document) => {
                  setSelectedListDocument(document);
                  setSelectedDocuments([]);
                  updateDraft('documentKey', buildDocumentKey(document));
                }}
                renderItem={(document) => (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {formatDocumentType(document.document_type)} {document.doc_num}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[
                        document.doc_date,
                        document.card_name || document.to_warehouse || document.warehouses,
                        document.item_summary,
                      ]
                        .filter(Boolean)
                        .join(' - ')}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {document.total_quantity ? `Qty ${document.total_quantity}` : ''}
                    </div>
                  </div>
                )}
              />
            </div>
          </div>
        </FormSection>
      </div>

      <StepFooter
        onCancel={() => navigate(DOCKING_ROUTES.dashboard)}
        onNext={handleSaveAndNext}
        showPrevious={false}
        isSaving={isSaving}
        nextLabel={
          isExistingReadOnly ? 'Continue to Box Scanning' : isSaving ? 'Saving...' : 'Save and Next'
        }
      />
    </div>
  );
}

function getDispatchPlanId(document: SalesDispatchDocument | null) {
  const plan = document?.plan;
  if (!plan || typeof plan !== 'object') return null;
  const id = (plan as { id?: unknown }).id;
  return typeof id === 'number' ? id : null;
}

function FormSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
      <h3 className="flex items-center gap-2 text-xl font-semibold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function ReadOnlyDateTime({ dateValue, timeValue }: { dateValue: string; timeValue: string }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="sales-dispatch-date">
          Docking Date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="sales-dispatch-date"
          type="date"
          value={dateValue}
          readOnly
          disabled
          className={lockedDateTimeInputClassName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sales-dispatch-time">
          Docking Time <span className="text-destructive">*</span>
        </Label>
        <Input
          id="sales-dispatch-time"
          type="time"
          value={timeValue}
          readOnly
          disabled
          className={lockedDateTimeInputClassName}
        />
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
  disabled,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
