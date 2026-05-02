import { ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCreateRejectedQCReturn } from '@/modules/gate/api';
import { useReturnToVendorInspections } from '@/modules/qc/api/inspection/inspection.queries';
import type { InspectionListItem } from '@/modules/qc/types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

import {
  buildRejectedQCReturnEntryNo,
  clearRejectedQCReturnDraft,
  readRejectedQCReturnDraft,
  type RejectedQCReturnDraft,
  type RejectedQCReturnItem,
  writeRejectedQCReturnDraft,
  writeRejectedQCReturnEntry,
} from './rejectedQcReturn.storage';

type GateOutField =
  | 'challanNo'
  | 'ewayBillNo'
  | 'gateOutDate'
  | 'securityName'
  | 'outTime'
  | 'manualSapRef';

function RequiredMark() {
  return <span className="text-destructive">*</span>;
}

function makeReturnItem(item: InspectionListItem): RejectedQCReturnItem {
  return {
    id: String(item.inspection_id ?? item.arrival_slip_id),
    label: `${item.entry_no} - ${item.item_name} - ${item.party_name}`,
    entryNo: item.entry_no || '-',
    itemName: item.item_name || '-',
    partyName: item.party_name || '-',
    reportNo: item.report_no || '-',
    lotNo: item.internal_lot_no || '-',
    quantity: [item.billing_qty, item.billing_uom].filter(Boolean).join(' ') || '-',
  };
}

export default function RejectedQCReturnItemsPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<RejectedQCReturnDraft>(() => readRejectedQCReturnDraft());
  const [selectedItemId, setSelectedItemId] = useState('');
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const { data: returnToVendorInspections = [], isLoading } = useReturnToVendorInspections();
  const createRejectedQCReturn = useCreateRejectedQCReturn();

  const availableItems = useMemo(() => {
    const selectedIds = new Set(draft.items.map((item) => item.id));

    return returnToVendorInspections
      .map(makeReturnItem)
      .filter((item) => !selectedIds.has(item.id));
  }, [draft.items, returnToVendorInspections]);

  const updateDraftField = (field: GateOutField, value: string) => {
    setDraft((current) => {
      const nextDraft = { ...current, [field]: value };
      writeRejectedQCReturnDraft(nextDraft);
      return nextDraft;
    });

    if (apiErrors[field]) {
      setApiErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  };

  const handleAddItem = () => {
    const item = availableItems.find((option) => option.id === selectedItemId);
    if (!item) return;

    setDraft((current) => {
      const nextDraft = {
        ...current,
        items: [...current.items, item],
      };
      writeRejectedQCReturnDraft(nextDraft);
      return nextDraft;
    });
    if (apiErrors.items) {
      setApiErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors.items;
        return nextErrors;
      });
    }
    setSelectedItemId('');
  };

  const handleRemoveItem = (itemId: string) => {
    setDraft((current) => {
      const nextDraft = {
        ...current,
        items: current.items.filter((item) => item.id !== itemId),
      };
      writeRejectedQCReturnDraft(nextDraft);
      return nextDraft;
    });
  };

  const handleComplete = async () => {
    const errors: Record<string, string> = {};

    if (!draft.vehicleId) errors.general = 'Please complete vehicle details first';
    if (!draft.driverId) errors.general = 'Please complete driver details first';
    if (!draft.gateOutDate) errors.gateOutDate = 'Please select gate out date';
    if (draft.items.length === 0) errors.items = 'Please add at least one return item';

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    const { items, ...vehicle } = draft;
    const now = new Date().toISOString();

    try {
      const savedEntry = await createRejectedQCReturn.mutateAsync({
        vehicle_id: draft.vehicleId,
        driver_id: draft.driverId,
        gate_out_date: draft.gateOutDate,
        out_time: draft.outTime || null,
        challan_no: draft.challanNo,
        eway_bill_no: draft.ewayBillNo,
        manual_sap_reference: draft.manualSapRef,
        security_name: draft.securityName,
        remarks: draft.remarks,
        inspection_ids: items.map((item) => Number(item.id)),
      });

    writeRejectedQCReturnEntry({
      id: String(savedEntry.id),
      entryNo: savedEntry.entry_no || buildRejectedQCReturnEntryNo(),
      status: 'COMPLETED',
      vehicle,
      items,
      values: {
        ...vehicle,
        rejectedQcInspection: items.map((item) => item.id).join(', '),
        rejectedQcLabels: items.map((item) => item.label).join(', '),
        returnAction: 'Return to Vendor',
      },
      createdAt: now,
      updatedAt: now,
    });
    clearRejectedQCReturnDraft();
    navigate('/gate/rejected-qc-return');
    } catch (error) {
      const detail =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { detail?: string } }).data?.detail
          : undefined;
      setApiErrors({
        general: detail || 'Could not save rejected QC return entry',
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => navigate('/gate/rejected-qc-return/new')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Vehicle Details
          </Button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Return Items</h2>
            <p className="text-sm text-muted-foreground">
              Step 2 of 2: choose QC rejected items going back in this vehicle
            </p>
          </div>
        </div>

        <Button
          onClick={handleComplete}
          disabled={draft.items.length === 0 || !draft.gateOutDate || createRejectedQCReturn.isPending}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Complete Entry
        </Button>
      </div>

      {apiErrors.general && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {apiErrors.general}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Gate Out Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rqc-gate-out-date">
              Gate Out Date <RequiredMark />
            </Label>
            <Input
              id="rqc-gate-out-date"
              type="date"
              value={draft.gateOutDate}
              onChange={(event) => updateDraftField('gateOutDate', event.target.value)}
              className={apiErrors.gateOutDate ? 'border-destructive' : undefined}
            />
            {apiErrors.gateOutDate && (
              <p className="text-sm text-destructive">{apiErrors.gateOutDate}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rqc-out-time">Out Time</Label>
            <Input
              id="rqc-out-time"
              placeholder="HH:MM"
              value={draft.outTime}
              onChange={(event) => updateDraftField('outTime', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rqc-challan-no">Challan No.</Label>
            <Input
              id="rqc-challan-no"
              value={draft.challanNo}
              onChange={(event) => updateDraftField('challanNo', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rqc-eway-bill-no">E-way Bill No.</Label>
            <Input
              id="rqc-eway-bill-no"
              value={draft.ewayBillNo}
              onChange={(event) => updateDraftField('ewayBillNo', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rqc-manual-sap-ref">Manual SAP Reference</Label>
            <Input
              id="rqc-manual-sap-ref"
              value={draft.manualSapRef}
              onChange={(event) => updateDraftField('manualSapRef', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rqc-security-name">Security Name</Label>
            <Input
              id="rqc-security-name"
              value={draft.securityName}
              onChange={(event) => updateDraftField('securityName', event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Return Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rqc-return-item">
              Return QC Item <RequiredMark />
            </Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <NativeSelect
                id="rqc-return-item"
                value={selectedItemId}
                placeholder={
                  isLoading
                    ? 'Loading rejected QC items'
                    : availableItems.length > 0
                      ? 'Select rejected QC item'
                      : 'No more Return to Vendor items'
                }
                onChange={(event) => setSelectedItemId(event.target.value)}
                className="h-10"
              >
                {availableItems.map((item) => (
                  <SelectOption key={item.id} value={item.id}>
                    {item.label}
                  </SelectOption>
                ))}
              </NativeSelect>
              <Button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedItemId}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
            {apiErrors.items && <p className="text-sm text-destructive">{apiErrors.items}</p>}
          </div>

          <div className="overflow-hidden rounded-md border">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[780px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">
                      Gate Entry No. <RequiredMark />
                    </th>
                    <th className="p-3 text-left text-sm font-medium">
                      Item <RequiredMark />
                    </th>
                    <th className="p-3 text-left text-sm font-medium">
                      Supplier <RequiredMark />
                    </th>
                    <th className="p-3 text-left text-sm font-medium">Report No.</th>
                    <th className="p-3 text-left text-sm font-medium">Lot No.</th>
                    <th className="p-3 text-left text-sm font-medium">
                      Qty <RequiredMark />
                    </th>
                    <th className="w-10 p-3" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {draft.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="h-20 p-3 text-center text-sm text-muted-foreground"
                      >
                        No items selected
                      </td>
                    </tr>
                  ) : (
                    draft.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="whitespace-nowrap p-3 text-sm font-medium">
                          {item.entryNo}
                        </td>
                        <td className="p-3 text-sm">{item.itemName}</td>
                        <td className="p-3 text-sm">{item.partyName}</td>
                        <td className="whitespace-nowrap p-3 text-sm">{item.reportNo}</td>
                        <td className="whitespace-nowrap p-3 text-sm">{item.lotNo}</td>
                        <td className="whitespace-nowrap p-3 text-sm">{item.quantity}</td>
                        <td className="p-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            aria-label={`Remove ${item.itemName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
