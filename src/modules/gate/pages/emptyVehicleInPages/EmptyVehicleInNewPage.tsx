import { ArrowLeft, ArrowRight, FileText, LogIn, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useGlobalDateRange } from '@/core/store/hooks';
import { useDispatchBills } from '@/modules/dashboards/dispatch-plans/api';
import {
  type EmptyVehicleGateInReasonValue,
  useCreateEmptyVehicleGateIn,
  useEmptyVehicleGateIn,
  useEmptyVehicleGateInEntries,
  useEmptyVehicleGateInReasons,
  useUpdateEmptyVehicleGateIn,
} from '@/modules/gate/api';
import { useVehicleById } from '@/modules/gate/api/vehicle/vehicle.queries';
import {
  DriverSelect,
  type DriverSelection,
  VehicleSelect,
  type VehicleSelection,
} from '@/modules/gate/components';
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
  const [documentReference, setDocumentReference] = useState('');
  const [documentNotes, setDocumentNotes] = useState('');
  const [gateInDate, setGateInDate] = useState(() => toDateInputValue());
  const [inTime, setInTime] = useState(() => toTimeInputValue());
  const [securityName, setSecurityName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');
  // DISPATCH reference/notes are auto-derived from the linked bills and not stored,
  // so they are shown read-only rather than as editable inputs.
  const isDispatchReason = reason === 'DISPATCH';

  const { data: reasons = [], isLoading: isReasonsLoading } = useEmptyVehicleGateInReasons();
  const { data: existingEntry, isLoading: isExistingLoading } = useEmptyVehicleGateIn(gateInId);
  const {
    // Cross-company: a truck already inside under a sibling company must still flag
    // "already inside" here, so match the dashboard and pass all_companies.
    data: activeDispatchEntries = [],
  } = useEmptyVehicleGateInEntries({ reason: 'DISPATCH', inside_only: true, all_companies: 1 });
  const { data: expectedVehicleDetails } = useVehicleById(
    expectedVehicleId,
    isExpectedDispatchEntry && Boolean(expectedVehicleId),
  );
  const { data: expectedDispatchResponse } = useDispatchBills({
    date_from: dateRange.from,
    date_to: dateRange.to,
    booking_status: 'BOOKED',
    all_companies: true,
    limit: 200,
  });
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
  }, []);

  useEffect(() => {
    if (!existingEntry) return;

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

  const isEditing = Boolean(gateInId);
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
        // Step 1 is re-entered with an already-saved entry; only persist (and
        // toast) when a step-1 field actually changed, so clicking "Save and Next"
        // through doesn't fire a redundant update. For DISPATCH the reference/notes
        // are read-only/derived, so only security/remarks can change.
        const stepOneUnchanged =
          securityName === (existingEntry.security_name ?? '') &&
          remarks === (existingEntry.remarks ?? '') &&
          (isDispatchReason ||
            (documentReference === (existingEntry.document_reference ?? '') &&
              documentNotes === (existingEntry.document_notes ?? '')));
        if (stepOneUnchanged) {
          navigate(EMPTY_VEHICLE_IN_ROUTES.weighment(existingEntry.id));
          return;
        }
        await updateEmptyGateIn.mutateAsync({
          id: existingEntry.id,
          data: {
            document_reference: documentReference,
            document_notes: documentNotes,
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
                  setReason(event.target.value as EmptyVehicleGateInReasonValue);
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

            <div className="space-y-2">
              <Label htmlFor="document-notes">Document Notes</Label>
              <Textarea
                id="document-notes"
                value={documentNotes}
                onChange={(event) => setDocumentNotes(event.target.value)}
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
