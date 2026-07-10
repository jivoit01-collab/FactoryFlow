import { AlertTriangle, ArrowLeft, LogOut, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type EmptyVehicleEligibleEntry,
  useEmptyVehicleEligibleEntries,
} from '@/modules/gate/api';
import { GateStatusBadge } from '@/modules/gate/components';
import { SearchableSelect } from '@/shared/components';
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

import {
  buildEmptyOutSideEffectMessage,
  writeEmptyVehicleOutDraft,
} from './emptyVehicleOutDraft.storage';

const ENTRY_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: 'Raw Material',
  DAILY_NEED: 'Daily Need',
  MAINTENANCE: 'Maintenance',
  CONSTRUCTION: 'Construction',
  EMPTY_VEHICLE: 'Empty Vehicle',
  BST_IN: 'BST In',
  BST_RETURN: 'BST Return',
  JOB_WORK: 'Job Work',
};

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

function formatEntryTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatEntryType(value?: string | null) {
  if (!value) return '-';
  return ENTRY_TYPE_LABELS[value] || value.replaceAll('_', ' ');
}

function buildVehicleLabel(entry: EmptyVehicleEligibleEntry) {
  return [
    entry.vehicle_number,
    entry.entry_no,
    formatEntryType(entry.entry_type),
    entry.driver_name,
  ].filter(Boolean).join(' - ');
}

function vehicleFilter(entry: EmptyVehicleEligibleEntry, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return [
    entry.entry_no,
    entry.entry_type,
    formatEntryType(entry.entry_type),
    entry.vehicle_number,
    entry.vehicle_type,
    entry.driver_name,
    entry.driver_mobile,
    entry.status,
  ].some((value) => String(value || '').toLowerCase().includes(query));
}

const lockedDateTimeInputClassName =
  'bg-muted/40 text-foreground disabled:cursor-not-allowed disabled:opacity-100';

export default function EmptyVehicleOutNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectEntryId = searchParams.get('entry');
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [selectedEntrySnapshot, setSelectedEntrySnapshot] =
    useState<EmptyVehicleEligibleEntry | null>(null);
  const [gateOutDate] = useState(() => toDateInputValue());
  const [outTime] = useState(() => toTimeInputValue());
  const [securityName, setSecurityName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  const {
    data: eligibleEntries = [],
    isLoading: isEligibleLoading,
    isError: isEligibleError,
    refetch,
  } = useEmptyVehicleEligibleEntries({ all_companies: 1 });
  const selectedEntry = useMemo(
    () =>
      selectedEntrySnapshot ||
      eligibleEntries.find((entry) => String(entry.id) === selectedEntryId),
    [eligibleEntries, selectedEntryId, selectedEntrySnapshot],
  );
  // Preselect a vehicle handed over from the Inside Vehicle Manager (?entry=<id>).
  useEffect(() => {
    if (!preselectEntryId || selectedEntryId) return;
    const match = eligibleEntries.find((entry) => String(entry.id) === preselectEntryId);
    if (match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Seeding the preselected vehicle handed over from the Inside Vehicle Manager matches the gate step pattern.
      setSelectedEntryId(String(match.id));
      setSelectedEntrySnapshot(match);
    }
  }, [preselectEntryId, eligibleEntries, selectedEntryId]);

  const sideEffectMessage = selectedEntry
    ? buildEmptyOutSideEffectMessage(
        selectedEntry.release_invoice_count,
        selectedEntry.release_cancels_docking,
      )
    : null;

  const handleSubmit = async () => {
    if (!selectedEntry) {
      setFormError('Please select an inward vehicle entry');
      return;
    }

    if (!gateOutDate) {
      setFormError('Gate out date is required');
      return;
    }

    if (!outTime) {
      setFormError('Out time is required');
      return;
    }

    setFormError('');

    writeEmptyVehicleOutDraft({
      vehicleEntryId: selectedEntry.id,
      vehicleEntryNo: selectedEntry.entry_no,
      vehicleEntryType: selectedEntry.entry_type,
      vehicleNumber: selectedEntry.vehicle_number,
      vehicleType: selectedEntry.vehicle_type || '',
      driverName: selectedEntry.driver_name,
      driverMobile: selectedEntry.driver_mobile,
      gateOutDate,
      outTime,
      securityName,
      remarks,
      releaseInvoiceCount: selectedEntry.release_invoice_count,
      releaseCancelsDocking: selectedEntry.release_cancels_docking,
    });

    toast.success('Vehicle details saved');
    navigate('/gate/empty-vehicle-out/new/weighment');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/empty-vehicle-out')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">New Empty Vehicle Out</h2>
            <p className="text-muted-foreground">
              Select an inward vehicle and record the empty gate-out
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <LogOut className="h-5 w-5" />
            Vehicle Exit Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <SearchableSelect<EmptyVehicleEligibleEntry>
                inputId="empty-vehicle-out-entry"
                label="Inward Vehicle Entry"
                required
                value={selectedEntryId}
                defaultDisplayText={selectedEntry ? buildVehicleLabel(selectedEntry) : ''}
                items={eligibleEntries}
                isLoading={isEligibleLoading}
                isError={isEligibleError}
                placeholder="Search by entry, vehicle, driver, or type"
                getItemKey={(entry) => entry.id}
                getItemLabel={buildVehicleLabel}
                filterFn={vehicleFilter}
                loadingText="Loading eligible vehicles..."
                emptyText="Search eligible inward vehicles"
                notFoundText="No eligible vehicles found"
                errorText="Failed to load eligible vehicles"
                onClear={() => {
                  setSelectedEntryId('');
                  setSelectedEntrySnapshot(null);
                  setFormError('');
                }}
                onItemSelect={(entry) => {
                  setSelectedEntryId(String(entry.id));
                  setSelectedEntrySnapshot(entry);
                  setFormError('');
                }}
                renderItem={(entry) => (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {entry.vehicle_number} - {entry.entry_no}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[
                        entry.company_name,
                        formatEntryType(entry.entry_type),
                        entry.driver_name,
                        formatEntryTime(entry.entry_time),
                      ].filter(Boolean).join(' - ')}
                    </div>
                  </div>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gate-out-date">
                  Gate Out Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="gate-out-date"
                  type="date"
                  value={gateOutDate}
                  readOnly
                  disabled
                  aria-readonly="true"
                  className={lockedDateTimeInputClassName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="out-time">
                  Out Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="out-time"
                  type="time"
                  value={outTime}
                  readOnly
                  disabled
                  aria-readonly="true"
                  className={lockedDateTimeInputClassName}
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

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>

          {selectedEntry && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" />
                  Selected Inward Vehicle
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <InfoItem label="Entry No." value={selectedEntry.entry_no} />
                <InfoItem label="Company" value={selectedEntry.company_name || ''} />
                <InfoItem label="Entry Type" value={formatEntryType(selectedEntry.entry_type)} />
                <InfoItem label="Vehicle" value={selectedEntry.vehicle_number} />
                <InfoItem label="Vehicle Type" value={selectedEntry.vehicle_type || ''} />
                <InfoItem label="Driver" value={selectedEntry.driver_name} />
                <InfoItem label="Mobile" value={selectedEntry.driver_mobile} />
                <InfoItem label="In Time" value={formatEntryTime(selectedEntry.entry_time)} />
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <GateStatusBadge status={selectedEntry.status} className="mt-1" />
                </div>
              </CardContent>
            </Card>
          )}

          {selectedEntry?.arrival_no && (
            <div className="flex items-start gap-3 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
              <Truck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This truck arrived under multiple companies (arrival{' '}
                {selectedEntry.arrival_no}). Marking it out empty will also mark
                out and release the sibling companies&apos; entries for the same
                physical trip.
              </span>
            </div>
          )}

          {sideEffectMessage && (
            <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{sideEffectMessage}</span>
            </div>
          )}

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => navigate('/gate/empty-vehicle-out')}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="w-full sm:w-auto"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Continue to Weighment
            </Button>
          </div>
        </CardContent>
      </Card>
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
