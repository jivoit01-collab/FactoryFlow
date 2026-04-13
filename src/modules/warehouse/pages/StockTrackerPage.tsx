import { ChevronLeft, ChevronRight, Download, Eye,Search } from 'lucide-react';
import { useState } from 'react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { DashboardLoading } from '@/shared/components/dashboard/DashboardLoading';
import { Card, CardContent } from '@/shared/components/ui';

import { useStockOverview, useWMSItemGroups,useWMSWarehouses } from '../api';
import ItemDetailModal from '../components/ItemDetailModal';
import type { StockStatus } from '../types';

const STATUS_BADGE: Record<StockStatus, string> = {
  NORMAL: 'bg-green-100 text-green-700',
  LOW: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
  OVERSTOCK: 'bg-blue-100 text-blue-700',
  ZERO: 'bg-gray-100 text-gray-500',
};

function formatValue(val: number): string {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
  return val.toFixed(2);
}

export default function StockTrackerPage() {
  const [search, setSearch] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [itemGroup, setItemGroup] = useState('');
  const [stockFilter, setStockFilter] = useState('with_stock');
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const pageSize = 50;

  const { data: whList } = useWMSWarehouses();
  const { data: groupList } = useWMSItemGroups();
  const { data, isLoading } = useStockOverview({
    warehouse_code: warehouseCode || undefined,
    item_group: itemGroup || undefined,
    search: search || undefined,
    stock_filter: stockFilter,
    page,
    page_size: pageSize,
  });

  const handleExport = () => {
    if (!data?.items.length) return;
    const headers = [
      'Item Code',
      'Item Name',
      'Group',
      'Warehouse',
      'On Hand',
      'Committed',
      'Available',
      'Value',
      'UoM',
      'Status',
    ];
    const csv = [
      headers.join(','),
      ...data.items.map((i) =>
        [
          i.item_code,
          `"${i.item_name}"`,
          `"${i.item_group}"`,
          i.warehouse_code,
          i.on_hand,
          i.committed,
          i.available,
          i.stock_value,
          i.uom,
          i.stock_status,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <DashboardHeader
          title="Stock Tracker"
          subtitle="Search and monitor stock across all warehouses"
        />
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search item code or name..."
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={warehouseCode}
              onChange={(e) => {
                setWarehouseCode(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Warehouses</option>
              {whList?.warehouses.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code}
                </option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={itemGroup}
              onChange={(e) => {
                setItemGroup(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Groups</option>
              {groupList?.item_groups.map((g) => (
                <option key={g.code} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="with_stock">With Stock</option>
              <option value="all">All Items</option>
              <option value="zero_stock">Zero Stock</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Summary bar */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          {[
            { label: 'Total Items', value: data.summary.total_items.toLocaleString() },
            {
              label: 'On Hand',
              value: formatValue(data.summary.total_on_hand),
            },
            {
              label: 'Committed',
              value: formatValue(data.summary.total_committed),
            },
            {
              label: 'Available',
              value: formatValue(data.summary.total_available),
            },
            { label: 'Total Value', value: `\u20B9 ${formatValue(data.summary.total_value)}` },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stock Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8">
              <DashboardLoading />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="p-3">Item Code</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Group</th>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3 text-right">On Hand</th>
                    <th className="p-3 text-right">Committed</th>
                    <th className="p-3 text-right">Available</th>
                    <th className="p-3 text-right">Value</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((item, idx) => (
                    <tr
                      key={`${item.item_code}-${item.warehouse_code}-${idx}`}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-3 font-medium">{item.item_code}</td>
                      <td className="p-3 max-w-[200px] truncate">{item.item_name}</td>
                      <td className="p-3 text-muted-foreground text-xs">{item.item_group}</td>
                      <td className="p-3">{item.warehouse_code}</td>
                      <td className="p-3 text-right font-mono">
                        {item.on_hand.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {item.committed.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {item.available.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {item.stock_value > 0 ? `\u20B9${formatValue(item.stock_value)}` : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[item.stock_status]}`}
                        >
                          {item.stock_status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedItem(item.item_code)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-muted-foreground">
                        No items found matching your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total}{' '}
                items)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 border rounded disabled:opacity-30 hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                  disabled={page >= data.pagination.pages}
                  className="p-1.5 border rounded disabled:opacity-30 hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          itemCode={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
