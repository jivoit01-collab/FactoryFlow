import { CheckCircle2, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { useRejectedQCReturnEntries } from '@/modules/gate/api';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { DateRangePicker } from '../../components/DateRangePicker';
import {
  readRejectedQCReturnEntries,
  type RejectedQCReturnEntry,
} from './rejectedQcReturn.storage';

function formatDateTime(dateTime?: string) {
  if (!dateTime) return '-';

  try {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTime;
  }
}

function formatDate(date?: string | boolean) {
  if (!date || typeof date === 'boolean') return '-';

  try {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

function getValue(entry: RejectedQCReturnEntry, key: string): string {
  const value = entry.values[key];
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value || '-';
}

function getItemsSummary(
  entry: RejectedQCReturnEntry,
  rejectedQcLabels: Record<string, string>,
): string {
  if (entry.items?.length) {
    return entry.items.map((item) => item.label).join(', ');
  }

  const savedLabels = getValue(entry, 'rejectedQcLabels');
  if (savedLabels !== '-') return savedLabels;

  const rejectedQcId = getValue(entry, 'rejectedQcInspection');
  return rejectedQcLabels[rejectedQcId] || rejectedQcId;
}

function getItemsCount(entry: RejectedQCReturnEntry): number {
  if (entry.items?.length) return entry.items.length;
  return getValue(entry, 'rejectedQcInspection') !== '-' ? 1 : 0;
}

export default function RejectedQCReturnDashboardPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [localEntries] = useState<RejectedQCReturnEntry[]>(() => readRejectedQCReturnEntries());
  const { data: backendEntries = [] } = useRejectedQCReturnEntries();

  const entries = useMemo<RejectedQCReturnEntry[]>(() => {
    if (backendEntries.length === 0) return localEntries;

    return backendEntries.map((entry) => ({
      id: String(entry.id),
      entryNo: entry.entry_no,
      status: 'COMPLETED',
      vehicle: {
        vehicleId: entry.vehicle,
        vehicleNo: entry.vehicle_number,
        vehicleType: '',
        transporterId: 0,
        transporterName: '',
        transporterContactPerson: '',
        transporterMobile: '',
        vehicleCapacity: '',
        gpsId: '',
        driverId: entry.driver,
        driverName: entry.driver_name,
        mobileNumber: '',
        drivingLicenseNumber: '',
        idProofType: '',
        idProofNumber: '',
        driverPhoto: null,
        challanNo: '',
        ewayBillNo: '',
        gateOutDate: entry.gate_out_date,
        securityName: '',
        outTime: '',
        manualSapRef: '',
        remarks: entry.remarks || '',
      },
      items: (entry.items || []).map((item) => ({
        id: String(item.inspection_id),
        label: `${item.gate_entry_no} - ${item.item_name} - ${item.supplier_name}`,
        entryNo: item.gate_entry_no,
        itemName: item.item_name,
        partyName: item.supplier_name,
        reportNo: item.report_no,
        lotNo: item.internal_lot_no,
        quantity: [item.quantity, item.uom].filter(Boolean).join(' '),
      })),
      values: {
        vehicleNo: entry.vehicle_number,
        gateOutDate: entry.gate_out_date,
        returnAction: 'Return to Vendor',
        remarks: entry.remarks || '',
      },
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    }));
  }, [backendEntries, localEntries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const gateOutDate = getValue(entry, 'gateOutDate');
      const comparableDate = gateOutDate !== '-' ? gateOutDate : entry.createdAt;
      const entryDate = comparableDate.slice(0, 10);

      if (dateRange.from && entryDate < dateRange.from) return false;
      if (dateRange.to && entryDate > dateRange.to) return false;
      return true;
    });
  }, [dateRange, entries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rejected QC Return</h2>
          <p className="text-muted-foreground">
            Completed gate-out returns for QC rejected material
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
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
          <Button
            onClick={() => navigate('/gate/rejected-qc-return/new')}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Entry
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Status Overview</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {filteredEntries.length}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                Completed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Completed Entries</h3>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
            No completed rejected QC returns yet
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Entry No.</th>
                    <th className="p-3 text-left text-sm font-medium">Items Returning</th>
                    <th className="p-3 text-left text-sm font-medium">Item Count</th>
                    <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                    <th className="p-3 text-left text-sm font-medium">Gate Out Date</th>
                    <th className="p-3 text-left text-sm font-medium">Action</th>
                    <th className="p-3 text-left text-sm font-medium">Completed At</th>
                    <th className="p-3 text-left text-sm font-medium">Remarks</th>
                    <th className="w-8 p-3" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    return (
                      <tr
                        key={entry.id}
                        className="border-t transition-colors hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap p-3 text-sm font-medium">
                          {entry.entryNo}
                        </td>
                        <td className="p-3 text-sm">
                          {getItemsSummary(entry, {})}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {getItemsCount(entry)}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {getValue(entry, 'vehicleNo')}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm text-muted-foreground">
                          {formatDate(entry.values.gateOutDate)}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            {getValue(entry, 'returnAction')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {getValue(entry, 'remarks')}
                        </td>
                        <td className="p-3 text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
