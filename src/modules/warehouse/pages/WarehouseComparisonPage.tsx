import { AlertTriangle,Warehouse } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { DashboardLoading } from '@/shared/components/dashboard/DashboardLoading';
import { Card, CardContent } from '@/shared/components/ui';

import { useWarehouseSummary } from '../api';

function formatValue(val: number): string {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
  return val.toFixed(0);
}

export default function WarehouseComparisonPage() {
  const { data, isLoading } = useWarehouseSummary();

  if (isLoading) return <DashboardLoading />;

  const warehouses = data?.warehouses ?? [];

  // Sort by value for charts
  const byValue = [...warehouses].sort((a, b) => b.total_value - a.total_value).slice(0, 15);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Warehouse Comparison"
        subtitle="Compare stock metrics across all warehouses"
      />

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((wh) => (
          <Card key={wh.warehouse_code} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold">{wh.warehouse_code}</span>
                </div>
                {(wh.critical_stock_count > 0 || wh.zero_stock_count > 0) && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2 truncate">{wh.warehouse_name}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Items</p>
                  <p className="font-semibold">{wh.total_items}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Value</p>
                  <p className="font-semibold">{'\u20B9'}{formatValue(wh.total_value)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Low Stock</p>
                  <p className={`font-semibold ${wh.low_stock_count > 0 ? 'text-amber-600' : ''}`}>
                    {wh.low_stock_count}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Critical/Zero</p>
                  <p className={`font-semibold ${wh.critical_stock_count + wh.zero_stock_count > 0 ? 'text-red-600' : ''}`}>
                    {wh.critical_stock_count + wh.zero_stock_count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Value Comparison */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Stock Value by Warehouse</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byValue}
                  layout="vertical"
                  margin={{ left: 60, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatValue(v)} />
                  <YAxis type="category" dataKey="warehouse_code" width={55} fontSize={11} />
                  <Tooltip
                    formatter={(value: number) => [`\u20B9 ${formatValue(value)}`, 'Value']}
                  />
                  <Bar dataKey="total_value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Items Count + Health */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Stock Health by Warehouse</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byValue}
                  layout="vertical"
                  margin={{ left: 60, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="warehouse_code" width={55} fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="low_stock_count" name="Low" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="critical_stock_count" name="Critical" stackId="a" fill="#ef4444" />
                  <Bar dataKey="overstock_count" name="Overstock" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="zero_stock_count" name="Zero" stackId="a" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
