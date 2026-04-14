import { Download,Receipt, Search } from 'lucide-react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { DashboardLoading } from '@/shared/components/dashboard/DashboardLoading';
import { Card, CardContent } from '@/shared/components/ui';

import { useBillingOverview, useWMSWarehouses } from '../api';
import type { BillingStatus } from '../types';

const STATUS_BADGE: Record<BillingStatus, string> = {
  FULLY_BILLED: 'bg-green-100 text-green-700',
  PARTIALLY_BILLED: 'bg-amber-100 text-amber-700',
  UNBILLED: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<BillingStatus, string> = {
  FULLY_BILLED: '#22c55e',
  PARTIALLY_BILLED: '#f59e0b',
  UNBILLED: '#ef4444',
};

function formatValue(val: number): string {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
  return val.toFixed(2);
}

export default function BillingTrackerPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: whList } = useWMSWarehouses();
  const { data, isLoading } = useBillingOverview({
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    warehouse_code: warehouseCode || undefined,
  });

  const filteredItems =
    data?.items.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          item.item_code.toLowerCase().includes(s) ||
          item.item_name.toLowerCase().includes(s)
        );
      }
      return true;
    }) ?? [];

  const handleExport = () => {
    if (!filteredItems.length) return;
    const headers = [
      'Item Code',
      'Item Name',
      'Warehouse',
      'Received Qty',
      'Received Value',
      'Billed Qty',
      'Billed Value',
      'Unbilled Qty',
      'Unbilled Value',
      'Status',
    ];
    const csv = [
      headers.join(','),
      ...filteredItems.map((i) =>
        [
          i.item_code,
          `"${i.item_name}"`,
          i.warehouse_code,
          i.received_qty,
          i.received_value,
          i.billed_qty,
          i.billed_value,
          i.unbilled_qty,
          i.unbilled_value,
          i.status,
        ].join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart data
  const pieData = data
    ? [
        { name: 'Fully Billed', value: data.summary.fully_billed_count, color: STATUS_COLORS.FULLY_BILLED },
        { name: 'Partially Billed', value: data.summary.partially_billed_count, color: STATUS_COLORS.PARTIALLY_BILLED },
        { name: 'Unbilled', value: data.summary.unbilled_count, color: STATUS_COLORS.UNBILLED },
      ].filter((d) => d.value > 0)
    : [];

  const comparisonData = data
    ? [
        { name: 'Received', value: data.summary.total_received_value },
        { name: 'Billed', value: data.summary.total_billed_value },
        { name: 'Unbilled', value: data.summary.total_unbilled_value },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <DashboardHeader
          title="Billing Tracker"
          subtitle="GRPO received vs AP invoice reconciliation"
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
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From Date"
            />
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To Date"
            />
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
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="FULLY_BILLED">Fully Billed</option>
              <option value="PARTIALLY_BILLED">Partially Billed</option>
              <option value="UNBILLED">Unbilled</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search item..."
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            {[
              { label: 'Received Value', val: `\u20B9${formatValue(data.summary.total_received_value)}`, color: 'text-blue-600' },
              { label: 'Billed Value', val: `\u20B9${formatValue(data.summary.total_billed_value)}`, color: 'text-green-600' },
              { label: 'Unbilled Value', val: `\u20B9${formatValue(data.summary.total_unbilled_value)}`, color: 'text-red-600' },
              { label: 'Fully Billed', val: data.summary.fully_billed_count.toString(), color: 'text-green-600' },
              { label: 'Partial', val: data.summary.partially_billed_count.toString(), color: 'text-amber-600' },
              { label: 'Unbilled', val: data.summary.unbilled_count.toString(), color: 'text-red-600' },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-3 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Billing Status Pie */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-600" />
                  Billing Status Distribution
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Received vs Billed Bar */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Received vs Billed vs Unbilled</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis tickFormatter={(v) => formatValue(v)} fontSize={12} />
                      <Tooltip
                        formatter={(value: number) => [`\u20B9 ${formatValue(value)}`, 'Value']}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#22c55e" />
                        <Cell fill="#ef4444" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Billing Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                      <th scope="col" className="p-3">Item Code</th>
                      <th scope="col" className="p-3">Item Name</th>
                      <th scope="col" className="p-3">Warehouse</th>
                      <th scope="col" className="p-3 text-right">Received Qty</th>
                      <th scope="col" className="p-3 text-right">Billed Qty</th>
                      <th scope="col" className="p-3 text-right">Unbilled Qty</th>
                      <th scope="col" className="p-3 text-right">Unbilled Value</th>
                      <th scope="col" className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr
                        key={`${item.item_code}-${item.warehouse_code}-${idx}`}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="p-3 font-medium">{item.item_code}</td>
                        <td className="p-3 max-w-[200px] truncate">{item.item_name}</td>
                        <td className="p-3">{item.warehouse_code}</td>
                        <td className="p-3 text-right font-mono">
                          {item.received_qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {item.billed_qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {item.unbilled_qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {item.unbilled_value > 0 ? `\u20B9${formatValue(item.unbilled_value)}` : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[item.status]}`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No billing data found
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
