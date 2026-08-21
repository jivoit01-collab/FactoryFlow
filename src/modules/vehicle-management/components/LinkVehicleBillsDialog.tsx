import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import type { VehicleName } from '@/modules/gate/api/vehicle/vehicle.api';
import { useVehicleNames } from '@/modules/gate/api/vehicle/vehicle.queries';
import { CreateVehicleDialog } from '@/modules/gate/components';
import { SearchableSelect } from '@/shared/components';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

/** The truck a dialog in `add` mode is filling — already chosen, so not editable. */
export interface LinkDialogVehicle {
  id: number;
  number: string;
}

export interface LinkVehicleBillsSelection {
  vehicleId: number;
  vehicleNumber: string;
  bills: DispatchBill[];
}

interface LinkVehicleBillsDialogProps {
  open: boolean;
  /** `new` asks for the vehicle too; `add` fills bills onto a known truck. */
  mode: 'new' | 'add';
  vehicle?: LinkDialogVehicle | null;
  /** Candidate bills — unlinked, across every company the user belongs to. */
  bills: DispatchBill[];
  isLoading: boolean;
  isError: boolean;
  /** Reported upward so the parent can look a bill up by number past the feed. */
  onSearchChange?: (term: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selection: LinkVehicleBillsSelection) => void;
}

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

function formatNumber(value: number, fractionDigits = 2) {
  return value.toLocaleString('en-IN', { maximumFractionDigits: fractionDigits });
}

function billLabel(bill: DispatchBill) {
  return [bill.doc_num, bill.card_name].filter(Boolean).join(' - ');
}

/**
 * Ask for a vehicle and the bills it will carry — the entry point of the
 * vehicle-based Vehicle Linking page. One bill row to start, and a row added per
 * extra bill, because a truck's load is built up bill by bill. Bills come from
 * every company the user belongs to; the caller links each company separately.
 */
export function LinkVehicleBillsDialog({
  open,
  mode,
  vehicle = null,
  bills,
  isLoading,
  isError,
  onSearchChange,
  onOpenChange,
  onConfirm,
}: LinkVehicleBillsDialogProps) {
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  // One entry per bill field on screen; null while that field is still empty.
  const [rows, setRows] = useState<Array<number | null>>([null]);

  const { data: vehicleNames = [], isLoading: vehiclesLoading } = useVehicleNames(
    open && mode === 'new',
  );

  useEffect(() => {
    if (open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the form once it closes.
    setVehicleId(null);
    setVehicleNumber('');
    setRows([null]);
  }, [open]);

  const billsByDocEntry = useMemo(() => {
    const map = new Map<number, DispatchBill>();
    for (const bill of bills) map.set(bill.doc_entry, bill);
    return map;
  }, [bills]);

  const chosenBills = useMemo(
    () =>
      rows
        .map((docEntry) => (docEntry === null ? null : billsByDocEntry.get(docEntry) ?? null))
        .filter((bill): bill is DispatchBill => bill !== null),
    [billsByDocEntry, rows],
  );
  const totals = useMemo(
    () => ({
      litres: chosenBills.reduce((sum, bill) => sum + (bill.total_litres || 0), 0),
      weight: chosenBills.reduce((sum, bill) => sum + (bill.total_weight || 0), 0),
      amount: chosenBills.reduce((sum, bill) => sum + (bill.doc_total || 0), 0),
    }),
    [chosenBills],
  );
  const companyCodes = useMemo(
    () =>
      Array.from(
        new Set(chosenBills.map((bill) => bill.company_code).filter((code): code is string => !!code)),
      ),
    [chosenBills],
  );

  const effectiveVehicleId = mode === 'add' ? vehicle?.id ?? null : vehicleId;
  const effectiveVehicleNumber = mode === 'add' ? vehicle?.number ?? '' : vehicleNumber;
  const canConfirm = effectiveVehicleId !== null && chosenBills.length > 0;

  function setRow(index: number, docEntry: number | null) {
    setRows((current) => current.map((value, i) => (i === index ? docEntry : value)));
  }

  function addRow() {
    setRows((current) => [...current, null]);
  }

  function removeRow(index: number) {
    setRows((current) => (current.length === 1 ? [null] : current.filter((_, i) => i !== index)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add bills to this vehicle' : 'Link a new vehicle'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? `Pick the bills to add to ${compactText(vehicle?.number)}.`
              : 'Pick the vehicle and the bills it will carry, then fill in its transport details.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'add' ? (
            <div className="space-y-1.5">
              <Label htmlFor="link-vehicle-number-locked">Vehicle No.</Label>
              <Input
                id="link-vehicle-number-locked"
                value={compactText(vehicle?.number, '')}
                readOnly
                disabled
              />
            </div>
          ) : (
            <SearchableSelect<VehicleName>
              inputId="link-vehicle-number"
              label="Vehicle No."
              required
              value={vehicleId !== null ? String(vehicleId) : ''}
              defaultDisplayText={vehicleNumber}
              items={vehicleNames}
              isLoading={vehiclesLoading}
              placeholder="Search a vehicle by registration number"
              getItemKey={(item) => item.id}
              getItemLabel={(item) => item.vehicle_number}
              loadingText="Loading vehicles..."
              emptyText="No vehicles available"
              notFoundText="No vehicles found"
              addNewLabel="Add New Vehicle"
              onItemSelect={(item) => {
                setVehicleId(item.id);
                setVehicleNumber(item.vehicle_number);
              }}
              onClear={() => {
                setVehicleId(null);
                setVehicleNumber('');
              }}
              renderCreateDialog={(createOpen, onCreateOpenChange, updateSelection) => (
                <CreateVehicleDialog
                  open={createOpen}
                  onOpenChange={onCreateOpenChange}
                  onSuccess={(created) => {
                    updateSelection(created.id, created.vehicle_number);
                    setVehicleId(created.id);
                    setVehicleNumber(created.vehicle_number);
                  }}
                />
              )}
            />
          )}

          <div className="space-y-3">
            {rows.map((docEntry, index) => {
              // A bill already chosen in another row is off the menu here.
              const takenElsewhere = new Set(
                rows.filter((_, i) => i !== index).filter((value): value is number => value !== null),
              );
              const rowItems = bills.filter((bill) => !takenElsewhere.has(bill.doc_entry));
              const selected = docEntry === null ? null : billsByDocEntry.get(docEntry) ?? null;

              return (
                <div key={index} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <SearchableSelect<DispatchBill>
                      inputId={`link-vehicle-bill-${index}`}
                      label={index === 0 ? 'Bills' : undefined}
                      value={docEntry !== null ? String(docEntry) : ''}
                      defaultDisplayText={selected ? billLabel(selected) : ''}
                      items={rowItems}
                      isLoading={isLoading}
                      isError={isError}
                      placeholder="Search a bill by number or customer"
                      getItemKey={(bill) => bill.doc_entry}
                      getItemLabel={billLabel}
                      filterFn={(bill, search) =>
                        [bill.doc_num, bill.card_name, bill.city, bill.state].some((value) =>
                          String(value || '')
                            .toLowerCase()
                            .includes(search.trim().toLowerCase()),
                        )
                      }
                      onSearchChange={onSearchChange}
                      loadingText="Loading bills..."
                      emptyText="Search a bill to add"
                      notFoundText="No unlinked bill found — type a full bill number"
                      errorText="Failed to load bills"
                      onItemSelect={(bill) => setRow(index, bill.doc_entry)}
                      onClear={() => setRow(index, null)}
                      renderItem={(bill) => (
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {bill.doc_num} - {compactText(bill.card_name)}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {compactText(bill.city)} {compactText(bill.state)} ·{' '}
                            {formatNumber(bill.total_weight, 3)} kg ·{' '}
                            {compactText(bill.company_code)}
                          </div>
                        </div>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mb-0.5 text-muted-foreground"
                    aria-label={`Remove bill field ${index + 1}`}
                    disabled={rows.length === 1 && docEntry === null}
                    onClick={() => removeRow(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add another bill
            </Button>
          </div>

          <div className="space-y-1 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
            {chosenBills.length > 0 ? (
              <p className="text-foreground">
                {chosenBills.length} bill(s) · {formatNumber(totals.litres, 2)} L ·{' '}
                {formatNumber(totals.weight, 3)} kg · Rs {formatNumber(totals.amount)}
              </p>
            ) : (
              <p>Pick at least one bill to continue.</p>
            )}
            {companyCodes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {companyCodes.map((code) => (
                  <Badge key={code} variant="outline">
                    {code}
                  </Badge>
                ))}
                {companyCodes.length > 1 && (
                  <span>— linked one company at a time, on the same vehicle.</span>
                )}
              </div>
            )}
            <p>Bills of one company on one vehicle must belong to the same SAP branch.</p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={() =>
              onConfirm({
                vehicleId: effectiveVehicleId as number,
                vehicleNumber: effectiveVehicleNumber,
                bills: chosenBills,
              })
            }
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
