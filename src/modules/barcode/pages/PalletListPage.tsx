import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Search } from 'lucide-react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, Badge } from '@/shared/components/ui';

import { usePallets } from '../api';
import type { PalletStatus } from '../types';

const STATUS_COLORS: Record<PalletStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  CLEARED: 'bg-gray-100 text-gray-800',
  SPLIT: 'bg-blue-100 text-blue-800',
  VOID: 'bg-red-100 text-red-800',
};

export default function PalletListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState('');

  const { data: pallets = [], isLoading } = usePallets({
    status: statusFilter || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <DashboardHeader title="Pallets" subtitle="All pallets with barcode tracking" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by pallet ID..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="CLEARED">Cleared</option>
          <option value="SPLIT">Split</option>
          <option value="VOID">Void</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : pallets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No pallets found</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Pallet ID</th>
                    <th className="text-left p-3 font-medium">Item</th>
                    <th className="text-left p-3 font-medium">Batch</th>
                    <th className="text-right p-3 font-medium">Boxes</th>
                    <th className="text-right p-3 font-medium">Total Qty</th>
                    <th className="text-left p-3 font-medium">Warehouse</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pallets.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/barcode/pallets/${p.id}`)}
                    >
                      <td className="p-3 font-mono text-xs">{p.pallet_id}</td>
                      <td className="p-3">
                        <div className="font-medium">{p.item_code}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {p.item_name}
                        </div>
                      </td>
                      <td className="p-3 text-xs">{p.batch_number}</td>
                      <td className="p-3 text-right">{p.box_count}</td>
                      <td className="p-3 text-right">{p.total_qty} {p.uom}</td>
                      <td className="p-3">{p.current_warehouse}</td>
                      <td className="p-3">
                        <Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
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
