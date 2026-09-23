/**
 * The sheet the job was costed from: a material per row, qty × rate = amount,
 * and a total at the bottom.
 *
 * Shaped like the spreadsheet it replaces, because that is what people have in
 * front of them — Sr. No., material, qty, unit, rate, amount. Deliberately a
 * table and not a form: rows are added, renumbered and deleted freely and the
 * whole thing saves once.
 *
 * **The breakdown is the estimate.** When any row exists the project's
 * estimated cost is this total, not a figure typed beside it — two numbers that
 * are meant to agree eventually will not, and then nobody can say which one was
 * sanctioned.
 */
import { Plus, Table2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useEstimate, useSaveEstimate } from '../api';
import type { EstimateLinePayload } from '../types';
import { formatMoney } from '../utils';

/** What construction actually quotes in, offered as a datalist not a master. */
const UNITS = ['BAG', 'CFT', 'SFT', 'RFT', 'CUM', 'SQM', 'NOS', 'KG', 'MT', 'LTR', 'DAY'];

type Row = {
  key: string;
  line_no: number;
  material: string;
  quantity: string;
  unit: string;
  rate: string;
};

function blankRow(lineNo: number): Row {
  return {
    key: Math.random().toString(36).slice(2),
    line_no: lineNo,
    material: '',
    quantity: '',
    unit: '',
    rate: '',
  };
}

function rowAmount(row: Row): number {
  const amount = Number(row.quantity || 0) * Number(row.rate || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function EstimateSheetDialog({
  projectId,
  open,
  onOpenChange,
  canEdit,
  staged,
  onStagedChange,
}: {
  /** null while the project is still being typed and has no id yet. */
  projectId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  /**
   * The lines held for a project that does not exist yet. Given these, the
   * sheet saves nowhere and hands them back instead -- the same arrangement
   * `AttachmentsPanel` uses, because the estimate is usually written before
   * anybody presses Create.
   */
  staged?: EstimateLinePayload[];
  onStagedChange?: (lines: EstimateLinePayload[]) => void;
}) {
  const isStaged = projectId === null;
  const { data: estimate } = useEstimate(projectId ?? 0, open && !isStaged);
  const save = useSaveEstimate(projectId ?? 0);
  const [rows, setRows] = useState<Row[]>([]);

  // Load the saved sheet as the dialog opens, and again if a different sheet
  // arrives. During render rather than in an effect, so the table is never
  // briefly empty over real rows.
  const source = isStaged ? staged : estimate?.lines;
  const loadedKey = isStaged
    ? `${open}:staged:${staged?.length ?? -1}`
    : `${open}:${estimate?.lines.length ?? -1}:${estimate?.total ?? ''}`;
  const [seenKey, setSeenKey] = useState<string | null>(null);
  if (open && source && loadedKey !== seenKey) {
    setSeenKey(loadedKey);
    setRows(
      source.length > 0
        ? source.map((line, index) => ({
            key: `${'id' in line ? line.id : 'staged'}-${index}`,
            line_no: line.line_no ?? index + 1,
            material: line.material,
            quantity: line.quantity ?? '',
            unit: line.unit ?? '',
            rate: line.rate ?? '',
          }))
        : [blankRow(1)],
    );
  }

  // A project that does not exist yet cannot have been approved, so its sheet
  // is always open for writing.
  const editable = canEdit && (isStaged || (estimate?.is_editable ?? false));
  const total = rows.reduce((sum, row) => sum + rowAmount(row), 0);
  const filled = rows.filter((row) => row.material.trim());

  function update(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [...current, blankRow(current.length + 1)]);
  }

  /**
   * Paste a block straight out of the spreadsheet. Tab-separated columns in the
   * sheet's own order, one row per line — which is exactly what the clipboard
   * holds after selecting cells in Excel or Sheets.
   */
  function pasteBlock(text: string, atKey: string) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2 && !text.includes('\t')) return false;

    const parsed = lines.map((line) => line.split('\t').map((cell) => cell.trim()));
    setRows((current) => {
      const index = current.findIndex((row) => row.key === atKey);
      const head = current.slice(0, Math.max(index, 0));
      const added = parsed.map((cells, offset) => ({
        ...blankRow(head.length + offset + 1),
        material: cells[0] ?? '',
        quantity: cells[1] ?? '',
        unit: cells[2] ?? '',
        rate: cells[3] ?? '',
      }));
      return [...head, ...added].map((row, position) => ({
        ...row,
        line_no: position + 1,
      }));
    });
    return true;
  }

  async function submit() {
    const lines: EstimateLinePayload[] = filled.map((row, index) => ({
      line_no: index + 1,
      material: row.material.trim(),
      quantity: row.quantity || '0',
      unit: row.unit.trim(),
      rate: row.rate || '0',
    }));

    if (isStaged) {
      onStagedChange?.(lines);
      onOpenChange(false);
      return;
    }

    try {
      await save.mutateAsync(lines);
      toast.success(
        filled.length === 0
          ? 'Breakdown cleared'
          : `Estimate saved — ${formatMoney(String(total))}`,
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the estimate.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5" />
            Estimate in detail
          </DialogTitle>
          <DialogDescription>
            {editable
              ? 'A material per row. The total below becomes the project’s estimated cost. You can paste a block straight from a spreadsheet.'
              : 'This project has been approved, so its estimate is fixed. More budget goes through a revision.'}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-2 overflow-auto px-2">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="w-12 pb-2 font-medium">Sr.</th>
                <th className="pb-2 font-medium">Material</th>
                <th className="w-24 pb-2 text-right font-medium">Qty</th>
                <th className="w-24 pb-2 font-medium">Unit</th>
                <th className="w-28 pb-2 text-right font-medium">Rate</th>
                <th className="w-32 pb-2 text-right font-medium">Amount</th>
                {editable && <th className="w-8 pb-2" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key} className="border-b last:border-0">
                  <td className="py-1 text-muted-foreground tabular-nums">{index + 1}</td>
                  <td className="py-1 pr-1">
                    <Input
                      value={row.material}
                      onChange={(event) => update(row.key, { material: event.target.value })}
                      onPaste={(event) => {
                        const text = event.clipboardData.getData('text/plain');
                        if (pasteBlock(text, row.key)) event.preventDefault();
                      }}
                      placeholder="CEMENT"
                      disabled={!editable}
                      className="h-9 border-0 shadow-none focus-visible:ring-1"
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.001"
                      value={row.quantity}
                      onChange={(event) => update(row.key, { quantity: event.target.value })}
                      disabled={!editable}
                      className="h-9 border-0 text-right shadow-none focus-visible:ring-1"
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <Input
                      list="construction-units"
                      value={row.unit}
                      onChange={(event) =>
                        update(row.key, { unit: event.target.value.toUpperCase() })
                      }
                      placeholder="BAG"
                      disabled={!editable}
                      className="h-9 border-0 shadow-none focus-visible:ring-1"
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={row.rate}
                      onChange={(event) => update(row.key, { rate: event.target.value })}
                      disabled={!editable}
                      className="h-9 border-0 text-right shadow-none focus-visible:ring-1"
                    />
                  </td>
                  <td className="py-1 pr-1 text-right font-medium tabular-nums">
                    {rowAmount(row) > 0 ? formatMoney(String(rowAmount(row))) : '—'}
                  </td>
                  {editable && (
                    <td className="py-1">
                      <button
                        type="button"
                        aria-label={`Remove row ${index + 1}`}
                        className="text-muted-foreground hover:text-rose-600"
                        onClick={() =>
                          setRows((current) =>
                            current.length === 1
                              ? [blankRow(1)]
                              : current.filter((item) => item.key !== row.key),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <datalist id="construction-units">
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>

          {editable && (
            <Button type="button" variant="outline" className="mt-2 w-full" onClick={addRow}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add a row
            </Button>
          )}
        </div>

        <div className="flex items-baseline justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">
            {filled.length} material{filled.length === 1 ? '' : 's'}
          </span>
          <span className="text-right">
            <span className="block text-xs text-muted-foreground">Estimated cost</span>
            <span className={cn('text-2xl font-semibold tabular-nums')}>
              {formatMoney(String(total))}
            </span>
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {editable ? 'Cancel' : 'Close'}
          </Button>
          {editable && (
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save estimate'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
