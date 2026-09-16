import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Badge, Card, CardContent } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import { useBoxesPage } from '../api';
import ScanSearchButton from '../components/ScanSearchButton';
import type { BoxStatus } from '../types';

const STATUS_COLORS: Record<BoxStatus, string> = {
  ACTIVE: 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-400',
  PARTIAL: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400',
  INSIDE_VEHICLE: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-400',
  DISPATCHED: 'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-400',
  DISMANTLED: 'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-400',
  VOID: 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-400',
};

export default function BoxListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [unpalletized, setUnpalletized] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, unpalletized, debouncedSearch, pageSize]);

  const { data: boxPage, isLoading } = useBoxesPage({
    status: statusFilter || undefined,
    unpalletized: unpalletized ? 'true' : undefined,
    search: debouncedSearch || undefined,
    page,
    page_size: pageSize,
  });
  const boxes = boxPage?.results ?? [];

  return (
    <div className="space-y-6">
      <DashboardHeader title="Boxes" description="Individual carton barcode tracking" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            aria-label="Search by barcode"
            placeholder="Search by barcode..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ScanSearchButton onScan={setSearch} expectedType="BOX" />
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PARTIAL">Partial</option>
          <option value="INSIDE_VEHICLE">Inside Vehicle</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="DISMANTLED">Dismantled</option>
          <option value="VOID">Void</option>
        </select>
        <button
          className={`px-3 py-2 border rounded-md text-sm transition-colors ${unpalletized ? 'bg-orange-100 dark:bg-orange-500/15 border-orange-300 dark:border-orange-500/30 text-orange-800 dark:text-orange-400' : 'hover:bg-muted'}`}
          onClick={() => setUnpalletized(!unpalletized)}
        >
          {unpalletized ? 'Showing: Unpalletized' : 'Unpalletized'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : boxes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No boxes found</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Barcode</th>
                    <th className="text-left p-3 font-medium">Item</th>
                    <th className="text-left p-3 font-medium">Batch</th>
                    <th className="text-right p-3 font-medium">Qty</th>
                    <th className="text-left p-3 font-medium">Pallet</th>
                    <th className="text-left p-3 font-medium">Warehouse</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {boxes.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/barcode/boxes/${b.id}`)}
                    >
                      <td className="p-3 font-mono text-xs">{b.box_barcode}</td>
                      <td className="p-3">
                        <div className="font-medium">{b.item_code}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {b.item_name}
                        </div>
                      </td>
                      <td className="p-3 text-xs">{b.batch_number}</td>
                      <td className="p-3 text-right">
                        {b.qty} {b.uom}
                      </td>
                      <td className="p-3 font-mono text-xs">{b.pallet_code || '—'}</td>
                      <td className="p-3">{b.current_warehouse}</td>
                      <td className="p-3">
                        <Badge className={STATUS_COLORS[b.status]}>{b.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={boxPage?.page ?? page}
              pageSize={boxPage?.page_size ?? pageSize}
              total={boxPage?.count ?? 0}
              totalPages={boxPage?.total_pages ?? 1}
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
