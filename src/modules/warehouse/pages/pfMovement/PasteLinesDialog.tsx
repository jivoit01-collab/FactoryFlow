import { AlertTriangle, ClipboardPaste, Loader2, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type {
  PFMovementPasteLine,
  PFMovementPasteResult,
  PFMovementPasteUnit,
} from '@/modules/warehouse/api';
import { useParsePFMovementPaste } from '@/modules/warehouse/api';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

export interface PasteLinesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The floor being emptied — decides whose on-hand is shown per row. */
  fromWarehouse: string;
  /** Item codes already on the form, so the preview can say what it will skip. */
  existingCodes: string[];
  /** Called with the rows the keeper accepted. */
  onAdd: (lines: PFMovementPasteLine[]) => void;
}

const EXAMPLE = 'FG0000032\tCOLD PRESS 1 LTR 20 PCS\t240\nFG0000114\tPOMACE OLIVE 2 LTR\t100';

/**
 * Reads a block copied out of SAP or Excel into the form's item lines.
 *
 * Two steps on purpose. The paste is parsed and shown first — resolved rows,
 * rejected rows and the reason for each — and only then does the keeper add
 * them. A paste that went straight into the form would make a mis-copied column
 * something he discovers after saving.
 *
 * Nothing is written by either step: the accepted rows become ordinary form
 * lines and the normal save does the writing, so a paste is never a second way
 * into the register.
 */
export function PasteLinesDialog({
  open,
  onOpenChange,
  fromWarehouse,
  existingCodes,
  onAdd,
}: PasteLinesDialogProps) {
  const [text, setText] = useState('');
  // No default that could be wrong silently: pieces-vs-boxes is the one thing a
  // paste cannot imply, and a box count read as pieces is off by the pack size
  // while still looking like a plausible figure. Pieces is pre-selected because
  // it is what SAP grids carry, and the control sits beside the paste box where
  // it cannot be missed.
  const [unit, setUnit] = useState<PFMovementPasteUnit>('PCS');
  const [result, setResult] = useState<PFMovementPasteResult | null>(null);

  const parse = useParsePFMovementPaste();

  const already = useMemo(
    () => new Set(existingCodes.map((c) => c.toUpperCase())),
    [existingCodes],
  );

  // Split rather than filtered: a row the form already holds is not an error,
  // but the keeper has to be told it was left alone instead of wondering why
  // his figure did not change.
  const fresh = useMemo(
    () => (result?.lines ?? []).filter((line) => !already.has(line.item_code)),
    [result, already],
  );
  const duplicates = useMemo(
    () => (result?.lines ?? []).filter((line) => already.has(line.item_code)),
    [result, already],
  );

  const freshPieces = useMemo(
    () => fresh.reduce((sum, line) => sum + line.pieces, 0),
    [fresh],
  );

  async function handleParse() {
    if (!text.trim()) {
      toast.error('Paste the rows first.');
      return;
    }
    try {
      const parsed = await parse.mutateAsync({
        text,
        unit,
        from_warehouse: fromWarehouse,
      });
      setResult(parsed);
      if (!parsed.lines.length) {
        toast.error('Nothing in that paste could be read as an item line.');
      }
    } catch (err) {
      setResult(null);
      toast.error(getErrorMessage(err, 'Could not read that paste.'));
    }
  }

  function handleAdd() {
    if (!fresh.length) {
      toast.error('No new items to add.');
      return;
    }
    onAdd(fresh);
    toast.success(
      `Added ${fresh.length} item${fresh.length === 1 ? '' : 's'}, ${freshPieces.toLocaleString()} pcs`,
    );
    onOpenChange(false);
  }

  const problems = (result?.skipped.length ?? 0) + (result?.unresolved.length ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Paste from SAP or Excel
          </DialogTitle>
          <DialogDescription>
            Copy the rows — item code and quantity, plus whatever other columns are in the
            way — and paste them here. The item names, pack sizes and litre factors come from
            SAP; nothing is saved until you add the rows and save the movement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48 space-y-1">
              <Label htmlFor="pf-paste-unit">The numbers are</Label>
              <NativeSelect
                id="pf-paste-unit"
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value as PFMovementPasteUnit);
                  // The old preview was read in the old unit; keeping it on
                  // screen beside a changed dropdown is how a box count gets
                  // added as pieces.
                  setResult(null);
                }}
              >
                <SelectOption value="PCS">Pieces</SelectOption>
                <SelectOption value="BOX">Boxes</SelectOption>
              </NativeSelect>
            </div>
            <p className="pb-2 text-xs text-muted-foreground">
              {unit === 'BOX'
                ? "Each row's boxes are multiplied by that item's own pack size from SAP."
                : 'Pieces are what SAP grids carry, and what this register stores.'}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-paste-text">Pasted rows</Label>
            <Textarea
              id="pf-paste-text"
              rows={7}
              className="font-mono text-xs"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setResult(null);
              }}
              placeholder={EXAMPLE}
            />
            <p className="text-xs text-muted-foreground">
              Select the cells across all the columns and copy — one column at a time has no
              column breaks in it and cannot be read.
            </p>
          </div>

          <Button variant="outline" onClick={handleParse} disabled={parse.isPending}>
            {parse.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ClipboardPaste className="mr-2 h-4 w-4" />
            )}
            Read the paste
          </Button>

          {result && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">
                  {result.header_row
                    ? `Header read from row ${result.header_row}`
                    : 'No header — read by column position'}
                </Badge>
                <Badge variant="outline">
                  {fresh.length} item{fresh.length === 1 ? '' : 's'} ready
                </Badge>
                <Badge variant="outline">{freshPieces.toLocaleString()} pcs</Badge>
                {problems > 0 && (
                  <Badge className="bg-amber-100 text-amber-800">
                    {problems} row{problems === 1 ? '' : 's'} need attention
                  </Badge>
                )}
              </div>

              {result.lookup_error && (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  SAP could not be reached to check these codes, so none of them could be
                  resolved: {result.lookup_error}
                </p>
              )}

              {result.combined_codes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Appeared on more than one row and were added together:{' '}
                  {result.combined_codes.join(', ')}.
                </p>
              )}

              {fresh.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs">
                        <th className="px-2 py-1">Item</th>
                        <th className="px-2 py-1 text-right">
                          {unit === 'BOX' ? 'Boxes → Pieces' : 'Pieces'}
                        </th>
                        <th className="px-2 py-1 text-right">Ltr</th>
                        <th className="px-2 py-1 text-right">In {fromWarehouse}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fresh.map((line) => {
                        const litres =
                          line.litres_per_piece == null
                            ? null
                            : line.pieces * line.litres_per_piece;
                        return (
                          <tr key={line.item_code} className="border-b align-top">
                            <td className="px-2 py-1">
                              <p className="font-mono text-xs font-medium">
                                {line.item_code}
                              </p>
                              <p className="text-sm">{line.item_name}</p>
                              {line.source_lines.length > 1 && (
                                <p className="text-xs text-muted-foreground">
                                  rows {line.source_lines.join(', ')} added together
                                </p>
                              )}
                              {line.inactive_in_sap && (
                                <p className="text-xs text-amber-700">
                                  SAP has this item marked inactive
                                </p>
                              )}
                            </td>
                            <td className="px-2 py-1 text-right font-medium tabular-nums">
                              {unit === 'BOX' ? (
                                <>
                                  {line.pasted_qty} → {line.pieces.toLocaleString()}
                                </>
                              ) : (
                                line.pieces.toLocaleString()
                              )}
                            </td>
                            {/* An em dash, not 0 — SAP holds no volume for this
                                item, which is not the same as zero litres. */}
                            <td className="px-2 py-1 text-right tabular-nums">
                              {litres == null
                                ? '—'
                                : Number(litres.toFixed(3)).toLocaleString(undefined, {
                                    maximumFractionDigits: 3,
                                  })}
                            </td>
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {duplicates.length > 0 && (
                <div className="rounded-md border border-dashed p-3 text-xs">
                  <p className="font-medium">Already on this movement — left alone</p>
                  <p className="mt-1 text-muted-foreground">
                    {duplicates.map((line) => line.item_code).join(', ')}. Edit their
                    quantities on the form if the paste is the newer figure.
                  </p>
                </div>
              )}

              {problems > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
                  <p className="flex items-center gap-2 text-xs font-medium text-amber-900">
                    <AlertTriangle className="h-3 w-3" />
                    These rows were not added
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-900">
                    {result.unresolved.map((row) => (
                      <li key={`u-${row.item_code}`}>
                        <span className="font-mono">{row.item_code}</span> (qty {row.qty},
                        row{row.lines.length === 1 ? '' : 's'} {row.lines.join(', ')}) —{' '}
                        {row.reason}
                      </li>
                    ))}
                    {result.skipped.map((row) => (
                      <li key={`s-${row.line}`}>
                        Row {row.line} — {row.reason}
                        {row.text && (
                          <span className="text-amber-800/70"> [{row.text}]</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-amber-900/80">
                    Add the rest, then enter these by hand.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!fresh.length || parse.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Add {fresh.length || ''} item{fresh.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
