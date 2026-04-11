import { AlertTriangle, Package, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  NativeSelect,
} from '@/shared/components/ui';

import { useWarehouseFilterOptions, useWarehouseInventory } from '../api';
import type { InventoryFilters, InventoryItem } from '../types';

export default function InventoryBrowserPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [searchInput, setSearchInput] = useState('');

  const { data: filterOptions } = useWarehouseFilterOptions();
  const { data: inventory, isLoading, error } = useWarehouseInventory(filters);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput || undefined }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const stats = useMemo(() => {
    if (!inventory) return null;
    return inventory.meta;
  }, [inventory]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Inventory"
        description="Search and browse stock across all warehouses"
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item code or name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-1 block">Warehouse</label>
              <NativeSelect
                value={filters.warehouse || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    warehouse: e.target.value || undefined,
                  }))
                }
              >
                <option value="">All Warehouses</option>
                {filterOptions?.warehouses.map((wh) => (
                  <option key={wh.code} value={wh.code}>
                    {wh.code} - {wh.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-1 block">Item Group</label>
              <NativeSelect
                value={filters.item_group || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    item_group: e.target.value || undefined,
                  }))
                }
              >
                <option value="">All Groups</option>
                {filterOptions?.item_groups.map((ig) => (
                  <option key={ig.code} value={String(ig.code)}>
                    {ig.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{stats.total_items}</span> items
          </span>
          <span>
            <span className="font-medium text-foreground">{stats.warehouse_count}</span> warehouses
          </span>
          {stats.below_min_count > 0 && (
            <span className="flex items-center gap-1 text-orange-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {stats.below_min_count} below minimum
            </span>
          )}
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <p className="text-muted-foreground text-sm p-6">Loading inventory...</p>
          )}
          {error && (
            <p className="text-destructive text-sm p-6">
              Failed to load inventory data. SAP may be unavailable.
            </p>
          )}
          {inventory && inventory.data.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Package className="h-8 w-8" />
              <p>No items found matching your filters.</p>
            </div>
          )}
          {inventory && inventory.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground bg-muted/30">
                    <th className="py-3 px-4">Item Code</th>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4 text-right">On Hand</th>
                    <th className="py-3 px-4 text-right">Available</th>
                    <th className="py-3 px-4">UOM</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.data.map((item: InventoryItem, i: number) => (
                    <tr
                      key={`${item.item_code}-${item.warehouse}-${i}`}
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() =>
                        navigate(
                          `/warehouse/inventory/${encodeURIComponent(item.item_code)}`,
                        )
                      }
                    >
                      <td className="py-3 px-4 font-mono text-xs">
                        {item.item_code}
                      </td>
                      <td className="py-3 px-4">{item.item_name}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {item.item_group}
                      </td>
                      <td className="py-3 px-4">{item.warehouse}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {item.on_hand}
                      </td>
                      <td className="py-3 px-4 text-right">{item.available}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {item.uom}
                      </td>
                      <td className="py-3 px-4">
                        {item.is_below_min && (
                          <Badge variant="warning">Low Stock</Badge>
                        )}
                        {item.is_batch_managed && (
                          <Badge variant="secondary" className="ml-1">
                            Batch
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
