import { useState } from 'react';
import { AlertTriangle, Download, Search, TimerReset } from 'lucide-react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { DashboardLoading } from '@/shared/components/dashboard/DashboardLoading';
import { Card, CardContent } from '@/shared/components/ui';

import { useBatchExpiry, useWMSWarehouses } from '../api';
import type { BatchExpiryStatus } from '../types';

const STATUS_BADGE: Record<BatchExpiryStatus, string> = {
  EXPIRED: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-orange-100 text-orange-700',
  WARNING: 'bg-amber-100 text-amber-700',
  OK: 'bg-green-100 text-green-700',
  NO_EXPIRY: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<BatchExpiryStatus, string> = {
  EXPIRED: '#ef4444',
  CRITICAL: '#f97316',
  WARNING: '#f59e0b',
  OK: '#22c55e',
  NO_EXPIRY: '#94a3b8',
};

function formatQty(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDays(days: number | null): string {
  if (days === null) return '-';
  if (days < 0) return `${Math.abs(days)} days expired`;
  if (days === 0) return 'Expires today';
  return `${days} days`;
}

export default function BatchExpiryPage() {
  const [search, setSearch] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [expiryStatus, setExpiryStatus] = useState('');
  const [daysToExpiry, setDaysToExpiry] = useState('90');

  const { data: whList } = useWMSWarehouses();
  const { data, isLoading } = useBatchExpiry({
    search: search || undefined,
    warehouse_code: warehouseCode || undefined,
    expiry_status: expiryStatus || undefined,
    days_to_expiry: daysToExpiry ? Number(daysToExpiry) : undefined,
    limit: 500,
  });

  const pieData = data
    ? [
        { name: 'Expired', value: data.summary.expired_count, status: 'EXPIRED' as const },
        { name: 'Critical', value: data.summary.critical_count, status: 'CRITICAL' as const },
        { name: 'Warning', value: data.summary.warning_count, status: 'WARNING' as const },
        { name: 'OK', value: data.summary.ok_count, status: 'OK' as const },
      ].filter((item) => item.value > 0)
    : [];

  const handleExport = () => {
    if (!data?.batches.length) return;
    const headers = [
      'Item Code',
      'Item Name',
      'Batch',
      'Warehouse',
      'Quantity',
      'Expiry Date',
      'Days To Expiry',
      'Status',
    ];
    const csv = [
      headers.join(','),
      ...data.batches.map((batch) =>
        [
          batch.item_code,
          `"${batch.item_name}"`,
          `"${batch.batch_number}"`,
          batch.warehouse_code,
          batch.quantity,
          batch.expiry_date,
          batch.days_to_expiry ?? '',
          batch.expiry_status,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_expiry_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <DashboardHeader
          title="Batch Expiry"
          subtitle="FEFO visibility for batch-managed stock"
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Item, name, batch"
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
              value={expiryStatus}
              onChange={(e) => setExpiryStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="EXPIRED">Expired</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="OK">OK</option>
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={daysToExpiry}
              onChange={(e) => setDaysToExpiry(e.target.value)}
            >
              <option value="30">Next 30 days</option>
              <option value="90">Next 90 days</option>
              <option value="180">Next 180 days</option>
              <option value="">All batches</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <DashboardLoading />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            {[
              { label: 'Batches', value: data.summary.batch_count.toLocaleString(), color: '' },
              { label: 'Expired', value: data.summary.expired_count.toString(), color: 'text-red-600' },
              { label: 'Critical', value: data.summary.critical_count.toString(), color: 'text-orange-600' },
              { label: 'Warning', value: data.summary.warning_count.toString(), color: 'text-amber-600' },
              { label: 'OK', value: data.summary.ok_count.toString(), color: 'text-green-600' },
              { label: 'Quantity', value: formatQty(data.summary.total_quantity), color: '' },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-3 text-center">
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TimerReset className="h-4 w-4 text-blue-600" />
                  Expiry Distribution
                </h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Earliest Expiring Batches
                </h3>
                <div className="space-y-3">
                  {data.batches.slice(0, 8).map((batch) => (
                    <div
                      key={`${batch.item_code}-${batch.batch_number}-${batch.warehouse_code}`}
                      className="flex items-center justify-between gap-3 border-b last:border-0 pb-3 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{batch.item_code}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {batch.batch_number} - {batch.warehouse_code}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm">{formatDays(batch.days_to_expiry)}</p>
                        <p className="text-xs text-muted-foreground">{formatQty(batch.quantity)}</p>
                      </div>
                    </div>
                  ))}
                  {data.batches.length === 0 && (
                    <p className="text-sm text-muted-foreground">No batches found</p>
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
                      <th className="p-3">Item Code</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Batch</th>
                      <th className="p-3">Warehouse</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3">Expiry</th>
                      <th className="p-3 text-right">Days</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.batches.map((batch) => (
                      <tr
                        key={`${batch.item_code}-${batch.batch_number}-${batch.warehouse_code}`}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="p-3 font-medium">{batch.item_code}</td>
                        <td className="p-3 min-w-[220px] max-w-[320px] truncate">{batch.item_name}</td>
                        <td className="p-3 min-w-[150px] max-w-[220px] truncate">{batch.batch_number}</td>
                        <td className="p-3">{batch.warehouse_code}</td>
                        <td className="p-3 text-right font-mono">{formatQty(batch.quantity)}</td>
                        <td className="p-3 whitespace-nowrap">{batch.expiry_date || '-'}</td>
                        <td className="p-3 text-right font-mono">{formatDays(batch.days_to_expiry)}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[batch.expiry_status]}`}>
                            {batch.expiry_status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.batches.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No batches found
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
