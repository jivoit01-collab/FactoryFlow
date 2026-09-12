import { Hammer, Plus, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { type DismantleStatus, useDismantles } from '../api';
import { DISMANTLE_STATUS_BADGE_CLASS, DISMANTLE_STATUS_LABELS, formatQty } from '../utils';

const STATUS_FILTERS: { value: '' | DismantleStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PARTIALLY_POSTED', label: 'Partly posted' },
  { value: 'POSTED', label: 'Posted' },
];

export default function DismantleListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'' | DismantleStatus>('');
  const [search, setSearch] = useState('');

  const {
    data: entries = [],
    isLoading,
    isFetching,
    refetch,
  } = useDismantles(statusFilter ? { status: statusFilter } : undefined);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [
        entry.entry_no,
        entry.item_code,
        entry.item_name,
        entry.batch_number,
        entry.goods_return_entry_no,
        entry.customer_name,
        entry.sap_order_doc_num,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [entries, search]);

  const counts = useMemo(
    () => ({
      total: entries.length,
      draft: entries.filter((e) => e.status === 'DRAFT').length,
      // The one that needs somebody: SAP has some of the three documents and the
      // stock has half moved.
      unfinished: entries.filter((e) => e.status === 'PARTIALLY_POSTED').length,
      posted: entries.filter((e) => e.status === 'POSTED').length,
    }),
    [entries],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Hammer className="h-7 w-7 text-amber-600" />
            Disassembly
          </h2>
          <p className="text-muted-foreground">
            Taking finished goods apart and putting the oil, bottles, caps, labels and
            cartons back into stock.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/returns/disassembly/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Disassembly
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Draft" value={counts.draft} tone="text-slate-600" />
        <StatCard label="Partly Posted" value={counts.unfinished} tone="text-orange-600" />
        <StatCard label="Posted" value={counts.posted} tone="text-emerald-600" />
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.value || 'all'}
                size="sm"
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Entry, item, batch, return or SAP order…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">Loading…</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Nothing here yet. Start one from a returned line or from warehouse stock.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Entry</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3 text-right">Pieces</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">SAP</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr
                      key={entry.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                      onClick={() => navigate(`/returns/disassembly/${entry.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{entry.entry_no}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{entry.item_code}</div>
                        <div className="text-xs text-muted-foreground">{entry.item_name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{entry.batch_number || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(entry.quantity)}
                      </td>
                      <td className="px-4 py-3">{entry.warehouse_code}</td>
                      <td className="px-4 py-3 text-xs">
                        {entry.goods_return_entry_no ? (
                          <>
                            <div>{entry.goods_return_entry_no}</div>
                            <div className="text-muted-foreground">{entry.customer_name}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Warehouse stock</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums">
                        {entry.sap_order_doc_num || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={cn('border-0', DISMANTLE_STATUS_BADGE_CLASS[entry.status])}
                        >
                          {DISMANTLE_STATUS_LABELS[entry.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-bold', tone)}>{value}</p>
      </CardContent>
    </Card>
  );
}
