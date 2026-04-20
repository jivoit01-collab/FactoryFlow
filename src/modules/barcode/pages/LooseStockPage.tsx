import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, Badge } from '@/shared/components/ui';

import { useLooseStock } from '../api';
import type { LooseStockStatus, DismantleReason } from '../types';

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

export default function LooseStockPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: items = [], isLoading } = useLooseStock({
    status: statusFilter || undefined,
    reason: reasonFilter || undefined,
    search: search || undefined,
  });

  const activeItems = items.filter((i) => i.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Loose Stock"
        subtitle={`Dismantled items — ${activeItems.length} active records`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
            placeholder="Search by item code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="border rounded-md px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="REPACKED">Repacked</option>
          <option value="CONSUMED">Consumed</option>
        </select>
        <select className="border rounded-md px-3 py-2 text-sm" value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
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
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{ls.item_name}</div>
                      </td>
                      <td className="p-3 text-xs font-mono">{ls.batch_number}</td>
                      <td className="p-3 text-right font-bold">{ls.qty} {ls.uom}</td>
                      <td className="p-3 text-right text-muted-foreground">{ls.original_qty}</td>
                      <td className="p-3">
                        {ls.source_box_barcode ? (
                          <span
                            className="font-mono text-xs text-blue-600 cursor-pointer hover:underline"
                            onClick={() => ls.source_box && navigate(`/barcode/boxes/${ls.source_box}`)}
                          >
                            {ls.source_box_barcode}
                          </span>
                        ) : '—'}
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
                            onClick={() => ls.repacked_into_box && navigate(`/barcode/boxes/${ls.repacked_into_box}`)}
                          >
                            {ls.repacked_into_barcode}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(ls.created_at).toLocaleDateString()}
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
