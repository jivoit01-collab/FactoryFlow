import { ArrowLeft, Boxes, Loader2, Trash2, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { SearchableSelect } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  type CreateDismantlePayload,
  type DismantlableStockRow,
  type DismantleReturnedLine,
  useCreateDismantles,
  useDismantlableStock,
  useDismantleBatches,
  useDismantleReturnedLines,
  useDismantleWarehouses,
} from '../api';
import { formatQty } from '../utils';

type SourceTab = 'RETURN' | 'STOCK';

/** One item staged for disassembly, before the basket is sent. */
interface StagedRow {
  /** Stable within the basket: the source plus the item is what makes a row. */
  key: string;
  itemCode: string;
  itemName: string;
  warehouseCode: string;
  batchNumber: string;
  isBatchManaged: boolean;
  quantity: string;
  /** What the source says is there — shown, and checked before sending. */
  available: number | null;
  goodsReturnItemId?: number;
  returnEntryNo?: string;
}

/**
 * Starting a disassembly, from either of its two sources.
 *
 * Items are picked one at a time into a basket at the bottom and sent together.
 * The basket is a convenience for the floor, not a document: SAP has no
 * multi-item disassembly — an order names one parent item — so a basket of five
 * becomes five records, each with its own three SAP documents later.
 *
 * **From a return** is the normal way in: the line already knows its warehouse,
 * its quantity and the batch the returns module minted when it posted, so
 * nothing is re-keyed and the record stays linked to the return — a link SAP
 * itself cannot hold.
 *
 * **From stock** covers what the first cannot: returns the accounts team keyed
 * straight into SAP, and anything else in a warehouse that has to come apart.
 */
export default function DismantleNewPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<SourceTab>('RETURN');
  const createMany = useCreateDismantles();

  async function send(rows: StagedRow[], source: 'GOODS_RETURN' | 'STOCK') {
    const payload: CreateDismantlePayload[] = rows.map((row) =>
      source === 'GOODS_RETURN'
        ? {
            source,
            goods_return_item_id: row.goodsReturnItemId,
            quantity: row.quantity,
          }
        : {
            source,
            warehouse_code: row.warehouseCode,
            item_code: row.itemCode,
            batch_number: row.batchNumber,
            quantity: row.quantity,
          },
    );
    try {
      const created = await createMany.mutateAsync(payload);
      toast.success(
        created.length === 1
          ? `${created[0].entry_no} started`
          : `${created.length} disassemblies started`,
      );
      // Straight to the one record when there is only one; otherwise the list,
      // where the whole basket is visible at once.
      navigate(
        created.length === 1 ? `/returns/disassembly/${created[0].id}` : '/returns/disassembly',
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not start the disassembly.'));
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/returns/disassembly')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold">New Disassembly</h2>
          <p className="text-sm text-muted-foreground">
            Add everything being taken apart, then start them together. Quantities are in
            pieces, not boxes.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'RETURN' ? 'default' : 'outline'} onClick={() => setTab('RETURN')}>
          <Undo2 className="mr-2 h-4 w-4" />
          From a return
        </Button>
        <Button variant={tab === 'STOCK' ? 'default' : 'outline'} onClick={() => setTab('STOCK')}>
          <Boxes className="mr-2 h-4 w-4" />
          From warehouse stock
        </Button>
      </div>

      {tab === 'RETURN' ? (
        <FromReturn onSend={(rows) => send(rows, 'GOODS_RETURN')} busy={createMany.isPending} />
      ) : (
        <FromStock onSend={(rows) => send(rows, 'STOCK')} busy={createMany.isPending} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* From a return                                                              */
/* -------------------------------------------------------------------------- */

function FromReturn({ onSend, busy }: { onSend: (rows: StagedRow[]) => void; busy: boolean }) {
  const [search, setSearch] = useState('');
  const { data: lines = [], isLoading, isError } = useDismantleReturnedLines(search);
  const [rows, setRows] = useState<StagedRow[]>([]);

  const staged = useMemo(() => new Set(rows.map((row) => row.key)), [rows]);
  // Already in the basket is not "still waiting", so it drops out of the picker
  // rather than letting the same pieces be claimed twice.
  const offered = lines.filter((line) => !staged.has(returnKey(line)));

  function add(line: DismantleReturnedLine) {
    setRows((previous) => [
      ...previous,
      {
        key: returnKey(line),
        itemCode: line.item_code,
        itemName: line.item_name,
        warehouseCode: line.warehouse_code,
        batchNumber: line.batch_number,
        isBatchManaged: true,
        // The whole of what is left is the usual answer; a part-disassembly is
        // the exception, so it starts filled in rather than blank.
        quantity: String(Number(line.remaining_quantity)),
        // The lower of the two: the app's arithmetic says how much of the line
        // is unclaimed, SAP says how much is actually there, and a disassembly
        // needs both to be true.
        available:
          line.sap_quantity === null
            ? Number(line.remaining_quantity)
            : Math.min(Number(line.remaining_quantity), Number(line.sap_quantity)),
        goodsReturnItemId: line.goods_return_item_id,
        returnEntryNo: line.entry_no,
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <SearchableSelect<DismantleReturnedLine>
        inputId="returned-line"
        label="Returned line"
        placeholder="Search a return number, customer or item…"
        items={offered}
        isLoading={isLoading}
        isError={isError}
        value=""
        getItemKey={returnKey}
        getItemLabel={(line) => `${line.item_code} — ${line.item_name}`}
        renderItem={(line) => (
          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-medium">
                {line.item_code} — {line.item_name}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {line.entry_no} · {line.customer_name} · batch {line.batch_number}
              </div>
            </div>
            <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {formatQty(line.remaining_quantity)} left
              {line.sap_quantity !== null &&
                Number(line.sap_quantity) !== Number(line.remaining_quantity) && (
                  <div className="text-amber-600">
                    {formatQty(line.sap_quantity)} in SAP
                  </div>
                )}
            </span>
          </div>
        )}
        filterFn={(line, term) =>
          [line.item_code, line.item_name, line.entry_no, line.customer_name]
            .join(' ')
            .toLowerCase()
            .includes(term.toLowerCase())
        }
        onSearchChange={setSearch}
        onItemSelect={add}
        onClear={() => undefined}
        loadingText="Loading returned stock…"
        emptyText="No returned stock is waiting. For a return keyed straight into SAP, use “From warehouse stock”."
        notFoundText="No returned line matches that."
        errorText="Could not load returned stock."
      />

      <Basket
        rows={rows}
        onChange={setRows}
        onSend={onSend}
        busy={busy}
        showBatchPicker={false}
        emptyText="Nothing added yet. Pick a returned line above."
      />
    </div>
  );
}

function returnKey(line: DismantleReturnedLine) {
  return `return:${line.goods_return_item_id}`;
}

/* -------------------------------------------------------------------------- */
/* From warehouse stock                                                       */
/* -------------------------------------------------------------------------- */

function FromStock({ onSend, busy }: { onSend: (rows: StagedRow[]) => void; busy: boolean }) {
  const { data: warehouses = [] } = useDismantleWarehouses();
  const [chosenWarehouse, setChosenWarehouse] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<StagedRow[]>([]);

  // Derived, not stored: the returns warehouse is where this is nearly always
  // done, so the first one stands in until the operator picks another.
  const warehouse = chosenWarehouse || warehouses[0]?.warehouse_code || '';
  const { data: stock = [], isLoading, isError } = useDismantlableStock(warehouse, search);

  function pickWarehouse(code: string) {
    setChosenWarehouse(code);
    // The basket is per warehouse: a disassembly order names one, and rows
    // carried over from another would claim stock that is not there.
    setRows([]);
  }

  function add(row: DismantlableStockRow) {
    const key = `stock:${warehouse}:${row.item_code}`;
    if (rows.some((existing) => existing.key === key)) {
      toast.info(`${row.item_code} is already in the list.`);
      return;
    }
    setRows((previous) => [
      ...previous,
      {
        key,
        itemCode: row.item_code,
        itemName: row.item_name,
        warehouseCode: warehouse,
        batchNumber: '',
        isBatchManaged: row.is_batch_managed,
        quantity: '',
        available: row.on_hand,
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[260px_1fr]">
        <div>
          <Label htmlFor="warehouse">Warehouse</Label>
          <NativeSelect
            id="warehouse"
            value={warehouse}
            onChange={(event) => pickWarehouse(event.target.value)}
          >
            <SelectOption value="">Select…</SelectOption>
            {warehouses.map((row) => (
              <SelectOption key={row.warehouse_code} value={row.warehouse_code}>
                {row.warehouse_code} — {row.warehouse_name}
                {row.is_return_warehouse ? ' (returns)' : ''}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <SearchableSelect<DismantlableStockRow>
          inputId="stock-item"
          label="Item"
          placeholder={warehouse ? 'Item code or name…' : 'Pick a warehouse first'}
          disabled={!warehouse}
          items={stock}
          isLoading={isLoading}
          isError={isError}
          value=""
          getItemKey={(row) => row.item_code}
          getItemLabel={(row) => `${row.item_code} — ${row.item_name}`}
          renderItem={(row) => (
            <div className="flex w-full items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {row.item_code} — {row.item_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatQty(row.pieces_per_box)} per box
                  {row.bom_batch_size !== null && row.bom_batch_size !== row.pieces_per_box
                    ? ` · recipe batch ${formatQty(row.bom_batch_size)}`
                    : ''}
                </div>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatQty(row.on_hand)} on hand
              </span>
            </div>
          )}
          filterFn={(row, term) =>
            `${row.item_code} ${row.item_name}`.toLowerCase().includes(term.toLowerCase())
          }
          onSearchChange={setSearch}
          onItemSelect={add}
          onClear={() => undefined}
          loadingText="Loading stock…"
          emptyText="Nothing in this warehouse has a production BOM in SAP, so there is nothing here that can be taken apart."
          notFoundText="No item matches that."
          errorText="Could not load warehouse stock."
        />
      </div>

      <Basket
        rows={rows}
        onChange={setRows}
        onSend={onSend}
        busy={busy}
        showBatchPicker
        emptyText="Nothing added yet. Search for an item above."
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The basket                                                                 */
/* -------------------------------------------------------------------------- */

function Basket({
  rows,
  onChange,
  onSend,
  busy,
  showBatchPicker,
  emptyText,
}: {
  rows: StagedRow[];
  onChange: (rows: StagedRow[]) => void;
  onSend: (rows: StagedRow[]) => void;
  busy: boolean;
  showBatchPicker: boolean;
  emptyText: string;
}) {
  function patch(key: string, change: Partial<StagedRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
  }

  const incomplete = rows.some(
    (row) =>
      !Number(row.quantity) ||
      (row.isBatchManaged && !row.batchNumber) ||
      (row.available !== null && Number(row.quantity) > row.available),
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          To be taken apart{rows.length ? ` (${rows.length})` : ''}
        </h3>
        {rows.length > 0 && (
          <Button disabled={busy || incomplete} onClick={() => onSend(rows)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {rows.length === 1 ? 'Start disassembly' : `Start ${rows.length} disassemblies`}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">{emptyText}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="w-40 px-4 py-3 text-right">Pieces</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <BasketRow
                    key={row.key}
                    row={row}
                    showBatchPicker={showBatchPicker}
                    onPatch={(change) => patch(row.key, change)}
                    onRemove={() => onChange(rows.filter((other) => other.key !== row.key))}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Each line becomes its own disassembly — SAP’s order names one item, so five items are
          five records. They are created together or not at all.
        </p>
      )}
    </section>
  );
}

function BasketRow({
  row,
  showBatchPicker,
  onPatch,
  onRemove,
}: {
  row: StagedRow;
  showBatchPicker: boolean;
  onPatch: (change: Partial<StagedRow>) => void;
  onRemove: () => void;
}) {
  // Only the stock source has to choose; a returned line brings its own batch.
  const needsBatch = showBatchPicker && row.isBatchManaged;
  const { data: batches = [] } = useDismantleBatches(
    needsBatch ? row.itemCode : '',
    needsBatch ? row.warehouseCode : '',
  );

  const chosen = batches.find((batch) => batch.batch_number === row.batchNumber) ?? null;
  const available = chosen ? Number(chosen.quantity) : row.available;
  const over = available !== null && Number(row.quantity) > available;

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3">
        <div className="font-medium">{row.itemCode}</div>
        <div className="text-xs text-muted-foreground">{row.itemName}</div>
        {row.returnEntryNo && (
          <div className="text-xs text-muted-foreground">from {row.returnEntryNo}</div>
        )}
      </td>
      <td className="px-4 py-3">
        {needsBatch ? (
          <NativeSelect
            aria-label={`Batch for ${row.itemCode}`}
            value={row.batchNumber}
            onChange={(event) => {
              const picked = batches.find((b) => b.batch_number === event.target.value);
              onPatch({
                batchNumber: event.target.value,
                available: picked ? Number(picked.quantity) : row.available,
                quantity: picked ? String(Number(picked.quantity)) : row.quantity,
              });
            }}
          >
            <SelectOption value="">Select…</SelectOption>
            {batches.map((batch) => (
              <SelectOption key={batch.batch_number} value={batch.batch_number}>
                {batch.batch_number} ({formatQty(batch.quantity)})
              </SelectOption>
            ))}
          </NativeSelect>
        ) : (
          <span className="text-xs">{row.batchNumber || '—'}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
        {available === null ? '—' : formatQty(available)}
      </td>
      <td className="px-4 py-3 text-right">
        <Input
          type="number"
          min="0"
          step="any"
          aria-label={`Pieces of ${row.itemCode}`}
          className={cn('h-9 text-right', over && 'border-rose-500')}
          value={row.quantity}
          onChange={(event) => onPatch({ quantity: event.target.value })}
        />
        {over && <p className="mt-1 text-xs text-rose-600">More than is there</p>}
      </td>
      <td className="px-4 py-3 text-right">
        <Button variant="ghost" size="sm" aria-label={`Remove ${row.itemCode}`} onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </td>
    </tr>
  );
}
