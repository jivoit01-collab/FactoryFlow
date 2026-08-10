/** The evidence under every headline — five tables, one row per fact.
 *
 * Each stage tile above opens the table that proves it, and every row opens the
 * drill-down that traces it back to an order. Rendering is capped and the cap
 * is stated: a table that silently shows 250 of 2,600 rows reads as "that is
 * all there is", which is how a shortage gets missed.
 */
import { useMemo, useState } from 'react';

import { Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type {
  LiveTrail,
  TrailAction,
  TrailComponent,
  TrailOrder,
  TrailResource,
  TrailSku,
} from '../../types';
import { days, inr, n0, n1, onDate } from './trail-format';
import { CoverPill, TrailPill } from './TrailPill';
import type { StageTab } from './TrailStages';

/** Enough to scan and to search within; far short of what a browser will
 *  happily choke on. */
const RENDER_CAP = 250;

type Row = TrailOrder | TrailSku | TrailComponent | TrailAction | TrailResource;

interface Column<T> {
  head: string;
  right?: boolean;
  cell: (row: T) => React.ReactNode;
}

interface TableDef<T extends Row> {
  label: string;
  rows: T[];
  /** The dimension the filter dropdown offers — the one people actually slice by. */
  group: (row: T) => string;
  columns: Column<T>[];
  search: (row: T, query: string) => boolean;
  onOpen?: (row: T) => void;
  empty: string;
}

/**
 * Erase one table's row type so five differently-shaped tables can share one
 * renderer.
 *
 * The narrowing inside is safe by construction and cannot be expressed to the
 * compiler: every callback is only ever handed an element of `def.rows`, which
 * is `T[]`. Doing it here, once, keeps the cast out of the renderer — where it
 * would have to be repeated per column and could actually go wrong.
 */
function erase<T extends Row>(def: TableDef<T>): TableDef<Row> {
  const narrow = (row: Row) => row as T;
  return {
    label: def.label,
    rows: def.rows,
    empty: def.empty,
    group: (row) => def.group(narrow(row)),
    search: (row, query) => def.search(narrow(row), query),
    columns: def.columns.map((column) => ({
      ...column,
      cell: (row: Row) => column.cell(narrow(row)),
    })),
    onOpen: def.onOpen && ((row) => def.onOpen?.(narrow(row))),
  };
}

export function TrailTables({
  data,
  tab,
  onTab,
  onOpenSku,
  onOpenComponent,
}: {
  data: LiveTrail;
  tab: StageTab;
  onTab: (tab: StageTab) => void;
  onOpenSku: (item: string) => void;
  onOpenComponent: (item: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('__all');

  const tables = useMemo(
    () => buildTables(data, onOpenSku, onOpenComponent),
    [data, onOpenSku, onOpenComponent],
  );
  const table = tables[tab];

  const groups = useMemo(() => {
    const keys = new Set<string>();
    table.rows.forEach((row) => {
      const key = table.group(row);
      if (key) keys.add(key);
    });
    return [...keys].sort();
  }, [table]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return table.rows.filter(
      (row) =>
        (group === '__all' || table.group(row) === group) &&
        (!needle || table.search(row, needle)),
    );
  }, [table, query, group]);

  const shown = filtered.slice(0, RENDER_CAP);

  const switchTab = (next: StageTab) => {
    // The filter belongs to the table it came from; carrying "PACKAGING
    // MATERIAL" onto the orders tab would silently empty it.
    setGroup('__all');
    onTab(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 border-b">
        {(Object.keys(tables) as StageTab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTab(key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[12.5px] font-semibold transition-colors',
              tab === key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tables[key].label}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({n0(tables[key].rows.length)})
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search item, name, party…"
          className="h-8 w-full max-w-[16rem] text-[12.5px]"
        />
        <NativeSelect
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          className="h-8 w-auto text-[12.5px]"
        >
          <SelectOption value="__all">
            All ({groups.length} group{groups.length === 1 ? '' : 's'})
          </SelectOption>
          {groups.map((key) => (
            <SelectOption key={key} value={key}>
              {key}
            </SelectOption>
          ))}
        </NativeSelect>
        <span className="text-xs text-muted-foreground">
          {shown.length < filtered.length
            ? `Showing ${n0(shown.length)} of ${n0(filtered.length)} rows — search or filter to narrow`
            : `${n0(filtered.length)} row${filtered.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="max-h-[32rem] overflow-auto rounded-md border">
        <table className="w-full text-[12.5px]">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
              {table.columns.map((column) => (
                <th
                  key={column.head}
                  className={cn(
                    'whitespace-nowrap px-2.5 py-2 font-semibold',
                    column.right ? 'text-right' : 'text-left',
                  )}
                >
                  {column.head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  {query || group !== '__all' ? 'Nothing matches.' : table.empty}
                </td>
              </tr>
            ) : (
              shown.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  onClick={() => table.onOpen?.(row)}
                  className={cn(
                    'border-b last:border-0',
                    table.onOpen && 'cursor-pointer hover:bg-muted/50',
                  )}
                >
                  {table.columns.map((column) => (
                    <td
                      key={column.head}
                      className={cn(
                        'px-2.5 py-2 align-top',
                        column.right && 'whitespace-nowrap text-right tabular-nums',
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function rowKey(row: Row, index: number) {
  if ('doc' in row) return `${row.company}-${row.doc}-${row.line}-${index}`;
  if ('code' in row) return row.code;
  return `${(row as { item: string }).item}-${index}`;
}

function Name({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="min-w-[10rem]">
      <span className="block font-medium">{title}</span>
      <span className="block text-[11px] text-muted-foreground">{sub}</span>
    </div>
  );
}

function buildTables(
  data: LiveTrail,
  onOpenSku: (item: string) => void,
  onOpenComponent: (item: string) => void,
): Record<StageTab, TableDef<Row>> {
  const skusByCode = new Map(data.skus.map((sku) => [sku.item, sku]));

  const orders: TableDef<TrailOrder> = {
    label: 'Open orders',
    rows: data.orders,
    group: (o) => (o.interco ? 'Intercompany' : o.company === 'JIVO_MART' ? 'Mart' : 'Oil'),
    search: (o, q) =>
      `${o.party}${o.name}${o.item}${o.source_item}${o.doc}`.toLowerCase().includes(q),
    onOpen: (o) => o.item && onOpenSku(o.item),
    empty: 'No open sales orders.',
    columns: [
      {
        head: 'Order',
        cell: (o) => <Name title={o.party} sub={`#${o.doc} · placed ${onDate(o.ordered)}`} />,
      },
      {
        head: 'Item',
        cell: (o) => (
          <Name
            title={o.name}
            sub={
              o.match === 'name'
                ? `${o.source_item} → ${o.item} (matched by name)`
                : o.item || `${o.source_item} · not matched`
            }
          />
        ),
      },
      {
        head: 'Open qty',
        right: true,
        cell: (o) => (
          <>
            {n0(o.open)}
            {o.delivered > 0 && (
              <span className="block text-[11px] text-muted-foreground">
                {n0(o.delivered)} already sent
              </span>
            )}
          </>
        ),
      },
      { head: 'Value', right: true, cell: (o) => inr(o.value) },
      { head: 'Age', right: true, cell: (o) => `${n0(o.age)} d` },
      {
        head: 'Book',
        cell: (o) => (
          <TrailPill tone={o.interco ? 'warn' : 'neutral'}>
            {o.interco ? 'Intercompany' : o.company === 'JIVO_MART' ? 'Mart' : 'Oil'}
          </TrailPill>
        ),
      },
      {
        head: 'Can ship now',
        cell: (o) => {
          if (!o.item) return <TrailPill tone="warn" glyph="?">not matched</TrailPill>;
          const sku = skusByCode.get(o.item);
          if (!sku) return <TrailPill>—</TrailPill>;
          return sku.to_produce <= 0 ? (
            <TrailPill tone="good" glyph="✓">from stock</TrailPill>
          ) : (
            <CoverPill sku={sku} />
          );
        },
      },
    ],
  };

  const skus: TableDef<TrailSku> = {
    label: 'SKU cover & gap',
    rows: data.skus,
    group: (s) => s.variety,
    search: (s, q) => `${s.name}${s.item}${s.variety}${s.type}`.toLowerCase().includes(q),
    onOpen: (s) => onOpenSku(s.item),
    empty: 'No SKUs on the order book.',
    columns: [
      {
        head: 'SKU',
        cell: (s) => <Name title={s.name} sub={`${s.item} · ${s.type} · ${s.variety}`} />,
      },
      {
        head: 'Demand',
        right: true,
        cell: (s) => (
          <>
            {n0(s.demand)}
            <span className="block text-[11px] text-muted-foreground">
              {s.orders} order{s.orders === 1 ? '' : 's'}
            </span>
          </>
        ),
      },
      {
        head: 'Stock',
        right: true,
        cell: (s) => (
          <>
            {n0(s.onhand)}
            <span className="block text-[11px] text-muted-foreground">
              {Object.entries(s.onhand_by_company)
                .filter(([, qty]) => (qty ?? 0) > 0)
                .map(([code, qty]) => `${code === 'JIVO_MART' ? 'Mart' : 'Oil'} ${n0(qty)}`)
                .join(' · ') || 'none'}
            </span>
          </>
        ),
      },
      {
        head: 'In production',
        right: true,
        cell: (s) =>
          s.wip > 0 ? (
            <>
              {n0(s.wip)}
              <span className="block text-[11px] text-muted-foreground">{s.wo_count} WO</span>
            </>
          ) : (
            '—'
          ),
      },
      {
        head: 'Must produce',
        right: true,
        cell: (s) => (s.to_produce > 0 ? <b>{n0(s.to_produce)}</b> : '—'),
      },
      { head: 'Value', right: true, cell: (s) => inr(s.value) },
      {
        head: 'Status',
        cell: (s) =>
          s.to_produce > 0 && !s.has_bom ? (
            <TrailPill tone="warn" glyph="?">no BOM</TrailPill>
          ) : (
            <CoverPill sku={s} />
          ),
      },
    ],
  };

  const materials: TableDef<TrailComponent> = {
    label: 'Material requirement',
    rows: data.components.filter((c) => !c.is_resource),
    group: (c) => c.group,
    search: (c, q) => `${c.name}${c.item}${c.group}${c.vendor ?? ''}`.toLowerCase().includes(q),
    onOpen: (c) => onOpenComponent(c.item),
    empty: 'Nothing to explode — no SKU has a production gap.',
    columns: [
      {
        head: 'Component',
        cell: (c) => (
          <Name
            title={c.name}
            sub={`${c.item} · ${c.family} · used in ${c.used_in} SKU${c.used_in === 1 ? '' : 's'}`}
          />
        ),
      },
      {
        head: 'Required',
        right: true,
        cell: (c) => (
          <>
            {n1(c.reqd)} <span className="text-[11px] text-muted-foreground">{c.uom}</span>
          </>
        ),
      },
      { head: 'On hand', right: true, cell: (c) => n0(c.onhand) },
      { head: 'Live PO', right: true, cell: (c) => (c.po_live > 0 ? n0(c.po_live) : '—') },
      {
        head: 'Dead PO',
        right: true,
        cell: (c) =>
          c.po_stale > 0 ? (
            <>
              <span className="text-destructive">{n0(c.po_stale)}</span>
              <span className="block text-[11px] text-muted-foreground">{c.stale_pos} PO</span>
            </>
          ) : (
            '—'
          ),
      },
      {
        head: 'Short',
        right: true,
        cell: (c) =>
          c.short_strict > 0 ? <b className="text-destructive">{n1(c.short_strict)}</b> : '—',
      },
      {
        head: 'Lead',
        right: true,
        cell: (c) =>
          c.lead_avg == null ? (
            <span className="text-muted-foreground">no history</span>
          ) : (
            days(c.lead_avg)
          ),
      },
      {
        head: 'Status',
        cell: (c) =>
          c.short_strict > 0 ? (
            <TrailPill tone="critical" glyph="▲">buy</TrailPill>
          ) : c.po_stale > 0 ? (
            <TrailPill tone="warn" glyph="●">PO stale</TrailPill>
          ) : (
            <TrailPill tone="good" glyph="✓">covered</TrailPill>
          ),
      },
    ],
  };

  const buy: TableDef<TrailAction> = {
    label: 'Procurement',
    rows: data.actions,
    group: (a) => a.urgency,
    search: (a, q) => `${a.name}${a.item}${a.vendor ?? ''}`.toLowerCase().includes(q),
    onOpen: (a) => onOpenComponent(a.item),
    empty: 'Nothing to buy — every component is covered.',
    columns: [
      { head: 'Buy', cell: (a) => <Name title={a.name} sub={`${a.item} · ${a.group}`} /> },
      {
        head: 'Qty',
        right: true,
        cell: (a) => (
          <>
            <b>{n1(a.short)}</b>{' '}
            <span className="text-[11px] text-muted-foreground">{a.uom}</span>
          </>
        ),
      },
      { head: 'Est. spend', right: true, cell: (a) => inr(a.value) },
      {
        head: 'Lead avg / worst',
        right: true,
        cell: (a) =>
          a.lead_avg == null ? (
            <span className="text-muted-foreground">no history</span>
          ) : (
            `${n1(a.lead_avg)} / ${n1(a.lead_max)} d`
          ),
      },
      { head: 'Needed by', right: true, cell: (a) => onDate(a.need_by) },
      { head: 'Order by', right: true, cell: (a) => onDate(a.order_by) },
      { head: 'Vendor', cell: (a) => a.vendor ?? '—' },
      {
        head: 'Make instead?',
        cell: (a) =>
          a.can_make ? (
            <TrailPill tone="good" glyph="✓">{a.make?.verdict}</TrailPill>
          ) : (
            <TrailPill>buy only</TrailPill>
          ),
      },
      {
        head: 'Urgency',
        cell: (a) =>
          a.urgency === 'CRITICAL' ? (
            <TrailPill tone="critical" glyph="▲">CRITICAL</TrailPill>
          ) : (
            <TrailPill tone="warn" glyph="●">PLAN</TrailPill>
          ),
      },
    ],
  };

  const capacity: TableDef<TrailResource> = {
    label: 'Filling capacity',
    rows: data.resources,
    group: () => 'All',
    search: (r, q) => `${r.name}${r.code}`.toLowerCase().includes(q),
    empty: 'No conversion resource is consumed by the gap.',
    columns: [
      {
        head: 'Conversion resource',
        cell: (r) => <Name title={r.name} sub={`${r.code} · SAP production resource`} />,
      },
      { head: 'Litres to fill', right: true, cell: (r) => n0(r.litres_reqd) },
      { head: 'SKUs', right: true, cell: (r) => n0(r.skus) },
      { head: `Rate ₹/${'L'}`, right: true, cell: (r) => r.rate.toFixed(2) },
      { head: 'Conversion cost', right: true, cell: (r) => inr(r.cost) },
    ],
  };

  return {
    orders: erase(orders),
    skus: erase(skus),
    materials: erase(materials),
    buy: erase(buy),
    capacity: erase(capacity),
  };
}
