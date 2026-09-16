import { PackageMinus, Plus, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SHORT_DISPATCH_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useShortDispatches } from '../api';
import { formatDateTime, formatQty } from '../utils';

/**
 * Short Dispatch — what came back off bills that were already posted.
 *
 * Every row here is a document that exists in SAP: the form posts on submit, so
 * there is nothing in this list that is only half-done. The bill number leads,
 * because that is what anybody looking for one of these has in front of them.
 */
export default function ShortDispatchListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(SHORT_DISPATCH_PERMISSIONS.CREATE);

  const [search, setSearch] = useState('');
  const { data: entries = [], isLoading, isFetching, refetch } = useShortDispatches();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [
        entry.entry_no,
        entry.sap_invoice_doc_num,
        entry.sap_return_doc_num,
        entry.customer_name,
        entry.customer_code,
        entry.warehouse_code,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [entries, search]);

  const counts = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: entries.length,
      today: entries.filter((entry) => new Date(entry.created_at).toDateString() === today).length,
      bills: new Set(entries.map((entry) => entry.sap_invoice_doc_num)).size,
    };
  }, [entries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <PackageMinus className="h-7 w-7 text-amber-600" />
            Short Dispatch
          </h2>
          <p className="text-muted-foreground">
            Stock a posted bill says went out but which never left the floor, put back with a SAP
            return note.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
          {canCreate && (
            <Button onClick={() => navigate('/warehouse/short-dispatch/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Short Dispatch
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Today" value={counts.today} tone="text-amber-600" />
        <StatCard label="Bills Affected" value={counts.bills} tone="text-slate-600 dark:text-muted-foreground" />
      </div>

      <div className="relative w-full lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search invoice, entry, customer, warehouse"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <EmptyState text="Loading…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          text={
            entries.length === 0
              ? 'No short dispatches yet'
              : 'No short dispatches match this search'
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Entry No.</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Short Qty</th>
                    <th className="px-4 py-3">Back Into</th>
                    <th className="px-4 py-3">SAP Return</th>
                    <th className="px-4 py-3">Posted</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr
                      key={entry.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                      onClick={() => navigate(`/warehouse/short-dispatch/${entry.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{entry.sap_invoice_doc_num}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.entry_no}</td>
                      <td className="px-4 py-3">
                        {entry.customer_name || entry.customer_code || '-'}
                      </td>
                      <td className="px-4 py-3">{entry.line_count}</td>
                      <td className="px-4 py-3">{formatQty(entry.total_short_quantity)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.warehouse_code}</td>
                      <td className="px-4 py-3">
                        {entry.sap_return_doc_num ? (
                          <Badge className="border-0 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400">
                            {entry.sap_return_doc_num}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(entry.posted_at || entry.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
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
        <PackageMinus className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <PackageMinus className="h-8 w-8" />
        <p>{text}</p>
      </CardContent>
    </Card>
  );
}
