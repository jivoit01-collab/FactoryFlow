import { ChevronDown, ChevronRight, History, Layers, Search } from 'lucide-react';
import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useLooseStock, useLooseStockPage, useLooseStockSummary } from '../api';
import type { DismantleReason, LooseStockStatus } from '../types';

const STATUS_COLORS: Record<LooseStockStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  REPACKED: 'bg-blue-100 text-blue-800',
  CONSUMED: 'bg-gray-100 text-gray-800',
};

const REASON_COLORS: Record<DismantleReason, string> = {
  REPACK: 'bg-purple-100 text-purple-800',
  SAMPLE: 'bg-cyan-100 text-cyan-800',
  DAMAGED: 'bg-red-100 text-red-800',
  RETURN: 'bg-amber-100 text-amber-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

/** Expanded pool row — the dismantle records behind one item's loose total. */
function PoolRecords({ itemCode }: { itemCode: string }) {
  const navigate = useNavigate();
  const { data: records = [], isLoading } = useLooseStock({ status: 'ACTIVE', item_code: itemCode });

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading records...</div>;
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="text-left p-2 font-medium">Dismantled From</th>
          <th className="text-left p-2 font-medium">Batch</th>
          <th className="text-right p-2 font-medium">Remaining Qty</th>
          <th className="text-right p-2 font-medium">Dismantled Qty</th>
          <th className="text-left p-2 font-medium">Reason</th>
          <th className="text-left p-2 font-medium">Warehouse</th>
          <th className="text-left p-2 font-medium">Date</th>
        </tr>
      </thead>
      <tbody>
        {records.map((ls) => (
          <tr key={ls.id} className="border-b last:border-0">
            <td className="p-2">
              {ls.source_box_barcode ? (
                <span
                  className="font-mono text-blue-600 cursor-pointer hover:underline"
                  onClick={() => ls.source_box && navigate(`/barcode/boxes/${ls.source_box}`)}
                >
                  {ls.source_box_barcode}
                </span>
              ) : (
                '—'
              )}
            </td>
            <td className="p-2 font-mono">{ls.batch_number}</td>
            <td className="p-2 text-right font-bold">
              {ls.qty} {ls.uom}
            </td>
            <td className="p-2 text-right text-muted-foreground">{ls.original_qty}</td>
            <td className="p-2">
              <Badge className={REASON_COLORS[ls.reason]}>{ls.reason}</Badge>
            </td>
            <td className="p-2">{ls.current_warehouse}</td>
            <td className="p-2 text-muted-foreground">
              {new Date(ls.created_at).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Pooled view — one row per item code with the total loose qty. */
function PoolView({ search }: { search: string }) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const { data: pools = [], isLoading } = useLooseStockSummary(search || undefined);

  const toggle = (itemCode: string) =>
    setExpanded((prev) =>
      prev.includes(itemCode) ? prev.filter((c) => c !== itemCode) : [...prev, itemCode],
    );

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }
  if (pools.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No active loose stock</div>;
  }
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 w-8"></th>
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-right p-3 font-medium">Loose Qty</th>
                <th className="text-right p-3 font-medium">Records</th>
                <th className="text-left p-3 font-medium">Batches</th>
                <th className="text-left p-3 font-medium">Warehouses</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((pool) => {
                const isOpen = expanded.includes(pool.item_code);
                return (
                  <Fragment key={pool.item_code}>
                    <tr
                      className="border-b cursor-pointer hover:bg-muted/30"
                      onClick={() => toggle(pool.item_code)}
                    >
                      <td className="p-3">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{pool.item_code}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[280px]">
                          {pool.item_name}
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold text-base">
                        {pool.total_qty} {pool.uom}
                      </td>
                      <td className="p-3 text-right">{pool.record_count}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {pool.batches.map((b) => (
                            <Badge key={b} className="bg-gray-100 text-gray-800 font-mono text-xs">
                              {b}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">{pool.warehouses.join(', ')}</td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b bg-muted/10">
                        <td></td>
                        <td colSpan={5} className="p-2">
                          <PoolRecords itemCode={pool.item_code} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Ledger view — the flat per-record history, including repacked/consumed. */
function LedgerView({ search }: { search: string }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilterState] = useState('');
  const [reasonFilter, setReasonFilterState] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);

  // Any filter change restarts from page 1
  const setStatusFilter = (v: string) => {
    setStatusFilterState(v);
    setPage(1);
  };
  const setReasonFilter = (v: string) => {
    setReasonFilterState(v);
    setPage(1);
  };
  const setPageSize = (v: number) => {
    setPageSizeState(v);
    setPage(1);
  };
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setPage(1);
  }

  const { data: loosePage, isLoading } = useLooseStockPage({
    status: statusFilter || undefined,
    reason: reasonFilter || undefined,
    search: search || undefined,
    page,
    page_size: pageSize,
  });
  const items = loosePage?.results ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="REPACKED">Repacked</option>
          <option value="CONSUMED">Consumed</option>
        </select>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
        >
          <option value="">All Reasons</option>
          <option value="REPACK">Repack</option>
          <option value="SAMPLE">Sample</option>
          <option value="DAMAGED">Damaged</option>
          <option value="RETURN">Return</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No loose stock found</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Item</th>
                    <th className="text-left p-3 font-medium">Batch</th>
                    <th className="text-right p-3 font-medium">Qty</th>
                    <th className="text-right p-3 font-medium">Original</th>
                    <th className="text-left p-3 font-medium">Source Box</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                    <th className="text-left p-3 font-medium">Warehouse</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Repacked Into</th>
                    <th className="text-left p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((ls) => (
                    <tr key={ls.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{ls.item_code}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {ls.item_name}
                        </div>
                      </td>
                      <td className="p-3 text-xs font-mono">{ls.batch_number}</td>
                      <td className="p-3 text-right font-bold">
                        {ls.qty} {ls.uom}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">{ls.original_qty}</td>
                      <td className="p-3">
                        {ls.source_box_barcode ? (
                          <span
                            className="font-mono text-xs text-blue-600 cursor-pointer hover:underline"
                            onClick={() =>
                              ls.source_box && navigate(`/barcode/boxes/${ls.source_box}`)
                            }
                          >
                            {ls.source_box_barcode}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={REASON_COLORS[ls.reason]}>{ls.reason}</Badge>
                      </td>
                      <td className="p-3">{ls.current_warehouse}</td>
                      <td className="p-3">
                        <Badge className={STATUS_COLORS[ls.status]}>{ls.status}</Badge>
                      </td>
                      <td className="p-3">
                        {ls.repacked_into_barcode ? (
                          <span
                            className="font-mono text-xs text-blue-600 cursor-pointer hover:underline"
                            onClick={() =>
                              ls.repacked_into_box &&
                              navigate(`/barcode/boxes/${ls.repacked_into_box}`)
                            }
                          >
                            {ls.repacked_into_barcode}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(ls.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={loosePage?.page ?? page}
              pageSize={loosePage?.page_size ?? pageSize}
              total={loosePage?.count ?? 0}
              totalPages={loosePage?.total_pages ?? 1}
              isLoading={isLoading}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function LooseStockPage() {
  const [view, setView] = useState<'pool' | 'ledger'>('pool');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Loose Stock"
        subtitle="Dismantled items pooled by item — expand a row to see source boxes"
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
            placeholder="Search by item code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === 'pool' ? 'default' : 'outline'}
            onClick={() => setView('pool')}
          >
            <Layers className="h-4 w-4 mr-1" /> Stock
          </Button>
          <Button
            size="sm"
            variant={view === 'ledger' ? 'default' : 'outline'}
            onClick={() => setView('ledger')}
          >
            <History className="h-4 w-4 mr-1" /> History
          </Button>
        </div>
      </div>

      {view === 'pool' ? <PoolView search={search} /> : <LedgerView search={search} />}
    </div>
  );
}
