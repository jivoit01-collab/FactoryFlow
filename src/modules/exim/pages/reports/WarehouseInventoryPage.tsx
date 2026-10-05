/**
 * Warehouse Inventory: the oil in SAP's warehouses, in litres, by category, raw
 * material and finished goods apart. EXIM's Warehouse Inventory, read for the
 * selected company.
 *
 * EXIM opened on one warehouse and offered nine; here every warehouse holding
 * oil is offered and EXIM's nine are picked to start. The pick lives in the
 * URL. Open a warehouse to see its items, each with what SAP holds and the
 * litres that come to.
 *
 * A negative balance is SAP's own, stock issued before it was received. EXIM
 * made every balance positive, which hid the fault and swelled the total; here
 * it stays negative and is flagged, so the store can put it right.
 */
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Droplets,
  FileDown,
  Layers,
  RefreshCw,
  Search,
  Trophy,
  Warehouse,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  EmptyPanel,
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button, Input } from '@/shared/components/ui';
import { cn, formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useRefreshWarehouseInventory, useWarehouseInventory, useWarehouseItems } from '../../api';
import { exportWarehouseInventory } from '../../components/reports/inventoryExcel';
import type { InventoryKind, InventoryWarehouse } from '../../types';
import { fmtLitres, fmtQty, LITRES_PER_KG } from '../../utils';

const KIND_LABEL: Record<InventoryKind, string> = { RM: 'Raw material', FG: 'Finished goods' };

function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
}

function share(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

/** Litres with the sign kept, red when below zero. */
function Litres({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums',
        value < 0 && 'font-medium text-rose-600 dark:text-rose-400',
        className,
      )}
    >
      {fmtLitres(value)}
    </span>
  );
}

function KindTag({ kind }: { kind: InventoryKind }) {
  return (
    <span
      title={KIND_LABEL[kind]}
      className="rounded border px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
    >
      {kind}
    </span>
  );
}

function ShareCell({ percent }: { percent: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block">
        <div
          className="h-full rounded-full bg-teal-500/70"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <span className="w-11 text-right text-xs tabular-nums text-muted-foreground">
        {percent.toFixed(1)}%
      </span>
    </div>
  );
}

/** One warehouse: its categories, their litres and share, and the items below zero. */
function WarehouseCard({
  w,
  open,
  onOpen,
}: {
  w: InventoryWarehouse;
  open: boolean;
  onOpen: () => void;
}) {
  const cell = 'px-3 py-2';
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm',
        open && 'ring-2 ring-primary/40',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        className="flex items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/60"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono font-semibold">{w.warehouse}</span>
            {w.kinds.map((kind) => (
              <KindTag key={kind} kind={kind} />
            ))}
          </span>
          {w.warehouse_name && (
            <span className="block truncate text-xs text-muted-foreground">{w.warehouse_name}</span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <Litres value={w.litres} className="block text-lg font-semibold" />
          <span className="block text-xs text-muted-foreground">litres</span>
        </span>
      </button>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th className={cell}>Category</Th>
              <Th align="right" className={cell}>
                Litres
              </Th>
              <Th align="right" className={cell}>
                Share
              </Th>
              <Th align="right" className={cell}>
                Items
              </Th>
            </tr>
          </thead>
          <tbody>
            {w.categories.map((c) => (
              <tr key={`${c.kind}-${c.category}`} className={ROW_CLASSES}>
                <td className={cn(cell, 'align-middle')}>
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {c.category}
                    {w.kinds.length > 1 && <KindTag kind={c.kind} />}
                  </span>
                </td>
                <td className={cn(cell, 'text-right')}>
                  <Litres value={c.litres} />
                </td>
                <td className={cell}>
                  <ShareCell percent={c.litres > 0 ? share(c.litres, w.litres) : 0} />
                </td>
                <td className={cn(cell, 'text-right tabular-nums')}>
                  {c.items}
                  {c.negative_items > 0 && (
                    <span
                      className="block whitespace-nowrap text-xs font-medium text-rose-600 dark:text-rose-400"
                      title="Items SAP shows below zero: issued before they were received"
                    >
                      {c.negative_items} below 0
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <td className={cell}>Total</td>
              <td className={cn(cell, 'text-right')}>
                <Litres value={w.litres} />
              </td>
              <td className={cn(cell, 'text-right text-xs text-muted-foreground')}>100%</td>
              <td className={cn(cell, 'text-right tabular-nums')}>
                {w.categories.reduce((sum, c) => sum + c.items, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5">
        {w.negative_items > 0 ? (
          <StatusPill tone="blocked" icon={AlertTriangle}>
            {plural(w.negative_items, 'item')} below zero
          </StatusPill>
        ) : (
          <span />
        )}
        <Button variant="ghost" size="sm" onClick={onOpen} aria-expanded={open}>
          {open ? 'Showing its items' : 'List its items'}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

const ITEM_COLUMNS = 5;

/** The open warehouse's items: what SAP holds of each, and the litres. */
function WarehouseItems({ w, onClose }: { w: InventoryWarehouse; onClose: () => void }) {
  const items = useWarehouseItems(w.warehouse);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = items.data ?? [];
    return term
      ? all.filter((item) =>
          [item.item_code, item.item_name, item.category].join(' ').toLowerCase().includes(term),
        )
      : all;
  }, [items.data, search]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);
  const litres = rows.reduce((sum, item) => sum + item.litres, 0);
  const below = rows.filter((item) => item.litres < 0).length;

  return (
    <TableCard
      summary={
        <span>
          <span className="font-mono font-semibold text-foreground">{w.warehouse}</span>
          {w.warehouse_name ? ` · ${w.warehouse_name}` : ''}
          {items.data
            ? ` · ${plural(rows.length, 'item')}${search ? ` of ${items.data.length}` : ''}${
                below ? ` · ${below} below zero` : ''
              }`
            : ''}
          {items.isFetching && !items.isLoading ? ' · refreshing…' : ''}
        </span>
      }
      actions={
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Item or category…"
              aria-label={`Search the items in ${w.warehouse}`}
              className="h-9 w-full pl-8 sm:w-56"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="mr-1 h-4 w-4" />
            Close
          </Button>
        </>
      }
    >
      <table className={TABLE_CLASSES}>
        <thead className={THEAD_CLASSES}>
          <tr>
            <Th>Item</Th>
            <Th>Category</Th>
            <Th>Kind</Th>
            <Th align="right">On hand</Th>
            <Th align="right">Litres</Th>
          </tr>
        </thead>
        <tbody>
          {items.isLoading ? (
            <TableLoading colSpan={ITEM_COLUMNS} message={`Reading ${w.warehouse} from SAP…`} />
          ) : items.isError ? (
            <TableEmpty
              colSpan={ITEM_COLUMNS}
              icon={AlertTriangle}
              message="The items could not be read"
              hint={getErrorMessage(items.error, 'SAP did not answer. Try Refresh in a moment.')}
            />
          ) : shown.length === 0 ? (
            <TableEmpty
              colSpan={ITEM_COLUMNS}
              icon={Droplets}
              message={search ? 'No item matches' : 'No oil in this warehouse'}
            />
          ) : (
            shown.map((item) => (
              <tr key={item.item_code} className={ROW_CLASSES}>
                <Td className="min-w-56">
                  <span className="block">{item.item_name || '—'}</span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {item.item_code}
                  </span>
                </Td>
                <Td className="whitespace-nowrap">{item.category}</Td>
                <Td>
                  <KindTag kind={item.kind} />
                </Td>
                <Td numeric className="whitespace-nowrap">
                  {item.on_hand.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                  {item.unit && (
                    <span className="ml-1 text-xs text-muted-foreground">{item.unit}</span>
                  )}
                </Td>
                <Td numeric>
                  <Litres value={item.litres} />
                  {item.litres < 0 && (
                    <StatusPill tone="blocked" className="ml-2 align-middle">
                      Below zero
                    </StatusPill>
                  )}
                </Td>
              </tr>
            ))
          )}
        </tbody>
        {items.data && rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <Td colSpan={4}>Total</Td>
              <Td numeric>
                <Litres value={litres} />
              </Td>
            </tr>
          </tfoot>
        )}
      </table>
      {rows.length > pageSize && (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={rows.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </TableCard>
  );
}

const CATEGORY_COLUMNS = 5;

export default function WarehouseInventoryPage() {
  const { data, isLoading, isFetching, isError, error } = useWarehouseInventory();
  const refresh = useRefreshWarehouseInventory();
  const [params, setParams] = useSearchParams();
  const itemsRef = useRef<HTMLDivElement>(null);

  const all = useMemo(() => (isError ? [] : (data?.warehouses ?? [])), [data, isError]);
  const defaults = useMemo(() => {
    const picked = data?.default_warehouses ?? [];
    // A company with none of EXIM's nine starts on everything it has.
    return picked.length ? picked : all.map((w) => w.warehouse);
  }, [data, all]);

  const whParam = params.get('wh');
  const selected = useMemo(() => {
    const chosen = whParam === null ? defaults : whParam.split(',').map((code) => code.trim());
    const wanted = new Set(chosen.filter(Boolean));
    // In the order SAP's list gives, whatever order the URL names them in.
    return all.filter((w) => wanted.has(w.warehouse));
  }, [whParam, defaults, all]);
  const selectedCodes = new Set(selected.map((w) => w.warehouse));

  const openCode = params.get('open') ?? '';
  const openWarehouse = selected.find((w) => w.warehouse === openCode);
  const openItems = useWarehouseItems(openWarehouse ? openCode : '');

  function writeParams(update: (next: URLSearchParams) => void) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        update(next);
        return next;
      },
      { replace: true },
    );
  }

  function choose(codes: string[]) {
    const isDefault =
      codes.length === defaults.length && codes.every((code) => defaults.includes(code));
    writeParams((next) => {
      if (isDefault) next.delete('wh');
      else next.set('wh', codes.join(','));
      if (openCode && !codes.includes(openCode)) next.delete('open');
    });
  }

  function toggle(code: string) {
    const codes = selected.map((w) => w.warehouse);
    choose(codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code]);
  }

  function openItemsOf(code: string) {
    writeParams((next) => {
      if (openCode === code) next.delete('open');
      else next.set('open', code);
    });
  }

  // Bring the item list into view when a warehouse is opened (not on a refresh).
  const hasOpen = !!openWarehouse;
  useEffect(() => {
    if (hasOpen) itemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [openCode, hasOpen]);

  const insight = useMemo(() => {
    const total = selected.reduce((sum, w) => sum + w.litres, 0);
    const holding = selected.filter((w) => w.litres > 0).length;
    const negative = selected.reduce((sum, w) => sum + w.negative_items, 0);
    const topWarehouse = selected.reduce<InventoryWarehouse | null>(
      (top, w) => (!top || w.litres > top.litres ? w : top),
      null,
    );
    const byCategory = new Map<
      string,
      {
        kind: InventoryKind;
        category: string;
        litres: number;
        warehouses: number;
        negative: number;
      }
    >();
    for (const w of selected)
      for (const c of w.categories) {
        const key = `${c.kind}|${c.category}`;
        const row = byCategory.get(key) ?? {
          kind: c.kind,
          category: c.category,
          litres: 0,
          warehouses: 0,
          negative: 0,
        };
        row.litres += c.litres;
        row.warehouses += 1;
        row.negative += c.negative_items;
        byCategory.set(key, row);
      }
    const categories = [...byCategory.values()].sort((a, b) => b.litres - a.litres);
    // The top category is the oil, whichever form it is in.
    const byName = new Map<string, number>();
    for (const c of categories) byName.set(c.category, (byName.get(c.category) ?? 0) + c.litres);
    const topCategory = [...byName.entries()].sort((a, b) => b[1] - a[1])[0];
    return { total, holding, negative, topWarehouse, categories, topCategory };
  }, [selected]);

  function readAgain() {
    refresh.mutate(undefined, {
      onError: (err) => toast.error(getErrorMessage(err, 'SAP did not answer. Try again shortly.')),
    });
  }

  function download() {
    exportWarehouseInventory(
      selected,
      openWarehouse && openItems.data ? { warehouse: openCode, items: openItems.data } : undefined,
    );
    toast.success('Warehouse Inventory downloading');
  }

  const ready = !!data && !isError;
  const busy = isFetching || refresh.isPending;
  const dash = '—';
  const tonnes = insight.total / LITRES_PER_KG / 1000;

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouse Inventory" icon={Warehouse} accent="teal">
        <Button variant="outline" onClick={download} disabled={!ready || selected.length === 0}>
          <FileDown className="mr-1.5 h-4 w-4" />
          Download Excel
        </Button>
        <Button variant="outline" onClick={readAgain} disabled={busy}>
          <RefreshCw className={cn('mr-1.5 h-4 w-4', busy && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      {isLoading ? (
        <EmptyPanel loading message="Reading the warehouses from SAP…" />
      ) : isError ? (
        <EmptyPanel
          icon={AlertTriangle}
          message="The stock could not be read"
          hint={getErrorMessage(error, 'SAP did not answer. Try Refresh in a moment.')}
          action={
            <Button variant="outline" onClick={readAgain} disabled={busy}>
              <RefreshCw className={cn('mr-1.5 h-4 w-4', busy && 'animate-spin')} />
              Try again
            </Button>
          }
        />
      ) : !data || all.length === 0 ? (
        <EmptyPanel
          icon={Droplets}
          message="SAP shows no oil in any warehouse"
          hint="Nothing kept in litres has stock anywhere in this company."
        />
      ) : (
        <>
          <section className="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {plural(selected.length, 'warehouse')} of {all.length} · read{' '}
                {formatDateTimeShort(data.read_at)}
                {busy ? ' · refreshing…' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => choose(defaults)}>
                  {data.default_warehouses.length ? "EXIM's warehouses" : 'Reset'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => choose(all.map((w) => w.warehouse))}
                >
                  All
                </Button>
                <Button variant="ghost" size="sm" onClick={() => choose([])}>
                  None
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Warehouses">
              {all.map((w) => {
                const on = selectedCodes.has(w.warehouse);
                return (
                  <button
                    key={w.warehouse}
                    type="button"
                    aria-pressed={on}
                    title={w.warehouse_name || undefined}
                    onClick={() => toggle(w.warehouse)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-medium transition-colors',
                      on
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                    )}
                  >
                    {w.warehouse}
                    {w.negative_items > 0 && (
                      <AlertTriangle
                        className={cn('h-3 w-3', on ? 'text-primary-foreground' : 'text-rose-500')}
                        aria-label="Has items below zero"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <StatTileRow>
            <StatTile
              label="Total"
              value={ready && selected.length ? `${fmtLitres(insight.total)} L` : dash}
              sub={
                selected.length
                  ? `about ${fmtQty(tonnes)} MT · ${plural(selected.length, 'warehouse')}`
                  : 'no warehouse picked'
              }
              icon={Droplets}
              accent="teal"
            />
            <StatTile
              label="Warehouses holding oil"
              value={selected.length ? insight.holding : dash}
              sub={`of ${selected.length} picked`}
              icon={Building2}
              accent="sky"
            />
            <StatTile
              label="Top warehouse"
              value={insight.topWarehouse?.warehouse ?? dash}
              sub={
                insight.topWarehouse
                  ? `${fmtLitres(insight.topWarehouse.litres)} L · ${share(
                      insight.topWarehouse.litres,
                      insight.total,
                    ).toFixed(1)}%`
                  : undefined
              }
              icon={Trophy}
              accent="violet"
            />
            <StatTile
              label="Top category"
              value={insight.topCategory?.[0] ?? dash}
              sub={insight.topCategory ? `${fmtLitres(insight.topCategory[1])} L` : undefined}
              icon={Layers}
              accent="amber"
            />
            <StatTile
              label="Below zero"
              value={selected.length ? insight.negative : dash}
              sub="items issued before received"
              icon={AlertTriangle}
              accent={insight.negative > 0 ? 'rose' : 'slate'}
            />
          </StatTileRow>

          {selected.length === 0 ? (
            <EmptyPanel
              icon={Warehouse}
              message="No warehouse picked"
              hint="Pick one or more warehouses above."
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {selected.map((w) => (
                  <WarehouseCard
                    key={w.warehouse}
                    w={w}
                    open={w.warehouse === openCode}
                    onOpen={() => openItemsOf(w.warehouse)}
                  />
                ))}
              </div>

              {openWarehouse && (
                <div ref={itemsRef} className="scroll-mt-20">
                  <WarehouseItems
                    key={openWarehouse.warehouse}
                    w={openWarehouse}
                    onClose={() => openItemsOf(openWarehouse.warehouse)}
                  />
                </div>
              )}

              <TableCard
                summary={
                  <span>
                    <span className="font-semibold text-foreground">By category</span>
                    {` · across ${plural(selected.length, 'warehouse')}`}
                  </span>
                }
              >
                <table className={TABLE_CLASSES}>
                  <thead className={THEAD_CLASSES}>
                    <tr>
                      <Th>Category</Th>
                      <Th>Kind</Th>
                      <Th align="right">Litres</Th>
                      <Th align="right">Share</Th>
                      <Th align="right">Warehouses</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {insight.categories.length === 0 ? (
                      <TableEmpty
                        colSpan={CATEGORY_COLUMNS}
                        icon={Droplets}
                        message="No oil in these warehouses"
                      />
                    ) : (
                      insight.categories.map((c) => (
                        <tr key={`${c.kind}-${c.category}`} className={ROW_CLASSES}>
                          <Td className="whitespace-nowrap font-medium">
                            {c.category}
                            {c.negative > 0 && (
                              <span className="ml-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                                {c.negative} below 0
                              </span>
                            )}
                          </Td>
                          <Td>
                            <KindTag kind={c.kind} />
                          </Td>
                          <Td numeric>
                            <Litres value={c.litres} />
                          </Td>
                          <Td>
                            <ShareCell
                              percent={c.litres > 0 ? share(c.litres, insight.total) : 0}
                            />
                          </Td>
                          <Td numeric>{c.warehouses}</Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/40 font-semibold">
                      <Td colSpan={2}>Grand total</Td>
                      <Td numeric>
                        <Litres value={insight.total} />
                      </Td>
                      <Td numeric className="text-xs text-muted-foreground">
                        100%
                      </Td>
                      <Td numeric>{selected.length}</Td>
                    </tr>
                  </tfoot>
                </table>
              </TableCard>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Litres are SAP&apos;s on-hand in each warehouse times the litres in a pack; ghee is left
            out, as EXIM left it. Tonnes are at {LITRES_PER_KG} litres to the kilogram. A figure
            below zero is SAP&apos;s own (stock issued before it was received) and is kept in the
            totals as SAP has it.
          </p>
        </>
      )}
    </div>
  );
}
