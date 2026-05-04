import {
  CheckCircle2,
  Clock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useGlobalDateRange } from '@/core/store/hooks';
import {
  type EmptyVehicleEligibleEntry,
  useCreateEmptyVehicleGateOut,
  useEmptyVehicleEligibleEntries,
  useEmptyVehicleGateOutEntries,
} from '@/modules/gate/api';
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

import { DateRangePicker } from '../../components/DateRangePicker';

const ENTRY_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: 'Raw Material',
  DAILY_NEED: 'Daily Need',
  MAINTENANCE: 'Maintenance',
  CONSTRUCTION: 'Construction',
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

function formatDateTime(value?: string) {
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

function formatEntryType(value?: string) {
  if (!value) return '-';
  return ENTRY_TYPE_LABELS[value] || value.replaceAll('_', ' ');
}

function buildVehicleOption(entry: EmptyVehicleEligibleEntry) {
  return [
    entry.vehicle_number,
    entry.entry_no,
    formatEntryType(entry.entry_type),
    entry.driver_name,
  ].join(' - ');
}

export default function EmptyVehicleOutPage() {
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [gateOutDate, setGateOutDate] = useState(() => toDateInputValue());
  const [outTime, setOutTime] = useState(() => toTimeInputValue());
  const [securityName, setSecurityName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  const queryParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
    }),
    [dateRange.from, dateRange.to],
  );

  const {
    data: eligibleEntries = [],
    isLoading: isEligibleLoading,
    refetch: refetchEligible,
  } = useEmptyVehicleEligibleEntries(queryParams);
  const {
    data: completedEntries = [],
    isLoading: isCompletedLoading,
    refetch: refetchCompleted,
  } = useEmptyVehicleGateOutEntries(queryParams);
  const createEmptyGateOut = useCreateEmptyVehicleGateOut();

  const selectedEntry = useMemo(
    () => eligibleEntries.find((entry) => String(entry.id) === selectedEntryId),
    [eligibleEntries, selectedEntryId],
  );

  const handleSubmit = async () => {
    if (!selectedEntry) {
      setFormError('Please select a vehicle entry');
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

    await createEmptyGateOut.mutateAsync({
      vehicle_entry_id: selectedEntry.id,
      gate_out_date: gateOutDate,
      out_time: outTime,
      security_name: securityName,
      remarks,
    });

    toast.success('Vehicle marked out empty');
    setSelectedEntryId('');
    setGateOutDate(toDateInputValue());
    setOutTime(toTimeInputValue());
    setSecurityName('');
    setRemarks('');
  };

  const handleRefresh = () => {
    refetchEligible();
    refetchCompleted();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Empty Vehicle Out</h2>
          <p className="text-muted-foreground">
            Mark inward vehicles out when they leave without outbound goods
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(date) => {
              if (date && 'from' in date) {
                setDateRange(date);
              } else {
                setDateRange(undefined);
              }
            }}
          />
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Truck className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{eligibleEntries.length}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Awaiting Out</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{completedEntries.length}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Marked Out</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <LogOut className="h-5 w-5" />
            Mark Vehicle Out
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="vehicle-entry">
                Vehicle Entry <span className="text-destructive">*</span>
              </Label>
              <NativeSelect
                id="vehicle-entry"
                value={selectedEntryId}
                onChange={(event) => {
                  setSelectedEntryId(event.target.value);
                  setFormError('');
                }}
                disabled={isEligibleLoading}
              >
                <SelectOption value="">Select inward vehicle</SelectOption>
                {eligibleEntries.map((entry) => (
                  <SelectOption key={entry.id} value={String(entry.id)}>
                    {buildVehicleOption(entry)}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gate-out-date">
                Gate Out Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gate-out-date"
                type="date"
                value={gateOutDate}
                onChange={(event) => setGateOutDate(event.target.value)}
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
                onChange={(event) => setOutTime(event.target.value)}
              />
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

          {selectedEntry && (
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <InfoItem label="Entry No." value={selectedEntry.entry_no} />
                <InfoItem label="Entry Type" value={formatEntryType(selectedEntry.entry_type)} />
                <InfoItem label="Vehicle" value={selectedEntry.vehicle_number} />
                <InfoItem label="Driver" value={selectedEntry.driver_name} />
                <InfoItem label="Mobile" value={selectedEntry.driver_mobile} />
                <InfoItem label="In Time" value={formatDateTime(selectedEntry.entry_time)} />
                <InfoItem label="Status" value={selectedEntry.status} />
              </div>
            </div>
          )}

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={createEmptyGateOut.isPending}
              className="w-full sm:w-auto"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              {createEmptyGateOut.isPending ? 'Saving...' : 'Mark Out'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Truck className="h-4 w-4" />
            Eligible Vehicles
          </h3>
          {isEligibleLoading ? (
            <EmptyState text="Loading eligible vehicles..." />
          ) : eligibleEntries.length === 0 ? (
            <EmptyState text="No inward vehicles are pending empty gate out" />
          ) : (
            <div className="overflow-hidden rounded-md border">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">Entry No.</th>
                      <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                      <th className="p-3 text-left text-sm font-medium">Driver</th>
                      <th className="p-3 text-left text-sm font-medium">Type</th>
                      <th className="p-3 text-left text-sm font-medium">In Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                        onClick={() => setSelectedEntryId(String(entry.id))}
                      >
                        <td className="whitespace-nowrap p-3 text-sm font-medium">
                          {entry.entry_no}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {entry.vehicle_number}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {entry.driver_name}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          <Badge variant="outline">{formatEntryType(entry.entry_type)}</Badge>
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm text-muted-foreground">
                          {formatDateTime(entry.entry_time)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Completed Empty Outs
          </h3>
          {isCompletedLoading ? (
            <EmptyState text="Loading completed exits..." />
          ) : completedEntries.length === 0 ? (
            <EmptyState text="No empty vehicle exits in this date range" />
          ) : (
            <div className="overflow-hidden rounded-md border">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[780px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">Out Entry</th>
                      <th className="p-3 text-left text-sm font-medium">In Entry</th>
                      <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                      <th className="p-3 text-left text-sm font-medium">Out Date</th>
                      <th className="p-3 text-left text-sm font-medium">Out Time</th>
                      <th className="p-3 text-left text-sm font-medium">Security</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedEntries.map((entry) => (
                      <tr key={entry.id} className="border-t">
                        <td className="whitespace-nowrap p-3 text-sm font-medium">
                          {entry.entry_no}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {entry.vehicle_entry_no}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {entry.vehicle_number}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {entry.gate_out_date}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {entry.out_time}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm text-muted-foreground">
                          {entry.security_name || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
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
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
