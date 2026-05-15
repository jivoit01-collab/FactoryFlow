import { useState } from 'react';
import { ArrowRight, ArrowRightLeft, Download, Search } from 'lucide-react';
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

import { useTransferOverview, useWMSWarehouses } from '../api';

function formatQty(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function TransferActivityPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [itemCode, setItemCode] = useState('');

  const { data: whList } = useWMSWarehouses();
  const { data, isLoading } = useTransferOverview({
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    from_warehouse: fromWarehouse || undefined,
    to_warehouse: toWarehouse || undefined,
    item_code: itemCode || undefined,
    limit: 300,
  });

  const routeChartData =
    data?.routes.slice(0, 12).map((route) => ({
      route: `${route.from_warehouse} to ${route.to_warehouse}`,
      quantity: route.quantity,
      lines: route.line_count,
    })) ?? [];

  const handleExport = () => {
    if (!data?.transfers.length) return;
    const headers = [
      'Doc Num',
      'Date',
      'From Warehouse',
      'To Warehouse',
      'Item Code',
      'Item Name',
      'Quantity',
      'Comments',
    ];
    const csv = [
      headers.join(','),
      ...data.transfers.map((line) =>
        [
          line.doc_num,
          line.doc_date,
          line.from_warehouse,
          line.to_warehouse,
          line.item_code,
          `"${line.item_name}"`,
          line.quantity,
          `"${line.comments}"`,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_transfers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <DashboardHeader
          title="Transfer Activity"
          subtitle="Warehouse-to-warehouse movement history from SAP"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={fromWarehouse}
              onChange={(e) => setFromWarehouse(e.target.value)}
            >
              <option value="">From any warehouse</option>
              {whList?.warehouses.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code}
                </option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={toWarehouse}
              onChange={(e) => setToWarehouse(e.target.value)}
            >
              <option value="">To any warehouse</option>
              {whList?.warehouses.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Item code"
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
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
              { label: 'Transfers', value: data.summary.transfer_count.toLocaleString() },
              { label: 'Lines', value: data.summary.line_count.toLocaleString() },
              { label: 'Quantity', value: formatQty(data.summary.total_quantity) },
              { label: 'Routes', value: data.summary.route_count.toLocaleString() },
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
                  <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                  Top Transfer Routes
                </h3>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={routeChartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => formatQty(v)} fontSize={12} />
                      <YAxis type="category" dataKey="route" width={80} fontSize={11} />
                      <Tooltip formatter={(value: number) => [formatQty(value), 'Quantity']} />
                      <Bar dataKey="quantity" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Route Volume</h3>
                <div className="space-y-3">
                  {data.routes.slice(0, 8).map((route) => (
                    <div
                      key={`${route.from_warehouse}-${route.to_warehouse}`}
                      className="flex items-center justify-between gap-3 border-b last:border-0 pb-3 last:pb-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span>{route.from_warehouse}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{route.to_warehouse}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {route.transfer_count} transfers, {route.line_count} lines
                        </p>
                      </div>
                      <p className="font-mono text-sm">{formatQty(route.quantity)}</p>
                    </div>
                  ))}
                  {data.routes.length === 0 && (
                    <p className="text-sm text-muted-foreground">No transfer routes found</p>
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
                      <th className="p-3">Doc</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Route</th>
                      <th className="p-3">Item Code</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transfers.map((line) => (
                      <tr
                        key={`${line.doc_entry}-${line.line_num}`}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="p-3 font-medium">{line.doc_num}</td>
                        <td className="p-3 whitespace-nowrap">{line.doc_date}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span>{line.from_warehouse}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span>{line.to_warehouse}</span>
                          </div>
                        </td>
                        <td className="p-3 font-medium">{line.item_code}</td>
                        <td className="p-3 min-w-[220px] max-w-[320px] truncate">{line.item_name}</td>
                        <td className="p-3 text-right font-mono">{formatQty(line.quantity)}</td>
                        <td className="p-3 min-w-[220px] max-w-[340px] truncate text-muted-foreground">
                          {line.comments || '-'}
                        </td>
                      </tr>
                    ))}
                    {data.transfers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No transfers found
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
