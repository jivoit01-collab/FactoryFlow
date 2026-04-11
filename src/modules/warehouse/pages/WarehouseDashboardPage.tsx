import {
  AlertTriangle,
  ArrowRight,
  Package,
  Search,
  Warehouse,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SummaryCard } from '@/shared/components/dashboard/SummaryCard';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  NativeSelect,
} from '@/shared/components/ui';

import { useWarehouseDashboard, useWarehouseFilterOptions } from '../api';
import type { LowStockAlert } from '../types';

export default function WarehouseDashboardPage() {
  const navigate = useNavigate();
  const [warehouseCode, setWarehouseCode] = useState<string>('');

  const { data: filterOptions } = useWarehouseFilterOptions();
  const { data: dashboard, isLoading, error } = useWarehouseDashboard(
    warehouseCode || undefined,
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Warehouse"
        description="Inventory visibility, stock alerts, and warehouse operations"
      >
        <NativeSelect
          value={warehouseCode}
          onChange={(e) => setWarehouseCode(e.target.value)}
          className="w-48"
        >
          <option value="">All Warehouses</option>
          {filterOptions?.warehouses.map((wh) => (
            <option key={wh.code} value={wh.code}>
              {wh.code} - {wh.name}
            </option>
          ))}
        </NativeSelect>
      </DashboardHeader>

      {/* Quick Action Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Inventory"
          value="Browse"
          icon={Package}
          onClick={() => navigate('/warehouse/inventory')}
        />
        <SummaryCard
          title="Low Stock Alerts"
          value={dashboard?.low_stock_count ?? '—'}
          icon={AlertTriangle}
          onClick={() =>
            navigate('/warehouse/inventory?filter=below_min')
          }
        />
        <SummaryCard
          title="Search Items"
          value="Search"
          icon={Search}
          onClick={() => navigate('/warehouse/inventory')}
        />
      </div>

      {/* Low Stock Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Low Stock Alerts
            {dashboard && dashboard.low_stock_count > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({dashboard.low_stock_count} items below minimum)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-muted-foreground text-sm py-4">Loading alerts...</p>
          )}
          {error && (
            <p className="text-destructive text-sm py-4">
              Failed to load dashboard data. SAP may be unavailable.
            </p>
          )}
          {dashboard && dashboard.low_stock_alerts.length === 0 && (
            <p className="text-muted-foreground text-sm py-4">
              No low stock alerts. All items are above minimum levels.
            </p>
          )}
          {dashboard && dashboard.low_stock_alerts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Item Code</th>
                    <th className="py-2 pr-4">Item Name</th>
                    <th className="py-2 pr-4">Warehouse</th>
                    <th className="py-2 pr-4 text-right">On Hand</th>
                    <th className="py-2 pr-4 text-right">Min Stock</th>
                    <th className="py-2 pr-4 text-right">Shortage</th>
                    <th className="py-2">UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.low_stock_alerts.map((alert: LowStockAlert, i: number) => (
                    <tr
                      key={`${alert.item_code}-${alert.warehouse}-${i}`}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() =>
                        navigate(`/warehouse/inventory/${encodeURIComponent(alert.item_code)}`)
                      }
                    >
                      <td className="py-2 pr-4 font-mono text-xs">
                        {alert.item_code}
                      </td>
                      <td className="py-2 pr-4">{alert.item_name}</td>
                      <td className="py-2 pr-4">{alert.warehouse}</td>
                      <td className="py-2 pr-4 text-right">{alert.on_hand}</td>
                      <td className="py-2 pr-4 text-right">{alert.min_stock}</td>
                      <td className="py-2 pr-4 text-right text-destructive font-medium">
                        -{alert.shortage}
                      </td>
                      <td className="py-2">{alert.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dashboard.low_stock_count > 20 && (
                <button
                  className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline"
                  onClick={() => navigate('/warehouse/inventory?filter=below_min')}
                >
                  View all {dashboard.low_stock_count} alerts
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
