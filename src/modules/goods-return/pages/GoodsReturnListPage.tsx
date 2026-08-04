import { PackageX, Plus, RefreshCw, Search, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { type GoodsReturnStatus, useGoodsReturns } from '../api';
import { BASIS_LABELS, formatDate, STATUS_BADGE_CLASS, STATUS_LABELS } from '../utils';

const STATUS_FILTERS: { value: '' | GoodsReturnStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'AWAITING_ARRIVAL', label: 'Awaiting Arrival' },
  { value: 'ARRIVED', label: 'Arrived' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function GoodsReturnListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'' | GoodsReturnStatus>('');
  const [search, setSearch] = useState('');

  const {
    data: entries = [],
    isLoading,
    isFetching,
    refetch,
  } = useGoodsReturns(statusFilter ? { status: statusFilter } : undefined);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [entry.entry_no, entry.customer_name, entry.customer_code, entry.vehicle_no]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [entries, search]);

  const counts = useMemo(() => {
    const draft = entries.filter((e) => e.status === 'DRAFT').length;
    const awaiting = entries.filter((e) => e.status === 'AWAITING_ARRIVAL').length;
    const arrived = entries.filter((e) => e.status === 'ARRIVED').length;
    return { total: entries.length, draft, awaiting, arrived };
  }, [entries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Undo2 className="h-7 w-7 text-rose-600" />
            Goods Return
          </h2>
          <p className="text-muted-foreground">Customer returns of finished goods, back to the plant.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/goods-return/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Draft" value={counts.draft} tone="text-slate-600" />
        <StatCard label="Awaiting Arrival" value={counts.awaiting} tone="text-amber-600" />
        <StatCard label="Arrived" value={counts.arrived} tone="text-emerald-600" />
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
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search entry, customer, vehicle"
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <EmptyState text="Loading…" />
        ) : filtered.length === 0 ? (
          <EmptyState text={entries.length === 0 ? 'No goods returns yet' : 'No returns match this search'} />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <th className="px-4 py-3">Entry No.</th>
                      <th className="px-4 py-3">Basis</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Expected</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry) => (
                      <tr
                        key={entry.id}
                        className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                        onClick={() =>
                          navigate(
                            entry.status === 'DRAFT'
                              ? `/goods-return/edit/${entry.id}/items`
                              : `/goods-return/${entry.id}`,
                          )
                        }
                      >
                        <td className="px-4 py-3 font-medium">{entry.entry_no}</td>
                        <td className="px-4 py-3 text-muted-foreground">{BASIS_LABELS[entry.basis]}</td>
                        <td className="px-4 py-3">{entry.customer_name || entry.customer_code || '-'}</td>
                        <td className="px-4 py-3">{entry.line_count}</td>
                        <td className="px-4 py-3">{entry.vehicle_no || '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(entry.expected_arrival_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn('border-0', STATUS_BADGE_CLASS[entry.status])}>
                            {STATUS_LABELS[entry.status]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{label}</p>
          <p className={cn('text-2xl font-bold', tone)}>{value}</p>
        </div>
        <PackageX className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <PackageX className="h-8 w-8" />
        <p>{text}</p>
      </CardContent>
    </Card>
  );
}
