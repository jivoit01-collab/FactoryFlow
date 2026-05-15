import { useState } from 'react';
import { Download, PackageCheck, Search } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { DashboardLoading } from '@/shared/components/dashboard/DashboardLoading';
import { Card, CardContent } from '@/shared/components/ui';

import { useSalesOrderBacklog, useWMSWarehouses } from '../api';

function formatQty(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function SalesOrderBacklogPage() {
  const [warehouseCode, setWarehouseCode] = useState('');
  const [fromDueDate, setFromDueDate] = useState('');
  const [toDueDate, setToDueDate] = useState('');
  const [search, setSearch] = useState('');

  const { data: whList } = useWMSWarehouses();
  const { data, isLoading } = useSalesOrderBacklog({
    warehouse_code: warehouseCode || undefined,
    from_due_date: fromDueDate || undefined,
    to_due_date: toDueDate || undefined,
    search: search || undefined,
    limit: 500,
  });

  const warehouseChartData =
    data?.warehouses.slice(0, 15).map((item) => ({
      warehouse: item.warehouse_code,
      open_quantity: item.open_quantity,
      lines: item.line_count,
    })) ?? [];

  const handleExport = () => {
    if (!data?.lines.length) return;
    const headers = [
      'Sales Order',
      'Due Date',
      'Customer Code',
      'Customer Name',
      'Warehouse',
      'Item Code',
      'Item Name',
      'Ordered Qty',
      'Delivered Qty',
      'Open Qty',
      'Fulfillment %',
    ];
    const csv = [
      headers.join(','),
      ...data.lines.map((line) =>
        [
          line.doc_num,
          line.due_date,
          line.customer_code,
          `"${line.customer_name}"`,
          line.warehouse_code,
          line.item_code,
          `"${line.item_name}"`,
          line.ordered_qty,
          line.delivered_qty,
          line.open_qty,
          line.fulfillment_pct,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_order_backlog_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <DashboardHeader
          title="Order Backlog"
          subtitle="Open sales-order lines ready for outbound planning"
        />
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={warehouseCode}
              onChange={(e) => setWarehouseCode(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {whList?.warehouses.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={fromDueDate}
              onChange={(e) => setFromDueDate(e.target.value)}
            />
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={toDueDate}
              onChange={(e) => setToDueDate(e.target.value)}
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Customer or item"
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <DashboardLoading />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'Orders', value: data.summary.order_count.toLocaleString() },
              { label: 'Lines', value: data.summary.line_count.toLocaleString() },
              { label: 'Open Qty', value: formatQty(data.summary.open_quantity) },
              { label: 'Warehouses', value: data.summary.warehouse_count.toLocaleString() },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-green-600" />
                  Open Quantity by Warehouse
                </h3>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={warehouseChartData} layout="vertical" margin={{ left: 50, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => formatQty(v)} fontSize={12} />
                      <YAxis type="category" dataKey="warehouse" width={50} fontSize={11} />
                      <Tooltip formatter={(value: number) => [formatQty(value), 'Open Qty']} />
                      <Bar dataKey="open_quantity" fill="#16a34a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Warehouse Backlog</h3>
                <div className="space-y-3">
                  {data.warehouses.slice(0, 8).map((warehouse) => (
                    <div
                      key={warehouse.warehouse_code}
                      className="flex items-center justify-between gap-3 border-b last:border-0 pb-3 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{warehouse.warehouse_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {warehouse.order_count} orders, {warehouse.line_count} lines
                        </p>
                      </div>
                      <p className="font-mono text-sm">{formatQty(warehouse.open_quantity)}</p>
                    </div>
                  ))}
                  {data.warehouses.length === 0 && (
                    <p className="text-sm text-muted-foreground">No backlog found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                      <th className="p-3">SO</th>
                      <th className="p-3">Due</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Warehouse</th>
                      <th className="p-3">Item Code</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3 text-right">Ordered</th>
                      <th className="p-3 text-right">Delivered</th>
                      <th className="p-3 text-right">Open</th>
                      <th className="p-3 text-right">Fulfilled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line) => (
                      <tr
                        key={`${line.doc_entry}-${line.line_num}`}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="p-3 font-medium">{line.doc_num}</td>
                        <td className="p-3 whitespace-nowrap">{line.due_date}</td>
                        <td className="p-3 min-w-[220px] max-w-[320px] truncate">
                          {line.customer_name}
                        </td>
                        <td className="p-3">{line.warehouse_code}</td>
                        <td className="p-3 font-medium">{line.item_code}</td>
                        <td className="p-3 min-w-[220px] max-w-[320px] truncate">{line.item_name}</td>
                        <td className="p-3 text-right font-mono">{formatQty(line.ordered_qty)}</td>
                        <td className="p-3 text-right font-mono">{formatQty(line.delivered_qty)}</td>
                        <td className="p-3 text-right font-mono font-semibold">
                          {formatQty(line.open_qty)}
                        </td>
                        <td className="p-3 text-right font-mono">{line.fulfillment_pct}%</td>
                      </tr>
                    ))}
                    {data.lines.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-muted-foreground">
                          No open sales orders found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
