import { X, Package, Warehouse } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Card, CardContent } from '@/shared/components/ui';
import { DashboardLoading } from '@/shared/components/dashboard/DashboardLoading';

import { useItemDetail, useStockMovements } from '../api';

interface Props {
  itemCode: string;
  onClose: () => void;
}

function formatValue(val: number): string {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
  return val.toFixed(2);
}

export default function ItemDetailModal({ itemCode, onClose }: Props) {
  const { data: detail, isLoading: loadingDetail } = useItemDetail(itemCode);
  const { data: movData, isLoading: loadingMov } = useStockMovements({
    item_code: itemCode,
    limit: 20,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 overflow-y-auto">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">{itemCode}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {loadingDetail ? (
            <DashboardLoading />
          ) : detail?.item ? (
            <>
              {/* Item Info */}
              <div>
                <h3 className="text-base font-medium">{detail.item.item_name}</h3>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Group: {detail.item.item_group || '-'}</span>
                  <span>UoM: {detail.item.uom}</span>
                  <span>Price: {'\u20B9'}{detail.item.last_purchase_price.toFixed(2)}</span>
                </div>
              </div>

              {/* Stock Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total On Hand', val: detail.stock_summary.total_on_hand },
                  { label: 'Committed', val: detail.stock_summary.total_committed },
                  { label: 'Available', val: detail.stock_summary.total_available },
                  { label: 'Total Value', val: detail.stock_summary.total_value, isCurrency: true },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold">
                        {s.isCurrency ? `\u20B9${formatValue(s.val)}` : s.val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Warehouse Breakdown Chart */}
              {detail.warehouse_breakdown.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      Warehouse Breakdown
                    </h4>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={detail.warehouse_breakdown}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="warehouse_code" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Bar dataKey="on_hand" name="On Hand" fill="#6366f1" />
                          <Bar dataKey="committed" name="Committed" fill="#f59e0b" />
                          <Bar dataKey="available" name="Available" fill="#22c55e" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">Item not found</p>
          )}

          {/* Movement History */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Recent Movements</h4>
              {loadingMov ? (
                <DashboardLoading />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-3">Date</th>
                        <th className="pb-2 pr-3">Type</th>
                        <th className="pb-2 pr-3">Warehouse</th>
                        <th className="pb-2 pr-3">Direction</th>
                        <th className="pb-2 pr-3 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movData?.movements.map((m, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-1.5 pr-3 whitespace-nowrap">
                            {m.date ? new Date(m.date).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-1.5 pr-3 text-xs">{m.transaction_type}</td>
                          <td className="py-1.5 pr-3">{m.warehouse_code}</td>
                          <td className="py-1.5 pr-3">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                m.direction === 'IN'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {m.direction}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-right font-mono">
                            {m.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {(!movData?.movements || movData.movements.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-muted-foreground">
                            No movements found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
