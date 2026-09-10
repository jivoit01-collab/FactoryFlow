import { ClipboardPaste, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type {
  PFMovement,
  PFMovementDestinationKind,
  PFMovementItem,
  PFMovementLineInput,
  PFMovementPasteLine,
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

import { PasteLinesDialog } from './PasteLinesDialog';

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
  pieces: number;
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
 * SAP's on-hand for one item, and the same figure said in boxes.
 *
 * `OITW.OnHand` is in the inventory UoM — single pieces, never cartons — which
 * is the same unit typed on this form, so the two compare with no conversion at
 * all. The box equivalent rides along because the floor still counts in boxes.
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
 * Litres for a piece count, or null for an item SAP holds no volume for.
 *
 * `SalPackUn` is the litres in ONE piece — a 1 LTR bottle reads 1, a 2 LTR
 * handle 2, a 750 GMS pouch 0.8242 — and it is the same field the monthly
 * sales-litre reports run on. Null, never 0: a carton is not zero litres, it is
 * not measured in litres, and a zero would get added up by somebody.
 */
function litresFor(
  pieces: number,
  litresPerPiece: number | null | undefined,
): number | null {
  if (litresPerPiece == null || litresPerPiece <= 0) return null;
  return pieces * litresPerPiece;
}

/** Litres to 3 places, trimmed of trailing zeros so 240.000 reads as 240. */
function formatLitres(litres: number): string {
  return Number(litres.toFixed(3)).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });
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
  const [destinationKind, setDestinationKind] = useState<PFMovementDestinationKind>(
    () => editing?.destination_kind ?? 'GODOWN',
  );
  const isDispatch = destinationKind === 'DISPATCH';
  const [destinationKey, setDestinationKey] = useState(() =>
    editing && editing.to_company != null
      ? `${editing.to_company}|${editing.to_warehouse}`
      : '',
  );
  const [movementDate, setMovementDate] = useState(
    () => editing?.movement_date ?? today(),
  );
  const [vehicleNo, setVehicleNo] = useState(editing?.vehicle_no ?? '');
  const [reference, setReference] = useState(editing?.reference ?? '');
  const [remarks, setRemarks] = useState(editing?.remarks ?? '');
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (editing?.lines ?? []).map((line) => ({
      item_code: line.item_code,
      item_name: line.item_name,
      uom: line.uom,
      pieces: line.pieces,
      pieces_per_box: line.pieces_per_box,
      // Back to a number for the form's arithmetic; it goes out as a number too.
      litres_per_piece:
        line.litres_per_piece == null ? null : Number(line.litres_per_piece),
      remarks: line.remarks,
    })),
  );

  // The row being added. Kept apart from `lines` so a half-typed item never
  // counts toward the total the keeper is about to save.
  const [pickedItem, setPickedItem] = useState<PFMovementItem | null>(null);
  const [pickedPieces, setPickedPieces] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [pickerSeq, setPickerSeq] = useState(0);
  const [pasteOpen, setPasteOpen] = useState(false);

  const debouncedSearch = useDebounce(itemSearch);
  const {
    data: items = [],
    isLoading: itemsLoading,
    isError: itemsError,
  } = usePFMovementItemSearch(debouncedSearch, fromWarehouse || undefined);

  // Fetched only while the form is open AND a godown is actually being chosen:
  // three HANA round trips behind one call, and a dispatch needs none of them.
  const { data: destinationCompanies = [], isLoading: destinationsLoading } =
    usePFMovementDestinations({ enabled: open && !isDispatch });

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
  const editingDestinationLabel =
    editing && editing.to_warehouse
      ? `${editing.to_warehouse} — ${editing.to_warehouse_name || editing.to_company_name}`
      : '';

  const totalPieces = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.pieces) || 0), 0),
    [lines],
  );

  // Only the litre items contribute, so this is not the piece total under
  // another name.
  const totalLitres = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + (litresFor(Number(line.pieces) || 0, line.litres_per_piece) ?? 0),
        0,
      ),
    [lines],
  );

  // What SAP has of the picked item on the source floor: pieces, which is
  // the unit being typed, plus the box equivalent for the floor's own sake.
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
    pickedStock.pieces > 0 &&
    Number(pickedPieces) > pickedStock.pieces;

  function addLine() {
    if (!pickedItem) {
      toast.error('Choose an item first.');
      return;
    }
    const pieces = Number(pickedPieces);
    if (!Number.isInteger(pieces) || pieces < 1) {
      toast.error('Enter how many pieces are going — a whole number, at least one.');
      return;
    }
    if (lines.some((line) => line.item_code === pickedItem.item_code)) {
      // Refused rather than summed: two lines for one item are always a
      // double-entry, and summing them hides the mistake inside the total.
      toast.error(`${pickedItem.item_code} is already on this movement — edit its pieces.`);
      return;
    }
    setLines((current) => [
      ...current,
      {
        item_code: pickedItem.item_code,
        item_name: pickedItem.item_name,
        uom: pickedItem.uom,
        pieces,
        // Both snapshotted from SAP, never typed, so a later reader gets the
        // boxes and litres that were true when the line was filed rather than
        // whatever the item master says by then.
        pieces_per_box: pickedItem.pieces_per_box,
        litres_per_piece: pickedItem.litres_per_piece,
        // Kept for the screen only, so the keeper can still see what SAP had
        // for a line he added five minutes ago. Stripped before posting.
        sap_on_hand: pickedItem.sap_on_hand,
      },
    ]);
    setPickedItem(null);
    setPickedPieces('');
    setItemSearch('');
    // Remount the picker, which is how its input is cleared.
    setPickerSeq((n) => n + 1);
  }

  /**
   * Append rows read out of a pasted block.
   *
   * Items already on the form are skipped rather than summed or overwritten —
   * the paste dialog says which, so the keeper decides. Summing would double a
   * quantity he can no longer see the parts of, and overwriting would throw
   * away a figure he typed by hand.
   */
  function addPastedLines(pasted: PFMovementPasteLine[]) {
    setLines((current) => {
      const present = new Set(current.map((line) => line.item_code));
      const additions = pasted
        .filter((line) => !present.has(line.item_code))
        .map((line) => ({
          item_code: line.item_code,
          item_name: line.item_name,
          uom: line.uom,
          pieces: line.pieces,
          pieces_per_box: line.pieces_per_box,
          litres_per_piece: line.litres_per_piece,
          sap_on_hand: line.sap_on_hand,
        }));
      return [...current, ...additions];
    });
  }

  function setLinePieces(itemCode: string, value: string) {
    setLines((current) =>
      current.map((line) =>
        line.item_code === itemCode ? { ...line, pieces: Number(value) || 0 } : line,
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
    if (lines.some((line) => !Number.isInteger(line.pieces) || line.pieces < 1)) {
      toast.error('Every line needs a whole piece count of at least one.');
      return;
    }

    // `sap_on_hand` is a screen hint, not part of the declaration. The server
    // would ignore it, but sending SAP's figure inside the keeper's own record
    // invites a later reader to mistake one for the other.
    const payloadLines: PFMovementLineInput[] = lines.map((line) => ({
      item_code: line.item_code,
      item_name: line.item_name,
      uom: line.uom,
      pieces: line.pieces,
      pieces_per_box: line.pieces_per_box,
      litres_per_piece: line.litres_per_piece,
      remarks: line.remarks,
    }));

    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          payload: {
            // A dispatch is sent as the kind alone — the server drops the
            // destination rather than expecting three blanked fields. For a
            // godown move the destination only rides along once it resolves,
            // so an unreachable HANA leaves the stored one alone instead of
            // blanking it.
            ...(isDispatch
              ? { destination_kind: 'DISPATCH' as const }
              : destination
                ? {
                    destination_kind: 'GODOWN' as const,
                    to_warehouse: destination.code,
                    to_company: destination.companyId,
                    to_warehouse_name: destination.name,
                  }
                : {}),
            movement_date: movementDate,
            vehicle_no: vehicleNo.trim(),
            reference: reference.trim(),
            remarks: remarks.trim(),
            lines: payloadLines,
          },
        });
        toast.success(`${editing.entry_no} updated`);
      } else {
        if (!isDispatch && !destination) {
          toast.error('Choose the godown the stock is going to.');
          return;
        }
        const created = await create.mutateAsync({
          from_warehouse: fromWarehouse,
          from_warehouse_name:
            sourceWarehouses.find((w) => w.code === fromWarehouse)?.name ?? '',
          destination_kind: destinationKind,
          // Omitted entirely on a dispatch: the server refuses a destination
          // alongside one, which is what keeps a contradictory entry from
          // half-applying.
          ...(isDispatch || !destination
            ? {}
            : {
                to_warehouse: destination.code,
                to_company: destination.companyId,
                to_warehouse_name: destination.name,
              }),
          movement_date: movementDate,
          vehicle_no: vehicleNo.trim(),
          reference: reference.trim(),
          remarks: remarks.trim(),
          lines: payloadLines,
        });
        toast.success(
          `${created.entry_no}: ${totalPieces.toLocaleString()} pcs${
            totalLitres > 0 ? ` (${formatLitres(totalLitres)} L)` : ''
          } ${isDispatch ? 'dispatched' : `to ${destination?.code}`}`,
        );
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the movement.'));
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Correct ${editing.entry_no}` : 'Record a stock movement'}
          </DialogTitle>
          <DialogDescription>
            What you are sending out of your godown — to another godown, or straight out
            on a dispatch. This is recorded here only: nothing is posted to SAP and no
            stock is reserved. One entry per destination, so make a second entry for the
            next godown.
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

            <div className="space-y-1">
              <Label htmlFor="pf-kind">Going where</Label>
              <NativeSelect
                id="pf-kind"
                value={destinationKind}
                onChange={(e) =>
                  setDestinationKind(e.target.value as PFMovementDestinationKind)
                }
              >
                <SelectOption value="GODOWN">To another godown</SelectOption>
                <SelectOption value="DISPATCH">Dispatched directly</SelectOption>
              </NativeSelect>
            </div>

            {/* A dispatch has no destination godown, so the picker is not shown
                rather than shown-and-ignored. The chosen godown is kept in
                state either way, so flipping back does not lose it. */}
            {isDispatch ? (
              <div className="space-y-1">
                <Label>To</Label>
                <div className="rounded-md border bg-muted/40 px-3 py-2">
                  <p className="text-sm font-medium">Dispatch</p>
                  <p className="text-xs text-muted-foreground">
                    Straight out, not into another godown.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
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
            )}
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
              <Label htmlFor="pf-reference">Invoice / bilty no (optional)</Label>
              <Input
                id="pf-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="INV/2026/00841"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if the paperwork is not cut yet.
              </p>
            </div>
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

          {/* --- items ------------------------------------------------- */}
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Search items one at a time, or paste the whole list.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPasteOpen(true)}
              >
                <ClipboardPaste className="mr-1 h-4 w-4" /> Paste from SAP / Excel
              </Button>
            </div>
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
                        {i.litres_per_piece != null && (
                          <Badge variant="outline" className="text-xs">
                            {formatLitres(i.litres_per_piece)} L
                          </Badge>
                        )}
                        {/* Labelled with the floor it belongs to, and in the
                            same unit as the quantity column, so a bare "480"
                            cannot be read as boxes. */}
                        {(() => {
                          const stock = availability(i.sap_on_hand, i.pieces_per_box);
                          if (!stock) return null;
                          return (
                            <Badge variant="outline" className="text-xs">
                              {fromWarehouse} {stock.pieces.toLocaleString()} pcs
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
                <Label htmlFor="pf-pieces">Pieces</Label>
                <Input
                  id="pf-pieces"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={pickedPieces}
                  onChange={(e) => setPickedPieces(e.target.value)}
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
                    <span className="font-medium text-foreground">
                      {pickedStock.pieces.toLocaleString()} {pickedItem.uom || 'pcs'}
                    </span>
                    {pickedStock.boxes != null && (
                      <>
                        {' — '}
                        {pickedStock.boxes.toLocaleString()} box
                        {pickedStock.boxes === 1 ? '' : 'es'}
                        {pickedStock.loose
                          ? ` plus ${pickedStock.loose.toLocaleString()} loose`
                          : ''}{' '}
                        at {pickedItem.pieces_per_box} a box
                      </>
                    )}
                    {(() => {
                      const litres = litresFor(
                        pickedStock.pieces,
                        pickedItem.litres_per_piece,
                      );
                      return litres == null ? '' : ` · ${formatLitres(litres)} L`;
                    })()}
                    , per SAP.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    SAP has no stock record for this item in {fromWarehouse}.
                  </p>
                )}
                {Number(pickedPieces) > 0 && (
                  <p className="text-muted-foreground">
                    Sending {Number(pickedPieces).toLocaleString()} pcs
                    {pickedItem.pieces_per_box != null &&
                      ` — ${Math.floor(Number(pickedPieces) / pickedItem.pieces_per_box)} box${
                        Number(pickedPieces) % pickedItem.pieces_per_box
                          ? ` plus ${Number(pickedPieces) % pickedItem.pieces_per_box} loose`
                          : ''
                      }`}
                    {(() => {
                      const litres = litresFor(
                        Number(pickedPieces),
                        pickedItem.litres_per_piece,
                      );
                      return litres == null ? '' : ` · ${formatLitres(litres)} L`;
                    })()}
                  </p>
                )}
                {/* A warning, never a block. SAP's on-hand and the floor
                    disagree routinely — receipts booked late, stock moved
                    without a document — and this page exists to record what the
                    keeper says, not what SAP already believes. */}
                {overAvailable && (
                  <p className="text-amber-700">
                    That is more than SAP shows in {fromWarehouse} (
                    {(pickedStock?.pieces ?? 0).toLocaleString()} {pickedItem.uom || 'pcs'}). You
                    can still record it — check the figure.
                  </p>
                )}
              </div>
            )}

            {lines.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No items yet. Search one above, type the pieces and press Add.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-2 py-1">Item</th>
                      <th className="w-28 px-2 py-1 text-right">Pieces</th>
                      <th className="px-2 py-1 text-right">Ltr</th>
                      <th className="px-2 py-1 text-right">Boxes</th>
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
                            value={line.pieces || ''}
                            aria-label={`Pieces of ${line.item_code}`}
                            onChange={(e) => setLinePieces(line.item_code, e.target.value)}
                          />
                        </td>
                        {/* An em dash, not 0: SAP holds no volume for this item,
                            which is not the same as it being zero litres. */}
                        <td className="px-2 py-1 text-right font-medium tabular-nums">
                          {(() => {
                            const litres = litresFor(line.pieces, line.litres_per_piece);
                            return litres == null ? (
                              <span className="font-normal text-muted-foreground">—</span>
                            ) : (
                              formatLitres(litres)
                            );
                          })()}
                        </td>
                        {/* The box equivalent, floor-and-remainder, because the
                            floor still counts in boxes. */}
                        <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                          {line.pieces_per_box
                            ? `${Math.floor(line.pieces / line.pieces_per_box).toLocaleString()}${
                                line.pieces % line.pieces_per_box
                                  ? ` + ${line.pieces % line.pieces_per_box}`
                                  : ''
                              }`
                            : '—'}
                        </td>
                        {/* SAP's on-hand for the source floor, in pieces — the
                            same unit as the column being typed, so the two
                            compare directly. An em dash on a line loaded from a
                            saved movement: the document does not store SAP's
                            on-hand, and re-reading HANA once per line to fill a
                            hint is not worth the round trips. */}
                        <td className="px-2 py-1 text-right tabular-nums">
                          {line.sap_on_hand == null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span
                              className={
                                line.sap_on_hand > 0 && line.pieces > line.sap_on_hand
                                  ? 'text-amber-700'
                                  : 'text-muted-foreground'
                              }
                            >
                              {Math.floor(line.sap_on_hand).toLocaleString()}
                            </span>
                          )}
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
                        {totalPieces.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right font-medium tabular-nums">
                        {totalLitres > 0 ? formatLitres(totalLitres) : '—'}
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

    {/* A sibling, not nested inside the form's DialogContent: two Radix dialogs
        one inside the other share a focus trap and an Escape handler, and
        Escape in the paste box would be as likely to close the whole form. */}
    <PasteLinesDialog
      open={pasteOpen}
      onOpenChange={setPasteOpen}
      fromWarehouse={fromWarehouse}
      existingCodes={lines.map((line) => line.item_code)}
      onAdd={addPastedLines}
    />
    </>
  );
}
