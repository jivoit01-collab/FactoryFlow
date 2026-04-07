import { useState } from 'react';
import {
  Package,
  Warehouse,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  IndianRupee,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { DashboardLoading } from '@/shared/components/dashboard/DashboardLoading';
import { DashboardError } from '@/shared/components/dashboard/DashboardError';
import { Card, CardContent } from '@/shared/components/ui';

import { useWMSDashboard, useWMSWarehouses } from '../api';

const HEALTH_COLORS: Record<string, string> = {
  normal: '#22c55e',
  low: '#f59e0b',
  critical: '#ef4444',
  zero: '#94a3b8',
  overstock: '#3b82f6',
};

const GROUP_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
];

function formatValue(val: number): string {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
  return val.toFixed(0);
}

function formatQty(val: number): string {
  if (val >= 1000000) return `${(val / 1000000).toFixed(2)} M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
  return val.toFixed(0);
}

export default function WMSDashboardPage() {
  const [warehouseCode, setWarehouseCode] = useState<string>('');
  const { data: whList } = useWMSWarehouses();
  const { data, isLoading, isError, error } = useWMSDashboard(warehouseCode || undefined);

  if (isLoading) return <DashboardLoading />;
  if (isError) return <DashboardError error={error} />;
  if (!data) return null;

  const { kpis, stock_by_warehouse, stock_by_group, top_items_by_value, stock_health, recent_movements } = data;

  const healthData = Object.entries(stock_health)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: HEALTH_COLORS[key],
    }));

  const kpiCards = [
    {
      title: 'Total Items',
      value: kpis.total_items.toLocaleString(),
      icon: Package,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Total Stock Value',
      value: `\u20B9 ${formatValue(kpis.total_value)}`,
      icon: IndianRupee,
      color: 'text-green-600 bg-green-50',
    },
    {
      title: 'Low Stock',
      value: kpis.low_stock.toLocaleString(),
      icon: TrendingDown,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      title: 'Critical / Zero',
      value: `${kpis.critical_stock} / ${kpis.zero_stock}`,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header + warehouse filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <DashboardHeader
          title="Warehouse Management"
          subtitle="Stock visibility, movements, and analytics"
        />
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={warehouseCode}
          onChange={(e) => setWarehouseCode(e.target.value)}
        >
          <option value="">All Warehouses</option>
          {whList?.warehouses.map((w) => (
            <option key={w.code} value={w.code}>
              {w.code} - {w.name}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1: Warehouse Bar + Health Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock by Warehouse */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-blue-600" />
              Stock Value by Warehouse
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stock_by_warehouse.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 60, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatValue(v)}
                  />
                  <YAxis type="category" dataKey="warehouse_code" width={55} fontSize={12} />
                  <Tooltip
                    formatter={(value: number) => [`\u20B9 ${formatValue(value)}`, 'Value']}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stock Health Donut */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Stock Health Distribution
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {healthData.map((entry, idx) => (
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
      </div>

      {/* Charts Row 2: Item Group Pie + Top Items Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock by Item Group */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-violet-600" />
              Stock by Item Group
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stock_by_group.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ group_name, percent }) =>
                      `${group_name.slice(0, 12)} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {stock_by_group.slice(0, 8).map((_, idx) => (
                      <Cell key={idx} fill={GROUP_COLORS[idx % GROUP_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`\u20B9 ${formatValue(value)}`, 'Value']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Items by Value */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Top 10 Items by Value
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top_items_by_value}
                  layout="vertical"
                  margin={{ left: 80, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatValue(v)} />
                  <YAxis
                    type="category"
                    dataKey="item_code"
                    width={75}
                    fontSize={11}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'value'
                        ? `\u20B9 ${formatValue(value)}`
                        : formatQty(value),
                      name === 'value' ? 'Value' : 'Quantity',
                    ]}
                    labelFormatter={(label) => {
                      const item = top_items_by_value.find((i) => i.item_code === label);
                      return item ? `${item.item_code} - ${item.item_name}` : label;
                    }}
                  />
                  <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-blue-600" />
            Recent Movements
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Item</th>
                  <th className="pb-2 pr-4">Warehouse</th>
                  <th className="pb-2 pr-4">Direction</th>
                  <th className="pb-2 pr-4 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {recent_movements.map((m, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {m.date ? new Date(m.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="font-medium">{m.item_code}</span>
                      <span className="text-muted-foreground ml-1 hidden sm:inline">
                        {m.item_name?.slice(0, 25)}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{m.warehouse}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          m.direction === 'IN'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {m.direction}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {m.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
