import { Plus, X } from 'lucide-react';
import { type ClipboardEvent, useEffect, useMemo, useRef, useState } from 'react';

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

import { branchClash, branchOf, firstBranchClash } from '../utils/branchCheck';
import { billNumbersFromClipboard } from '../utils/pastedBillNumbers';

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

/** For each pasted bill number: the bill to put on the load, or why it cannot go. */
export type PastedBillAnswers = Map<string, DispatchBill | string>;

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
  /**
   * Answer pasted bill numbers that `bills` does not hold, each with its bill or
   * why it cannot be linked. Without it they are reported as not found.
   */
  onLookupBills?: (numbers: string[]) => Promise<PastedBillAnswers>;
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

/** A doc entry is only unique within a company, and the list holds several. */
function billKey(bill: DispatchBill) {
  return `${bill.company_code ?? ''}:${bill.doc_entry}`;
}

interface PasteReport {
  pasted: number;
  added: number;
  /** One line per pasted number that was not added, saying why. */
  problems: string[];
}

/**
 * Put pasted bills into the empty bill fields, then into new ones, in the order
 * they were pasted. A bill already on the load, or of another SAP branch than
 * the bills chosen before it, is left out with the reason.
 */
function placeBills(rows: Array<DispatchBill | null>, incoming: DispatchBill[]) {
  const next = [...rows];
  const left = new Map<DispatchBill, string>();
  for (const bill of incoming) {
    const chosen = next.filter((row): row is DispatchBill => row !== null);
    if (chosen.some((row) => billKey(row) === billKey(bill))) {
      left.set(bill, `${bill.doc_num} — already on the list`);
      continue;
    }
    const clash = branchClash(bill, chosen);
    if (clash) {
      left.set(bill, clash);
      continue;
    }
    const empty = next.indexOf(null);
    if (empty === -1) next.push(bill);
    else next[empty] = bill;
  }
  return { rows: next, left };
}

/**
 * Ask for a vehicle and the bills it will carry — the entry point of the
 * vehicle-based Vehicle Linking page. One bill row to start, and a row added per
 * extra bill, because a truck's load is built up bill by bill. Bills come from
 * every company the user belongs to; the caller links each company separately.
 *
 * Dispatch keeps the day's loads in a sheet, so bill numbers copied from it
 * (a column from Excel, Google Sheets, Zoho Sheet or anything else) can be
 * pasted into any bill field, and each one lands in a field of its own.
 */
export function LinkVehicleBillsDialog({
  open,
  mode,
  vehicle = null,
  bills,
  isLoading,
  isError,
  onSearchChange,
  onLookupBills,
  onOpenChange,
  onConfirm,
}: LinkVehicleBillsDialogProps) {
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  // One entry per bill field on screen; null while that field is still empty.
  // The bill itself, not its doc entry: a bill found by number is in `bills`
  // only while its number is the search, and must stay on the load after.
  const [rows, setRows] = useState<Array<DispatchBill | null>>([null]);
  // Why the last bill picked in a row was refused, keyed by that row.
  const [refused, setRefused] = useState<Record<number, string>>({});
  // Bumped on a refusal so that row's search box forgets the refused bill.
  const [refusals, setRefusals] = useState(0);
  // What the last paste of bill numbers did, and how many are still being
  // looked up past the list.
  const [pasteReport, setPasteReport] = useState<PasteReport | null>(null);
  const [lookingUp, setLookingUp] = useState(0);
  // Bumped once a paste has filled the fields, so each shows its bill afresh.
  const [pastes, setPastes] = useState(0);
  // A paste's lookup can answer after more bills were picked, or after the
  // dialog was closed: it places its bills on the rows as they are then, and
  // not at all into a later opening.
  const rowsRef = useRef(rows);
  const openingRef = useRef(0);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const { data: vehicleNames = [], isLoading: vehiclesLoading } = useVehicleNames(
    open && mode === 'new',
  );

  useEffect(() => {
    if (open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the form once it closes.
    setVehicleId(null);
    setVehicleNumber('');
    setRows([null]);
    setRefused({});
    setPasteReport(null);
    setLookingUp(0);
    openingRef.current += 1;
  }, [open]);

  const chosenBills = useMemo(
    () => rows.filter((bill): bill is DispatchBill => bill !== null),
    [rows],
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
  // The server refuses one company's bills from two SAP branches on one link,
  // but only after the whole linking form is filled in. Say so here instead.
  const clash = useMemo(() => firstBranchClash(chosenBills), [chosenBills]);
  const canConfirm =
    effectiveVehicleId !== null && chosenBills.length > 0 && !clash && lookingUp === 0;
  // A pasted load can be taller than the screen, so the dialog scrolls then. Not
  // before: a scrolling dialog clips the search list hanging below a bill field.
  const tall = rows.length + (pasteReport?.problems.length ?? 0) > 4;

  function setRow(index: number, bill: DispatchBill | null) {
    setRows((current) => current.map((value, i) => (i === index ? bill : value)));
    setRefused((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  }

  /** The bills chosen in every row but this one. */
  function chosenElsewhere(index: number): DispatchBill[] {
    return rows.filter((bill, i): bill is DispatchBill => i !== index && bill !== null);
  }

  function pickBill(index: number, bill: DispatchBill) {
    const why = branchClash(bill, chosenElsewhere(index));
    if (why) {
      setRefused((current) => ({ ...current, [index]: why }));
      setRefusals((count) => count + 1);
      return;
    }
    setRow(index, bill);
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const numbers = billNumbersFromClipboard(event.clipboardData);
    // Nothing that reads as a bill number: an ordinary paste into a search box.
    if (numbers.length === 0) return;
    event.preventDefault();
    void addPastedBills(numbers);
  }

  async function addPastedBills(numbers: string[]) {
    const opening = openingRef.current;
    const answers: PastedBillAnswers = new Map();
    const unknown: string[] = [];
    for (const number of numbers) {
      const matches = bills.filter((bill) => String(bill.doc_num).trim() === number);
      if (matches.length === 1) answers.set(number, matches[0]);
      else if (matches.length > 1) {
        answers.set(number, 'is a bill of more than one company, pick it from the list');
      } else unknown.push(number);
    }

    let notFound = 'is not an unlinked bill';
    if (unknown.length > 0 && onLookupBills) {
      setLookingUp((count) => count + unknown.length);
      const looked = await onLookupBills(unknown).catch(() => null);
      // Closing reset the count, and the bills are no use to a later opening.
      if (openingRef.current !== opening) return;
      setLookingUp((count) => count - unknown.length);
      if (looked) looked.forEach((answer, number) => answers.set(number, answer));
      else notFound = 'could not be looked up, try pasting it again';
    }

    const pastedBills: DispatchBill[] = [];
    for (const number of numbers) {
      const answer = answers.get(number);
      if (answer && typeof answer !== 'string') pastedBills.push(answer);
    }
    const placed = placeBills(rowsRef.current, pastedBills);
    // In the order pasted, so the notes read down the sheet's column.
    const problems: string[] = [];
    for (const number of numbers) {
      const answer = answers.get(number) ?? notFound;
      if (typeof answer === 'string') problems.push(`${number} — ${answer}`);
      else if (placed.left.has(answer)) problems.push(placed.left.get(answer) as string);
    }
    setRows(placed.rows);
    setRefused({});
    setPastes((count) => count + 1);
    setPasteReport({
      pasted: numbers.length,
      added: numbers.length - problems.length,
      problems,
    });
  }

  function addRow() {
    setRows((current) => [...current, null]);
  }

  function removeRow(index: number) {
    setRows((current) => (current.length === 1 ? [null] : current.filter((_, i) => i !== index)));
    // Notes are keyed by row, and the rows below this one move up.
    setRefused({});
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={tall ? 'max-h-[90vh] max-w-2xl overflow-y-auto' : 'max-w-2xl'}>
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

          <div className="space-y-3" onPaste={handlePaste}>
            {rows.map((selected, index) => {
              const others = chosenElsewhere(index);
              // A bill already chosen in another row is off the menu here.
              const takenElsewhere = new Set(others.map(billKey));
              const rowItems = bills.filter((bill) => !takenElsewhere.has(billKey(bill)));

              return (
                <div key={index} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <SearchableSelect<DispatchBill>
                      key={`${pastes}-${refused[index] ? `refused-${refusals}` : 'row'}`}
                      inputId={`link-vehicle-bill-${index}`}
                      label={index === 0 ? 'Bills' : undefined}
                      value={selected ? billKey(selected) : ''}
                      defaultDisplayText={selected ? billLabel(selected) : ''}
                      items={rowItems}
                      isLoading={isLoading}
                      isError={isError}
                      placeholder="Search a bill, or paste bill numbers"
                      getItemKey={billKey}
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
                      onItemSelect={(bill) => pickBill(index, bill)}
                      onClear={() => setRow(index, null)}
                      renderItem={(bill) => {
                        const blocked = Boolean(branchClash(bill, others));
                        return (
                          <div className={`min-w-0 flex-1 ${blocked ? 'opacity-60' : ''}`}>
                            <div className="truncate text-sm font-medium">
                              {bill.doc_num} - {compactText(bill.card_name)}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {compactText(bill.city)} {compactText(bill.state)} ·{' '}
                              {formatNumber(bill.total_weight, 3)} kg ·{' '}
                              {compactText(bill.company_code)}
                              {branchOf(bill) ? ` · ${branchOf(bill)}` : ''}
                            </div>
                            {blocked && (
                              <div className="truncate text-xs font-medium text-rose-600">
                                Another SAP branch than the bills already picked
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    {refused[index] && (
                      <p className="mt-1 text-xs text-rose-600">{refused[index]}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mb-0.5 text-muted-foreground"
                    aria-label={`Remove bill field ${index + 1}`}
                    disabled={rows.length === 1 && selected === null}
                    onClick={() => removeRow(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {lookingUp > 0 && (
              <p className="text-xs text-muted-foreground" role="status">
                Looking up {lookingUp} pasted bill(s)...
              </p>
            )}
            {pasteReport && (
              <div className="space-y-0.5 rounded-md border p-2 text-xs" role="status">
                <p className="text-foreground">
                  {pasteReport.added === pasteReport.pasted
                    ? `${pasteReport.added} pasted bill(s) added.`
                    : `${pasteReport.added} of ${pasteReport.pasted} pasted bill(s) added. Not added:`}
                </p>
                {pasteReport.problems.map((line) => (
                  <p key={line} className="text-rose-600">
                    {line}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-2 h-4 w-4" />
                Add another bill
              </Button>
              <span className="text-xs text-muted-foreground">
                or paste bill numbers copied from a sheet into a bill field
              </span>
            </div>
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
            {clash ? (
              <p className="font-medium text-rose-600">{clash}</p>
            ) : (
              <p>Bills of one company on one vehicle must belong to the same SAP branch.</p>
            )}
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
