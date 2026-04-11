import { ArrowLeft, Box, Clock, Package } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  NativeSelect,
} from '@/shared/components/ui';

import { useMovementHistory, useWarehouseItemDetail } from '../api';
import { TRANS_TYPE_LABELS } from '../constants';
import type { Batch, Movement, MovementHistoryFilters, WarehouseStock } from '../types';

export default function InventoryDetailPage() {
  const navigate = useNavigate();
  const { itemCode } = useParams<{ itemCode: string }>();
  const [movementFilters, setMovementFilters] = useState<MovementHistoryFilters>({});

  const { data: item, isLoading, error } = useWarehouseItemDetail(itemCode);
  const { data: movementData, isLoading: movementsLoading } = useMovementHistory(
    itemCode,
    movementFilters,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DashboardHeader title="Loading..." />
        <p className="text-muted-foreground text-sm">Loading item details...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-6">
        <DashboardHeader title="Item Not Found" />
        <p className="text-destructive text-sm">
          {error ? 'Failed to load item. SAP may be unavailable.' : `Item '${itemCode}' not found.`}
        </p>
        <button
          className="flex items-center gap-1 text-sm text-primary hover:underline"
          onClick={() => navigate('/warehouse/inventory')}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          onClick={() => navigate('/warehouse/inventory')}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </button>
        <DashboardHeader
          title={item.item_name}
          description={`${item.item_code} | ${item.item_group} | ${item.uom}`}
        >
          {item.is_batch_managed && <Badge variant="secondary">Batch Managed</Badge>}
          {item.variety && <Badge variant="outline">{item.variety}</Badge>}
        </DashboardHeader>
      </div>

      {/* Totals */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total On Hand</p>
            <p className="text-2xl font-bold">{item.total_on_hand}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Committed</p>
            <p className="text-2xl font-bold">{item.total_committed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">On Order</p>
            <p className="text-2xl font-bold">{item.total_on_order}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-2xl font-bold text-green-600">{item.total_available}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock by Warehouse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock by Warehouse
          </CardTitle>
        </CardHeader>
        <CardContent>
          {item.warehouse_stock.length === 0 ? (
            <p className="text-muted-foreground text-sm">No stock in any warehouse.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Warehouse</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4 text-right">On Hand</th>
                    <th className="py-2 pr-4 text-right">Committed</th>
                    <th className="py-2 pr-4 text-right">On Order</th>
                    <th className="py-2 pr-4 text-right">Available</th>
                    <th className="py-2 text-right">Min Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {item.warehouse_stock.map((ws: WarehouseStock) => (
                    <tr key={ws.warehouse_code} className="border-b">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {ws.warehouse_code}
                      </td>
                      <td className="py-2 pr-4">{ws.warehouse_name}</td>
                      <td className="py-2 pr-4 text-right font-medium">
                        {ws.on_hand}
                      </td>
                      <td className="py-2 pr-4 text-right">{ws.committed}</td>
                      <td className="py-2 pr-4 text-right">{ws.on_order}</td>
                      <td className="py-2 pr-4 text-right text-green-600">
                        {ws.available}
                      </td>
                      <td className="py-2 text-right">
                        {ws.min_stock > 0 ? ws.min_stock : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batches (if batch-managed) */}
      {item.is_batch_managed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              Available Batches
              <span className="text-sm font-normal text-muted-foreground">
                (FIFO — oldest first)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {item.batches.length === 0 ? (
              <p className="text-muted-foreground text-sm">No batches with stock.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Batch Number</th>
                      <th className="py-2 pr-4">Warehouse</th>
                      <th className="py-2 pr-4 text-right">Quantity</th>
                      <th className="py-2 pr-4">Admission Date</th>
                      <th className="py-2">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.batches.map((batch: Batch, i: number) => (
                      <tr
                        key={`${batch.batch_number}-${batch.warehouse_code}-${i}`}
                        className="border-b"
                      >
                        <td className="py-2 pr-4 font-mono text-xs">
                          {batch.batch_number}
                        </td>
                        <td className="py-2 pr-4">{batch.warehouse_code}</td>
                        <td className="py-2 pr-4 text-right font-medium">
                          {batch.quantity}
                        </td>
                        <td className="py-2 pr-4">
                          {batch.admission_date || '—'}
                        </td>
                        <td className="py-2">{batch.expiry_date || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Movement History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Movement History
            </CardTitle>
            <div className="flex items-center gap-2">
              <NativeSelect
                value={movementFilters.warehouse || ''}
                onChange={(e) =>
                  setMovementFilters((prev) => ({
                    ...prev,
                    warehouse: e.target.value || undefined,
                  }))
                }
                className="w-40 text-sm"
              >
                <option value="">All Warehouses</option>
                {item.warehouse_stock.map((ws: WarehouseStock) => (
                  <option key={ws.warehouse_code} value={ws.warehouse_code}>
                    {ws.warehouse_code}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {movementsLoading && (
            <p className="text-muted-foreground text-sm">Loading movements...</p>
          )}
          {movementData && movementData.movements.length === 0 && (
            <p className="text-muted-foreground text-sm">No movement history found.</p>
          )}
          {movementData && movementData.movements.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Warehouse</th>
                    <th className="py-2 pr-4 text-right">In</th>
                    <th className="py-2 pr-4 text-right">Out</th>
                    <th className="py-2 pr-4 text-right">Balance</th>
                    <th className="py-2">Doc #</th>
                  </tr>
                </thead>
                <tbody>
                  {movementData.movements.map((m: Movement, i: number) => (
                    <tr key={`${m.doc_num}-${i}`} className="border-b">
                      <td className="py-2 pr-4 text-xs">{m.create_date || '—'}</td>
                      <td className="py-2 pr-4">
                        {TRANS_TYPE_LABELS[m.trans_type] || `Type ${m.trans_type}`}
                      </td>
                      <td className="py-2 pr-4">{m.warehouse}</td>
                      <td className="py-2 pr-4 text-right text-green-600">
                        {m.in_qty > 0 ? `+${m.in_qty}` : ''}
                      </td>
                      <td className="py-2 pr-4 text-right text-red-600">
                        {m.out_qty > 0 ? `-${m.out_qty}` : ''}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium">
                        {m.balance}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {m.doc_num}
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
