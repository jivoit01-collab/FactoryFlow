import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';

import type { BomKind, LineType } from '../api/bom-changes.api';
import { blankLine, COMMENT_LIMIT, ISSUE_METHODS, type LineDraft } from '../utils/requestDraft';
import { SapCodePicker } from './SapCodePicker';
import { WarehouseSelect } from './WarehouseSelect';

function money(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * The components of the tree being asked for, one row each, in the order SAP
 * will list them. A row is an item (searched in the item master) or a resource
 * (a machine or labour cost, searched in SAP's resources); switching the type
 * clears the code, as the portal did.
 *
 * Price and comment go to SAP only on a new BOM — the portal's change left
 * them out, and so does this one — so they are editable only then.
 */
export function ComponentsEditor({
  kind,
  lines,
  onChange,
}: {
  kind: BomKind;
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
}) {
  const setLine = (index: number, patch: Partial<LineDraft>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= lines.length) return;
    const next = [...lines];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const remove = (index: number) => {
    const next = lines.filter((_, i) => i !== index);
    onChange(next.length ? next : [blankLine()]);
  };
  const isNew = kind === 'CREATE';
  const total = lines.reduce((sum, line) => {
    const cost = Number(line.unit_cost) * Number(line.quantity);
    return line.item_code && Number.isFinite(cost) ? sum + cost : sum;
  }, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="w-10 px-2 py-2 text-left font-medium">#</th>
              <th className="w-28 px-2 py-2 text-left font-medium">Type</th>
              <th className="min-w-[220px] px-2 py-2 text-left font-medium">Code</th>
              <th className="px-2 py-2 text-left font-medium">Name</th>
              <th className="w-28 px-2 py-2 text-right font-medium">Quantity</th>
              <th className="w-32 px-2 py-2 text-left font-medium">Warehouse</th>
              <th className="w-32 px-2 py-2 text-left font-medium">Issue</th>
              {isNew && <th className="w-28 px-2 py-2 text-right font-medium">Unit cost</th>}
              {isNew && <th className="w-48 px-2 py-2 text-left font-medium">Comment</th>}
              <th className="w-28 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.key} className="border-t align-top">
                <td className="px-2 py-2 text-muted-foreground tabular-nums">{index + 1}</td>
                <td className="px-2 py-1.5">
                  <NativeSelect
                    aria-label={`Type of line ${index + 1}`}
                    value={line.item_type}
                    onChange={(e) =>
                      setLine(index, {
                        item_type: e.target.value as LineType,
                        item_code: '',
                        item_name: '',
                        uom: '',
                        unit_cost: '0',
                      })
                    }
                    className="h-8"
                  >
                    <SelectOption value="item">Item</SelectOption>
                    <SelectOption value="resource">Resource</SelectOption>
                  </NativeSelect>
                </td>
                <td className="px-2 py-1.5">
                  <SapCodePicker
                    key={`${line.key}-${line.item_type}`}
                    kind={line.item_type}
                    inputId={`bom-line-${line.key}`}
                    value={line.item_code}
                    onSelect={(picked) =>
                      setLine(index, {
                        item_code: picked.code,
                        item_name: picked.name,
                        uom: picked.uom,
                        unit_cost: line.item_type === 'item' ? String(picked.price || 0) : '0',
                      })
                    }
                    onClear={() =>
                      setLine(index, { item_code: '', item_name: '', uom: '', unit_cost: '0' })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <span className="line-clamp-2">
                    {line.item_name || <span className="text-muted-foreground">—</span>}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <Input
                      inputMode="decimal"
                      aria-label={`Quantity of line ${index + 1}`}
                      value={line.quantity}
                      onChange={(e) => setLine(index, { quantity: e.target.value })}
                      className="h-8 text-right tabular-nums"
                    />
                    {line.uom && <span className="text-xs text-muted-foreground">{line.uom}</span>}
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <WarehouseSelect
                    compact
                    ariaLabel={`Warehouse of line ${index + 1}`}
                    value={line.warehouse}
                    emptyLabel="BOM's"
                    onChange={(code) => setLine(index, { warehouse: code })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <NativeSelect
                    aria-label={`Issue method of line ${index + 1}`}
                    value={line.issue_method}
                    onChange={(e) =>
                      setLine(index, { issue_method: e.target.value as LineDraft['issue_method'] })
                    }
                    className="h-8"
                  >
                    {ISSUE_METHODS.map((method) => (
                      <SelectOption key={method} value={method}>
                        {method}
                      </SelectOption>
                    ))}
                  </NativeSelect>
                </td>
                {isNew && (
                  <td className="px-2 py-1.5">
                    <Input
                      inputMode="decimal"
                      aria-label={`Unit cost of line ${index + 1}`}
                      value={line.unit_cost}
                      disabled={line.item_type === 'resource'}
                      onChange={(e) => setLine(index, { unit_cost: e.target.value })}
                      className="h-8 text-right tabular-nums"
                    />
                  </td>
                )}
                {isNew && (
                  <td className="px-2 py-1.5">
                    <Input
                      aria-label={`Comment of line ${index + 1}`}
                      value={line.comment}
                      maxLength={COMMENT_LIMIT}
                      onChange={(e) => setLine(index, { comment: e.target.value })}
                      className="h-8"
                    />
                  </td>
                )}
                <td className="px-2 py-1.5">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Move line ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Move line ${index + 1} down`}
                      disabled={index === lines.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove line ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...lines, blankLine('item')])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add item
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...lines, blankLine('resource')])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add resource
          </Button>
        </div>
        {isNew && (
          <span className="text-sm text-muted-foreground">
            Total cost{' '}
            <span className="font-semibold tabular-nums text-foreground">INR {money(total)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
