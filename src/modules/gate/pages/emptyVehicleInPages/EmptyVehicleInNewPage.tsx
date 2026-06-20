import { ArrowLeft, ArrowRight, FileText, LogIn, ShieldCheck, Truck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useGlobalDateRange } from '@/core/store/hooks';
import { useDispatchBills } from '@/modules/dashboards/dispatch-plans/api';
import {
  type EmptyVehicleGateInEntry,
  type EmptyVehicleGateInReasonValue,
  type SAPStockTransfer,
  useCreateEmptyVehicleGateIn,
  useEmptyVehicleGateIn,
  useEmptyVehicleGateInEntries,
  useEmptyVehicleGateInReasons,
  useSAPStockTransfer,
  useSAPStockTransfers,
  useUpdateEmptyVehicleGateIn,
} from '@/modules/gate/api';
import {
  DriverSelect,
  type DriverSelection,
  VehicleSelect,
  type VehicleSelection,
} from '@/modules/gate/components';
import { useVehicleById } from '@/modules/gate/api/vehicle/vehicle.queries';
import { SearchableSelect } from '@/shared/components';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  buildDispatchDocumentNotes,
  buildDispatchDocumentReference,
  buildExpectedDispatchDescription,
  buildExpectedDispatchVehicles,
  type ExpectedDispatchVehicle,
  findExpectedDispatchVehicle,
} from './emptyVehicleInDispatch';
import { EMPTY_VEHICLE_IN_ROUTES, getGateInId } from './emptyVehicleInRoutes';

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const lockedInputClassName =
  'bg-muted/40 text-foreground disabled:cursor-not-allowed disabled:opacity-100';

function buildTransferLabel(transfer: SAPStockTransfer) {
  return [
    `BST ${transfer.doc_num}`,
    transfer.doc_date,
    `${transfer.from_warehouse || '-'} -> ${transfer.to_warehouse || '-'}`,
    `${transfer.line_count} line${transfer.line_count === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' - ');
}

function buildEntryTransferSnapshot(entry?: EmptyVehicleGateInEntry | null): SAPStockTransfer | null {
  if (!entry?.sap_doc_entry) return null;

  const lines = (entry.items || []).map((item) => ({
    line_num: item.line_num,
    item_code: item.item_code,
    item_name: item.item_name,
    quantity: Number(item.sap_quantity || 0),
    uom: item.uom,
    from_warehouse: item.from_warehouse,
    to_warehouse: item.to_warehouse,
  }));

  return {
    doc_entry: entry.sap_doc_entry,
    doc_num: entry.sap_doc_num || String(entry.sap_doc_entry),
    doc_date: entry.sap_doc_date || null,
    tax_date: null,
    doc_status: '',
    from_warehouse: entry.sap_from_warehouse || '',
    to_warehouse: entry.sap_to_warehouse || '',
    comments: entry.sap_comments || '',
    reference: entry.sap_reference || '',
    branch_id: null,
    line_count: entry.sap_line_count || 0,
    total_quantity: Number(entry.sap_total_quantity || 0),
    lines,
  };
}

function buildLineQuantityMap(transfer?: SAPStockTransfer | null) {
  return Object.fromEntries(
    (transfer?.lines || []).map((line) => [line.line_num, String(line.quantity ?? '')]),
  );
}

const showServerResults = () => true;

export default function EmptyVehicleInNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dateRange } = useGlobalDateRange();
  const gateInId = getGateInId(searchParams);
  const expectedVehicleId = Number(searchParams.get('expectedVehicleId') || 0) || null;
  const dispatchDocEntry = Number(searchParams.get('dispatchDocEntry') || 0) || null;
  const isExpectedDispatchEntry = !gateInId && Boolean(expectedVehicleId || dispatchDocEntry);

  const [vehicle, setVehicle] = useState<VehicleSelection | null>(null);
  const [driver, setDriver] = useState<DriverSelection | null>(null);
  const [reason, setReason] = useState<EmptyVehicleGateInReasonValue | ''>('');
  const [selectedDocEntry, setSelectedDocEntry] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [selectedTransferSnapshot, setSelectedTransferSnapshot] = useState<SAPStockTransfer | null>(null);
  const [documentReference, setDocumentReference] = useState('');
  const [documentNotes, setDocumentNotes] = useState('');
  const [actualQuantities, setActualQuantities] = useState<Record<number, string>>({});
  const [gateInDate, setGateInDate] = useState(() => toDateInputValue());
  const [inTime, setInTime] = useState(() => toTimeInputValue());
  const [securityName, setSecurityName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const isBstReason = reason === 'BST';
  // DISPATCH reference/notes are auto-derived from the linked bills and not stored,
  // so they are shown read-only rather than as editable inputs.
  const isDispatchReason = reason === 'DISPATCH';

  const { data: reasons = [], isLoading: isReasonsLoading } = useEmptyVehicleGateInReasons();
  const { data: existingEntry, isLoading: isExistingLoading } = useEmptyVehicleGateIn(gateInId);
  const {
    data: activeDispatchEntries = [],
  } = useEmptyVehicleGateInEntries({ reason: 'DISPATCH', inside_only: true });
  const { data: expectedVehicleDetails } = useVehicleById(
    expectedVehicleId,
    isExpectedDispatchEntry && Boolean(expectedVehicleId),
  );
  const { data: expectedDispatchResponse } = useDispatchBills({
    date_from: dateRange.from,
    date_to: dateRange.to,
    booking_status: 'BOOKED',
    limit: 200,
  });
  const {
    data: sapTransfers = [],
    isLoading: isTransfersLoading,
    isError: isTransfersError,
  } = useSAPStockTransfers({ search: submittedSearch, limit: 50 }, { enabled: isBstReason });
  const { data: selectedTransfer, isLoading: isTransferLoading } = useSAPStockTransfer(
    selectedDocEntry ? Number(selectedDocEntry) : null,
  );
  const createEmptyGateIn = useCreateEmptyVehicleGateIn();
  const updateEmptyGateIn = useUpdateEmptyVehicleGateIn();
  const expectedDispatchVehicles = useMemo(
    () => buildExpectedDispatchVehicles(expectedDispatchResponse?.data || [], activeDispatchEntries),
    [activeDispatchEntries, expectedDispatchResponse?.data],
  );
  const selectedExpectedDispatch = useMemo(
    () => findExpectedDispatchVehicle(
      expectedDispatchVehicles,
      dispatchDocEntry,
      expectedVehicleId,
    ),
    [dispatchDocEntry, expectedDispatchVehicles, expectedVehicleId],
  );
  const priorityVehicleIds = useMemo(
    () => expectedDispatchVehicles.map((expectedVehicle) => expectedVehicle.vehicleId),
    [expectedDispatchVehicles],
  );
  const priorityVehicleMeta = useMemo(
    () =>
      Object.fromEntries(
        expectedDispatchVehicles.map((expectedVehicle) => [
          expectedVehicle.vehicleId,
          { description: buildExpectedDispatchDescription(expectedVehicle) },
        ]),
      ),
    [expectedDispatchVehicles],
  );

  const applyExpectedDispatch = useCallback((expectedDispatch: ExpectedDispatchVehicle) => {
    setReason('DISPATCH');
    setDocumentReference(buildDispatchDocumentReference(expectedDispatch));
    setDocumentNotes(buildDispatchDocumentNotes(expectedDispatch));
    setSelectedDocEntry('');
    setSelectedTransferSnapshot(null);
    setActualQuantities({});
    setSubmittedSearch('');
  }, []);

  useEffect(() => {
    if (!existingEntry) return;

    const snapshot = buildEntryTransferSnapshot(existingEntry);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync edit form from loaded empty vehicle entry
    setVehicle({
      vehicleId: existingEntry.vehicle,
      vehicleNumber: existingEntry.vehicle_number,
      vehicleType: existingEntry.vehicle_type || '',
      vehicleCapacity: '',
      transporterId: 0,
      transporterName: existingEntry.transporter_name || '',
      transporterContactPerson: '',
      transporterMobile: '',
    });
    setDriver({
      driverId: existingEntry.driver,
      driverName: existingEntry.driver_name,
      mobileNumber: existingEntry.driver_mobile,
      drivingLicenseNumber: '',
      idProofType: '',
      idProofNumber: '',
      driverPhoto: null,
    });
    setReason(existingEntry.reason);
    setSelectedDocEntry(existingEntry.sap_doc_entry ? String(existingEntry.sap_doc_entry) : '');
    setSelectedTransferSnapshot(snapshot);
    setActualQuantities(
      Object.fromEntries(
        (existingEntry.items || []).map((item) => [
          item.line_num,
          String(item.actual_quantity || item.sap_quantity || ''),
        ]),
      ),
    );
    setDocumentReference(existingEntry.document_reference || '');
    setDocumentNotes(existingEntry.document_notes || '');
    setGateInDate(existingEntry.gate_in_date || toDateInputValue());
    setInTime((existingEntry.in_time || toTimeInputValue()).slice(0, 5));
    setSecurityName(existingEntry.security_name || '');
    setRemarks(existingEntry.remarks || '');
  }, [existingEntry]);

  useEffect(() => {
    if (gateInId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset reused route form after leaving edit mode
    setVehicle(null);
    setDriver(null);
    setReason('');
    setSelectedDocEntry('');
    setSubmittedSearch('');
    setSelectedTransferSnapshot(null);
    setActualQuantities({});
    setDocumentReference('');
    setDocumentNotes('');
    setGateInDate(toDateInputValue());
    setInTime(toTimeInputValue());
    setSecurityName('');
    setRemarks('');
    setFormError('');
  }, [gateInId]);

  useEffect(() => {
    if (gateInId || !selectedExpectedDispatch) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL-selected dispatch vehicle should seed the new-entry form.
    setVehicle((current) => {
      if (current?.vehicleId === selectedExpectedDispatch.vehicleId) return current;
      return {
        vehicleId: selectedExpectedDispatch.vehicleId,
        vehicleNumber: selectedExpectedDispatch.vehicleNo,
        vehicleType: '',
        vehicleCapacity: '',
        transporterId: 0,
        transporterName: selectedExpectedDispatch.transporterName,
        transporterContactPerson: '',
        transporterMobile: '',
      };
    });
    applyExpectedDispatch(selectedExpectedDispatch);
  }, [applyExpectedDispatch, gateInId, selectedExpectedDispatch]);

  useEffect(() => {
    if (gateInId || selectedExpectedDispatch || !expectedVehicleDetails) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL-selected expected vehicle should seed the locked field while dispatch details load.
    setVehicle((current) => {
      if (current?.vehicleId === expectedVehicleDetails.id) return current;
      return {
        vehicleId: expectedVehicleDetails.id,
        vehicleNumber: expectedVehicleDetails.vehicle_number,
        vehicleType: expectedVehicleDetails.vehicle_type.name,
        vehicleCapacity: `${expectedVehicleDetails.capacity_ton} Tons`,
        transporterId: expectedVehicleDetails.transporter?.id || 0,
        transporterName: expectedVehicleDetails.transporter?.name || '',
        transporterContactPerson: expectedVehicleDetails.transporter?.contact_person || '',
        transporterMobile: expectedVehicleDetails.transporter?.mobile_no || '',
      };
    });
    setReason('DISPATCH');
  }, [expectedVehicleDetails, gateInId, selectedExpectedDispatch]);

  useEffect(() => {
    if (!selectedTransfer?.lines?.length) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Seed actual quantities from SAP line quantities when details load
    setActualQuantities((current) => {
      const next = { ...current };
      selectedTransfer.lines?.forEach((line) => {
        if (next[line.line_num] === undefined) {
          next[line.line_num] = String(line.quantity ?? '');
        }
      });
      return next;
    });
  }, [selectedTransfer]);

  const selectedTransferForDisplay = selectedTransfer || selectedTransferSnapshot;
  const selectedTransferDisplay = selectedTransferForDisplay
    ? buildTransferLabel(selectedTransferForDisplay)
    : '';
  const isEditing = Boolean(gateInId);
  const isBstDocumentLocked = Boolean(existingEntry?.is_bst_document_locked);
  const isSaving = createEmptyGateIn.isPending || updateEmptyGateIn.isPending;
  const headerTitle = isEditing ? 'Edit Empty Vehicle Entry' : 'New Empty Vehicle Entry';
  const headerSubtitle = isEditing
    ? 'Update the linked document before weighment'
    : 'Select vehicle, driver, entry reason, and linked document';

  const handleSubmit = async () => {
    if (!isEditing && !vehicle?.vehicleId) {
      setFormError('Please select a vehicle');
      return;
    }

    if (!isEditing && !driver?.driverId) {
      setFormError('Please select a driver');
      return;
    }

    if (!reason) {
      setFormError('Please select a reason');
      return;
    }

    if (isBstReason && !selectedDocEntry) {
      setFormError('Please select the SAP BST document for this vehicle');
      return;
    }

    const bstLines = isBstReason ? selectedTransferForDisplay?.lines || [] : [];
    if (isBstReason && bstLines.length > 0) {
      const invalidLine = bstLines.find((line) => {
        const value = actualQuantities[line.line_num];
        return value === undefined || value === '' || Number(value) < 0 || Number.isNaN(Number(value));
      });

      if (invalidLine) {
        setFormError(`Please enter actual quantity for line ${invalidLine.line_num}`);
        return;
      }
    }

    if (!gateInDate) {
      setFormError('Gate in date is required');
      return;
    }

    if (!inTime) {
      setFormError('In time is required');
      return;
    }

    setFormError('');

    try {
      if (isEditing && existingEntry) {
        await updateEmptyGateIn.mutateAsync({
          id: existingEntry.id,
          data: {
            ...(isBstDocumentLocked
              ? {}
              : {
                  ...(isBstReason
                    ? {
                        sap_doc_entry: Number(selectedDocEntry),
                        items: bstLines.map((line) => ({
                          line_num: line.line_num,
                          actual_quantity: Number(
                            actualQuantities[line.line_num] || line.quantity || 0,
                          ),
                        })),
                      }
                    : {}),
                  document_reference: documentReference,
                  document_notes: documentNotes,
                }),
            security_name: securityName,
            remarks,
          },
        });

        toast.success('Empty vehicle entry updated');
        navigate(EMPTY_VEHICLE_IN_ROUTES.weighment(existingEntry.id));
        return;
      }

      const savedEntry = await createEmptyGateIn.mutateAsync({
        vehicle_id: vehicle!.vehicleId,
        driver_id: driver!.driverId,
        reason,
        gate_in_date: gateInDate,
        in_time: inTime,
        ...(isBstReason
          ? {
              sap_doc_entry: Number(selectedDocEntry),
              items: bstLines.map((line) => ({
                line_num: line.line_num,
                actual_quantity: Number(
                  actualQuantities[line.line_num] || line.quantity || 0,
                ),
              })),
            }
          : {}),
        document_reference: documentReference,
        document_notes: documentNotes,
        security_name: securityName,
        remarks,
      });

      toast.success('Empty vehicle details saved');
      navigate(EMPTY_VEHICLE_IN_ROUTES.weighment(savedEntry.id));
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save empty vehicle gate-in'));
    }
  };

  if (gateInId && isExistingLoading) {
    return <EmptyState text="Loading empty vehicle entry..." />;
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(EMPTY_VEHICLE_IN_ROUTES.dashboard)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{headerTitle}</h2>
          <p className="text-muted-foreground">{headerSubtitle}</p>
        </div>
      </div>

      {isBstDocumentLocked && existingEntry && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          SAP BST selection is locked because BST Out entry {existingEntry.bst_gate_out_entry_no} has
          already been started.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <LogIn className="h-5 w-5" />
            Vehicle & Driver Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <VehicleSelect
              label="Vehicle Number"
              required
              value={vehicle?.vehicleNumber || ''}
              defaultDisplayText={vehicle?.vehicleNumber || ''}
              disabled={isEditing || isExpectedDispatchEntry}
              priorityVehicleIds={priorityVehicleIds}
              priorityVehicleMeta={priorityVehicleMeta}
              onChange={(selectedVehicle) => {
                setVehicle(selectedVehicle.vehicleId ? selectedVehicle : null);
                const expectedDispatch = expectedDispatchVehicles.find(
                  (expectedVehicle) => expectedVehicle.vehicleId === selectedVehicle.vehicleId,
                );
                if (expectedDispatch) applyExpectedDispatch(expectedDispatch);
                setFormError('');
              }}
              placeholder={
                isExpectedDispatchEntry ? 'Loading expected vehicle' : 'Select empty vehicle'
              }
            />

            <DriverSelect
              label="Driver"
              required
              value={driver?.driverName || ''}
              disabled={isEditing}
              onChange={(selectedDriver) => {
                setDriver(selectedDriver.driverId ? selectedDriver : null);
                setFormError('');
              }}
              placeholder="Select driver"
            />

            <div className="space-y-2">
              <Label htmlFor="empty-vehicle-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <NativeSelect
                id="empty-vehicle-reason"
                value={reason}
                onChange={(event) => {
                  const nextReason = event.target.value as EmptyVehicleGateInReasonValue;
                  setReason(nextReason);
                  if (nextReason !== 'BST') {
                    setSelectedDocEntry('');
                    setSelectedTransferSnapshot(null);
                    setActualQuantities({});
                    setSubmittedSearch('');
                  }
                  setFormError('');
                }}
                disabled={isReasonsLoading || isEditing || isExpectedDispatchEntry}
              >
                <SelectOption value="">Select reason</SelectOption>
                {reasons.map((reasonOption) => (
                  <SelectOption key={reasonOption.value} value={reasonOption.value}>
                    {reasonOption.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gate-in-date">
                  Gate In Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="gate-in-date"
                  type="date"
                  value={gateInDate}
                  readOnly
                  disabled
                  aria-readonly="true"
                  className={lockedInputClassName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="in-time">
                  In Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="in-time"
                  type="time"
                  value={inTime}
                  readOnly
                  disabled
                  aria-readonly="true"
                  className={lockedInputClassName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="security-name">Security Name</Label>
              <Input
                id="security-name"
                value={securityName}
                onChange={(event) => setSecurityName(event.target.value)}
                placeholder="Security staff name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {reason && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5" />
              Corresponding Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {isBstReason ? (
              <>
                <SearchableSelect<SAPStockTransfer>
                  inputId="empty-vehicle-sap-bst"
                  label="SAP BST"
                  required
                  value={selectedDocEntry}
                  defaultDisplayText={selectedTransferDisplay}
                  items={sapTransfers}
                  isLoading={isTransfersLoading}
                  isError={isTransfersError}
                  disabled={isBstDocumentLocked}
                  placeholder="Search SAP BST by doc number, item, or warehouse"
                  getItemKey={(transfer) => transfer.doc_entry}
                  getItemLabel={buildTransferLabel}
                  filterFn={showServerResults}
                  loadingText="Loading SAP BST documents..."
                  emptyText="Search SAP BST by doc number, item, or warehouse"
                  notFoundText="No SAP BST documents found"
                  errorText="Failed to load SAP BST documents"
                  onSearchChange={(value) => setSubmittedSearch(value.trim())}
                  onClear={() => {
                    setSelectedDocEntry('');
                    setSubmittedSearch('');
                    setSelectedTransferSnapshot(null);
                    setActualQuantities({});
                    setFormError('');
                  }}
                  onItemSelect={(transfer) => {
                    setSelectedDocEntry(String(transfer.doc_entry));
                    setSelectedTransferSnapshot(transfer);
                    setActualQuantities(buildLineQuantityMap(transfer));
                    setFormError('');
                  }}
                  renderItem={(transfer) => (
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">BST {transfer.doc_num}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[
                          transfer.doc_date,
                          `${transfer.from_warehouse || '-'} -> ${
                            transfer.to_warehouse || '-'
                          }`,
                          `${transfer.line_count} line${
                            transfer.line_count === 1 ? '' : 's'
                          }`,
                        ].filter(Boolean).join(' - ')}
                      </div>
                      {transfer.comments && (
                        <div className="truncate text-xs text-muted-foreground">
                          {transfer.comments}
                        </div>
                      )}
                    </div>
                  )}
                />

                {selectedDocEntry && (
                  <SelectedBSTCard
                    transfer={selectedTransferForDisplay}
                    isLoading={isTransferLoading && !selectedTransferSnapshot}
                    actualQuantities={actualQuantities}
                    disabled={isBstDocumentLocked}
                    onActualQuantityChange={(lineNum, value) => {
                      setActualQuantities((current) => ({
                        ...current,
                        [lineNum]: value,
                      }));
                      setFormError('');
                    }}
                  />
                )}
              </>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="document-reference">Document Reference</Label>
                  <Input
                    id="document-reference"
                    value={documentReference}
                    onChange={(event) => setDocumentReference(event.target.value)}
                    readOnly={isDispatchReason}
                    className={isDispatchReason ? lockedInputClassName : undefined}
                    placeholder="Invoice, delivery note, job card, or other reference"
                  />
                  {isDispatchReason && (
                    <p className="text-xs text-muted-foreground">
                      Auto-filled from the linked bills.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="document-notes">Document Notes</Label>
              <Textarea
                id="document-notes"
                value={documentNotes}
                onChange={(event) => setDocumentNotes(event.target.value)}
                disabled={isBstDocumentLocked}
                readOnly={isDispatchReason}
                className={isDispatchReason ? lockedInputClassName : undefined}
                placeholder="Optional document notes"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => navigate(EMPTY_VEHICLE_IN_ROUTES.dashboard)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving} className="w-full sm:w-auto">
          <ShieldCheck className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save and Next'}
        </Button>
      </div>
    </div>
  );
}

function SelectedBSTCard({
  transfer,
  isLoading,
  actualQuantities,
  disabled,
  onActualQuantityChange,
}: {
  transfer?: SAPStockTransfer | null;
  isLoading: boolean;
  actualQuantities: Record<number, string>;
  disabled: boolean;
  onActualQuantityChange: (lineNum: number, value: string) => void;
}) {
  if (isLoading) return <EmptyState text="Loading SAP BST details..." />;
  if (!transfer) return <EmptyState text="Select a SAP BST document" />;

  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex items-center gap-2 font-medium">
        <Truck className="h-4 w-4" />
        Selected SAP BST
      </div>
      <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <InfoItem label="Doc Num" value={transfer.doc_num} />
        <InfoItem label="Doc Date" value={transfer.doc_date || ''} />
        <InfoItem label="From" value={transfer.from_warehouse} />
        <InfoItem label="To" value={transfer.to_warehouse} />
        <InfoItem label="Lines" value={String(transfer.line_count || '-')} />
        <InfoItem label="Quantity" value={String(transfer.total_quantity || '-')} />
      </div>
      {transfer.lines && transfer.lines.length > 0 && (
        <div className="mt-4 max-h-56 overflow-auto rounded-md border">
          <table className="w-full min-w-[760px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left text-xs font-medium">Item</th>
                <th className="p-2 text-left text-xs font-medium">SAP Qty</th>
                <th className="p-2 text-left text-xs font-medium">Actual Qty</th>
                <th className="p-2 text-left text-xs font-medium">From</th>
                <th className="p-2 text-left text-xs font-medium">To</th>
              </tr>
            </thead>
            <tbody>
              {transfer.lines.map((line) => (
                <tr key={line.line_num} className="border-t">
                  <td className="p-2 text-xs">
                    <div className="font-medium">{line.item_code}</div>
                    <div className="text-muted-foreground">{line.item_name}</div>
                  </td>
                  <td className="whitespace-nowrap p-2 text-xs">
                    {line.quantity} {line.uom}
                  </td>
                  <td className="p-2 text-xs">
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={actualQuantities[line.line_num] ?? ''}
                      disabled={disabled}
                      onChange={(event) => onActualQuantityChange(line.line_num, event.target.value)}
                      className="h-9 min-w-28"
                      placeholder="0"
                    />
                  </td>
                  <td className="whitespace-nowrap p-2 text-xs">{line.from_warehouse}</td>
                  <td className="whitespace-nowrap p-2 text-xs">{line.to_warehouse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value || '-'}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-20 items-center justify-center rounded-md border text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <Badge variant="outline">{text}</Badge>
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}
