import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type {
  PFMovement,
  PFMovementItem,
  PFMovementLineInput,
} from '@/modules/warehouse/api';
import {
  useCreatePFMovement,
  usePFMovementDestinations,
  usePFMovementItemSearch,
  useUpdatePFMovement,
} from '@/modules/warehouse/api';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
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
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/utils';

/** One warehouse, flattened out of the per-company destination lists. */
interface Destination {
  companyId: number;
  companyCode: string;
  companyName: string;
  code: string;
  name: string;
}

/** A line as the form holds it, before it is posted. */
interface DraftLine extends PFMovementLineInput {
  boxes: number;
  /**
   * SAP's on-hand for this item on the source floor, in pieces, as it stood when
   * the line was added. Shown beside the box count so the keeper can see what he
   * is drawing down; never posted — the register is his figure, not SAP's.
   */
  sap_on_hand?: number | null;
}

export interface MovementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Floors this user may declare out of. The source is picked from these. */
  sourceWarehouses: { code: string; name: string }[];
  /** The floor the form opens on, from the server. */
  defaultFromWarehouse: string;
  /** The movement being corrected, or null when filing a new one. */
  editing: PFMovement | null;
}

function today(): string {
  // Local date, not `toISOString()` — that is UTC and would offer yesterday to
  // anyone typing before 05:30 IST.
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * SAP's on-hand for one item, restated in the unit the keeper counts in.
 *
 * `OITW.OnHand` is in the inventory UoM — single pieces, never cartons. Reading
 * a piece count as boxes inflates the figure by the pack size (~20x on a 1 LTR
 * 20 PCS item), so it is divided by `SalFactor2` to get boxes.
 *
 * Floor-and-remainder rather than a rounded division: 485 pieces at 20 a box is
 * 24 full boxes and 5 loose bottles, and "24.25 boxes" is not something the
 * floor can load onto a truck.
 */
function availability(
  pieces: number | null | undefined,
  piecesPerBox: number | null | undefined,
): { pieces: number; boxes: number | null; loose: number | null } | null {
  if (pieces == null) return null;
  const whole = Math.floor(pieces);
  if (piecesPerBox == null || piecesPerBox < 1) {
    // No pack size to divide by. The piece count is still worth showing — it is
    // just not convertible, and a made-up box figure would be worse than none.
    return { pieces: whole, boxes: null, loose: null };
  }
  return {
    pieces: whole,
    boxes: Math.floor(whole / piecesPerBox),
    loose: whole % piecesPerBox,
  };
}

/**
 * Files what a keeper is sending out of his floor: one destination, many items.
 *
 * One document per destination on purpose — a load goes to one godown at a time,
 * and a sheet mixing destinations forces every reader to re-group it before it
 * means anything. A second godown is a second entry.
 *
 * The source floor cannot be changed on an existing document: the manager check
 * that let it be filed was made against the original, so a correction that moved
 * it would rewrite whose declaration it is. Retract and re-file instead.
 *
 * State is seeded once, at mount, and never reset by an effect: the page
 * remounts this component on each open (see its `key`), which is what makes a
 * cancelled edit unable to leak into the next one.
 */
export function MovementFormDialog({
  open,
  onOpenChange,
  sourceWarehouses,
  defaultFromWarehouse,
  editing,
}: MovementFormDialogProps) {
  const create = useCreatePFMovement();
  const update = useUpdatePFMovement();
  const saving = create.isPending || update.isPending;

  const [fromWarehouse, setFromWarehouse] = useState(() => {
    if (editing) return editing.from_warehouse;
    const offered = sourceWarehouses.map((w) => w.code);
    return offered.includes(defaultFromWarehouse)
      ? defaultFromWarehouse
      : (offered[0] ?? defaultFromWarehouse);
  });
  const [destinationKey, setDestinationKey] = useState(() =>
    editing ? `${editing.to_company}|${editing.to_warehouse}` : '',
  );
  const [movementDate, setMovementDate] = useState(
    () => editing?.movement_date ?? today(),
  );
  const [vehicleNo, setVehicleNo] = useState(editing?.vehicle_no ?? '');
  const [remarks, setRemarks] = useState(editing?.remarks ?? '');
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (editing?.lines ?? []).map((line) => ({
      item_code: line.item_code,
      item_name: line.item_name,
      uom: line.uom,
      boxes: line.boxes,
      pieces_per_box: line.pieces_per_box,
      remarks: line.remarks,
    })),
  );

  // The row being added. Kept apart from `lines` so a half-typed item never
  // counts toward the total the keeper is about to save.
  const [pickedItem, setPickedItem] = useState<PFMovementItem | null>(null);
  const [pickedBoxes, setPickedBoxes] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [pickerSeq, setPickerSeq] = useState(0);

  const debouncedSearch = useDebounce(itemSearch);
  const {
    data: items = [],
    isLoading: itemsLoading,
    isError: itemsError,
  } = usePFMovementItemSearch(debouncedSearch, fromWarehouse || undefined);

  // Fetched only while the form is open: three HANA round trips behind one call.
  const { data: destinationCompanies = [], isLoading: destinationsLoading } =
    usePFMovementDestinations({ enabled: open });

  const destinations = useMemo<Destination[]>(
    () =>
      destinationCompanies.flatMap((company) =>
        company.warehouses.map((warehouse) => ({
          companyId: company.company_id,
          companyCode: company.company_code,
          companyName: company.company_name,
          code: warehouse.code,
          name: warehouse.name,
        })),
      ),
    [destinationCompanies],
  );

  // A company HANA could not answer for. Named rather than silently missing —
  // "the Gupta godown isn't in the list" has to be answerable.
  const unreachableCompanies = useMemo(
    () => destinationCompanies.filter((c) => c.error).map((c) => c.company_name),
    [destinationCompanies],
  );

  const destination = useMemo(
    () => destinations.find((d) => `${d.companyId}|${d.code}` === destinationKey) ?? null,
    [destinations, destinationKey],
  );

  // The destination the document already carries, for the case where HANA is
  // unreachable and the list it would have been matched against is empty.
  const editingDestinationLabel = editing
    ? `${editing.to_warehouse} — ${editing.to_warehouse_name || editing.to_company_name}`
    : '';

  const totalBoxes = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.boxes) || 0), 0),
    [lines],
  );

  // What SAP has of the picked item on the source floor, said in boxes.
  const pickedStock = useMemo(
    () => availability(pickedItem?.sap_on_hand, pickedItem?.pieces_per_box),
    [pickedItem],
  );

  // Only flagged when SAP has *some* stock and the keeper is sending more than
  // it. SAP shows zero at BH-PF for 373 of 405 finished-goods items — the floor
  // is emptied by the transfer flow faster than it is booked — so warning on
  // "more than zero" would fire on nearly every pick and teach him to ignore it.
  // Never a refusal either way: see the note beside the warning below.
  const overAvailable =
    pickedStock != null &&
    pickedStock.boxes != null &&
    pickedStock.boxes > 0 &&
    Number(pickedBoxes) > pickedStock.boxes;

  function addLine() {
    if (!pickedItem) {
      toast.error('Choose an item first.');
      return;
    }
    const boxes = Number(pickedBoxes);
    if (!Number.isInteger(boxes) || boxes < 1) {
      toast.error('Enter how many boxes are going — a whole number, at least one.');
      return;
    }
    if (lines.some((line) => line.item_code === pickedItem.item_code)) {
      // Refused rather than summed: two lines for one item are always a
      // double-entry, and summing them hides the mistake inside the total.
      toast.error(`${pickedItem.item_code} is already on this movement — edit its boxes.`);
      return;
    }
    setLines((current) => [
      ...current,
      {
        item_code: pickedItem.item_code,
        item_name: pickedItem.item_name,
        uom: pickedItem.uom,
        boxes,
        // Snapshotted from SAP, never typed, so a later reader can turn boxes
        // into pieces without trusting a master that may have changed.
        pieces_per_box: pickedItem.pieces_per_box,
        // Kept for the screen only, so the keeper can still see what SAP had
        // for a line he added five minutes ago. Stripped before posting.
        sap_on_hand: pickedItem.sap_on_hand,
      },
    ]);
    setPickedItem(null);
    setPickedBoxes('');
    setItemSearch('');
    // Remount the picker, which is how its input is cleared.
    setPickerSeq((n) => n + 1);
  }

  function setLineBoxes(itemCode: string, value: string) {
    setLines((current) =>
      current.map((line) =>
        line.item_code === itemCode ? { ...line, boxes: Number(value) || 0 } : line,
      ),
    );
  }

  function removeLine(itemCode: string) {
    setLines((current) => current.filter((line) => line.item_code !== itemCode));
  }

  async function handleSave() {
    if (!lines.length) {
      toast.error('Add at least one item.');
      return;
    }
    if (lines.some((line) => !Number.isInteger(line.boxes) || line.boxes < 1)) {
      toast.error('Every line needs a whole box count of at least one.');
      return;
    }

    // `sap_on_hand` is a screen hint, not part of the declaration. The server
    // would ignore it, but sending SAP's figure inside the keeper's own record
    // invites a later reader to mistake one for the other.
    const payloadLines: PFMovementLineInput[] = lines.map((line) => ({
      item_code: line.item_code,
      item_name: line.item_name,
      uom: line.uom,
      boxes: line.boxes,
      pieces_per_box: line.pieces_per_box,
      remarks: line.remarks,
    }));

    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          payload: {
            // Only sent when a destination was actually resolved — with HANA
            // down the field is left alone rather than blanked.
            ...(destination
              ? {
                  to_warehouse: destination.code,
                  to_company: destination.companyId,
                  to_warehouse_name: destination.name,
                }
              : {}),
            movement_date: movementDate,
            vehicle_no: vehicleNo.trim(),
            remarks: remarks.trim(),
            lines: payloadLines,
          },
        });
        toast.success(`${editing.entry_no} updated`);
      } else {
        if (!destination) {
          toast.error('Choose the godown the stock is going to.');
          return;
        }
        const created = await create.mutateAsync({
          from_warehouse: fromWarehouse,
          from_warehouse_name:
            sourceWarehouses.find((w) => w.code === fromWarehouse)?.name ?? '',
          to_warehouse: destination.code,
          to_company: destination.companyId,
          to_warehouse_name: destination.name,
          movement_date: movementDate,
          vehicle_no: vehicleNo.trim(),
          remarks: remarks.trim(),
          lines: payloadLines,
        });
        toast.success(
          `${created.entry_no}: ${totalBoxes} box${totalBoxes === 1 ? '' : 'es'} to ${destination.code}`,
        );
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the movement.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Correct ${editing.entry_no}` : 'Record a stock movement'}
          </DialogTitle>
          <DialogDescription>
            What you are sending out of your godown, and to which godown. This is recorded
            here only — nothing is posted to SAP and no stock is reserved. One entry per
            destination: make a second entry for the next godown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="pf-from">From godown</Label>
              {editing ? (
                <div className="rounded-md border bg-muted/40 px-3 py-2">
                  <p className="font-mono text-sm font-medium">{editing.from_warehouse}</p>
                  <p className="text-xs text-muted-foreground">
                    {editing.from_warehouse_name || 'Cannot be changed'}
                  </p>
                </div>
              ) : (
                <NativeSelect
                  id="pf-from"
                  value={fromWarehouse}
                  onChange={(e) => setFromWarehouse(e.target.value)}
                >
                  {sourceWarehouses.map((w) => (
                    <SelectOption key={w.code} value={w.code}>
                      {w.code} — {w.name}
                    </SelectOption>
                  ))}
                </NativeSelect>
              )}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="pf-to">To godown</Label>
              <SearchableSelect<Destination>
                items={destinations}
                isLoading={destinationsLoading}
                inputId="pf-to"
                value={destinationKey}
                defaultDisplayText={
                  destination
                    ? `${destination.code} — ${destination.name}`
                    : editingDestinationLabel
                }
                placeholder="Search a godown by code or name…"
                getItemKey={(d) => `${d.companyId}|${d.code}`}
                getItemLabel={(d) => `${d.code} — ${d.name} (${d.companyName})`}
                renderItem={(d) => (
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs font-medium">{d.code}</div>
                      <div className="truncate text-sm">{d.name}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {d.companyName}
                    </Badge>
                  </div>
                )}
                loadingText="Loading godowns…"
                notFoundText="No godown matches that"
                onItemSelect={(d) => setDestinationKey(`${d.companyId}|${d.code}`)}
                onClear={() => setDestinationKey('')}
              />
              <p className="text-xs text-muted-foreground">
                Every company&apos;s godowns are listed — the Gupta finished godown is Jivo
                Mart&apos;s while the production floor is Jivo Oil&apos;s.
                {unreachableCompanies.length > 0 &&
                  ` Godowns for ${unreachableCompanies.join(', ')} could not be loaded from SAP.`}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="pf-date">Moving on</Label>
              <Input
                id="pf-date"
                type="date"
                value={movementDate}
                onChange={(e) => setMovementDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tomorrow&apos;s date is fine — the point is declaring it in advance.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pf-vehicle">Vehicle (optional)</Label>
              <Input
                id="pf-vehicle"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="HR55 1234"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pf-remarks">Remarks</Label>
              <Textarea
                id="pf-remarks"
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Anything worth knowing about this load…"
              />
            </div>
          </div>

          {/* --- items ------------------------------------------------- */}
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="pf-item">Finished goods</Label>
                <SearchableSelect<PFMovementItem>
                  key={pickerSeq}
                  items={items}
                  isLoading={itemsLoading && debouncedSearch.trim().length >= 2}
                  isError={itemsError}
                  inputId="pf-item"
                  value={pickedItem?.item_code ?? ''}
                  placeholder="Search an item by code or name…"
                  getItemKey={(i) => i.item_code}
                  getItemLabel={(i) => `${i.item_code} — ${i.item_name}`}
                  // The server did the filtering; filtering again locally would
                  // hide rows it deliberately matched on a field we do not show.
                  filterFn={() => true}
                  renderItem={(i) => (
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-xs font-medium">
                          {i.item_code}
                        </div>
                        <div className="truncate text-sm">{i.item_name}</div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {i.pieces_per_box != null && (
                          <Badge variant="outline" className="text-xs">
                            {i.pieces_per_box}/box
                          </Badge>
                        )}
                        {/* In boxes, labelled with the floor. A bare "SAP 480"
                            is a piece count that reads as boxes to anyone who
                            counts in boxes. */}
                        {(() => {
                          const stock = availability(i.sap_on_hand, i.pieces_per_box);
                          if (!stock) return null;
                          return (
                            <Badge variant="outline" className="text-xs">
                              {fromWarehouse}{' '}
                              {stock.boxes != null
                                ? `${stock.boxes.toLocaleString()} box`
                                : `${stock.pieces.toLocaleString()} pcs`}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  loadingText="Searching SAP…"
                  emptyText="Type at least 2 characters"
                  notFoundText="No finished goods match that"
                  errorText="Could not reach SAP for the item list"
                  onSearchChange={setItemSearch}
                  onItemSelect={setPickedItem}
                  onClear={() => setPickedItem(null)}
                />
              </div>
              <div className="w-28 space-y-1">
                <Label htmlFor="pf-boxes">Boxes</Label>
                <Input
                  id="pf-boxes"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={pickedBoxes}
                  onChange={(e) => setPickedBoxes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLine();
                    }
                  }}
                  placeholder="0"
                />
              </div>
              <Button type="button" variant="outline" onClick={addLine}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            {pickedItem && (
              <div className="space-y-0.5 text-xs">
                {pickedStock && pickedStock.pieces === 0 ? (
                  <p className="text-muted-foreground">
                    SAP shows none of this item in{' '}
                    <span className="font-medium text-foreground">{fromWarehouse}</span> right
                    now — the floor usually runs ahead of SAP here, so record what is
                    actually going.
                  </p>
                ) : pickedStock ? (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{fromWarehouse}</span> has{' '}
                    {pickedStock.boxes != null ? (
                      <>
                        <span className="font-medium text-foreground">
                          {pickedStock.boxes.toLocaleString()} box
                          {pickedStock.boxes === 1 ? '' : 'es'}
                        </span>
                        {pickedStock.loose ? (
                          <> plus {pickedStock.loose.toLocaleString()} loose</>
                        ) : null}
                        {' — '}
                        {pickedStock.pieces.toLocaleString()} {pickedItem.uom || 'pcs'} at{' '}
                        {pickedItem.pieces_per_box} a box
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-foreground">
                          {pickedStock.pieces.toLocaleString()} {pickedItem.uom || 'pcs'}
                        </span>
                        {' — '}SAP has no pack size for this item, so it cannot be shown in
                        boxes
                      </>
                    )}
                    , per SAP.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    SAP has no stock record for this item in {fromWarehouse}.
                  </p>
                )}
                {pickedItem.pieces_per_box != null && Number(pickedBoxes) > 0 && (
                  <p className="text-muted-foreground">
                    Sending {pickedBoxes} box × {pickedItem.pieces_per_box} ={' '}
                    {(Number(pickedBoxes) * pickedItem.pieces_per_box).toLocaleString()} pieces
                  </p>
                )}
                {/* A warning, never a block. SAP's on-hand and the floor
                    disagree routinely — receipts booked late, stock moved
                    without a document — and this page exists to record what the
                    keeper says, not what SAP already believes. */}
                {overAvailable && (
                  <p className="text-amber-700">
                    That is more than SAP shows in {fromWarehouse} ({pickedStock?.boxes ?? 0}{' '}
                    box). You can still record it — check the figure.
                  </p>
                )}
              </div>
            )}

            {lines.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No items yet. Search one above, type the boxes and press Add.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-2 py-1">Item</th>
                      <th className="w-28 px-2 py-1 text-right">Boxes</th>
                      <th className="px-2 py-1 text-right">Pieces</th>
                      <th className="px-2 py-1 text-right">In {fromWarehouse}</th>
                      <th className="w-10 px-2 py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.item_code} className="border-b align-middle">
                        <td className="px-2 py-1">
                          <p className="font-mono text-xs font-medium">{line.item_code}</p>
                          <p className="text-sm">{line.item_name}</p>
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            className="h-8 text-right"
                            value={line.boxes || ''}
                            aria-label={`Boxes of ${line.item_code}`}
                            onChange={(e) => setLineBoxes(line.item_code, e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                          {line.pieces_per_box != null
                            ? (line.boxes * line.pieces_per_box).toLocaleString()
                            : '—'}
                        </td>
                        {/* SAP's figure for the source floor, in boxes. An em
                            dash on a line loaded from a saved movement: the
                            document does not store SAP's on-hand, and re-reading
                            HANA once per line to fill a hint is not worth the
                            round trips. */}
                        <td className="px-2 py-1 text-right tabular-nums">
                          {(() => {
                            const stock = availability(line.sap_on_hand, line.pieces_per_box);
                            if (!stock) return <span className="text-muted-foreground">—</span>;
                            if (stock.boxes == null) {
                              return (
                                <span className="text-muted-foreground">
                                  {stock.pieces.toLocaleString()} pcs
                                </span>
                              );
                            }
                            return (
                              <span
                                className={
                                  stock.boxes > 0 && line.boxes > stock.boxes
                                    ? 'text-amber-700'
                                    : 'text-muted-foreground'
                                }
                              >
                                {stock.boxes.toLocaleString()} box
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-2 py-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-red-600"
                            aria-label={`Remove ${line.item_code}`}
                            onClick={() => removeLine(line.item_code)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="px-2 py-2 text-right font-medium">Total</td>
                      <td className="px-2 py-2 text-right font-medium tabular-nums">
                        {totalBoxes}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {editing ? 'Save changes' : 'Record movement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
