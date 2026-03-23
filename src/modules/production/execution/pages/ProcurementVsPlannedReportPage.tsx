import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/shared/components/ui';
import { SearchableSelect } from '@/shared/components';

import { useSAPOrders, useProcurementVsPlannedReport } from '../api';

const STATUS_COLORS: Record<string, string> = {
  fulfilled: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  shortage: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  excess: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

function ProcurementVsPlannedReportPage() {
  const navigate = useNavigate();
  const [selectedDocEntry, setSelectedDocEntry] = useState<number | null>(null);

  const { data: sapOrders, isLoading: loadingSAP, isError: sapError } = useSAPOrders();
  const { data, isLoading } = useProcurementVsPlannedReport(selectedDocEntry);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title="Procurement vs Planned"
        description="Compare BOM material requirements against procurement and actual consumption"
      />

      <Card>
        <CardContent className="p-4">
          <SearchableSelect
            inputId="sap-order-select"
            items={sapOrders ?? []}
            isLoading={loadingSAP}
            isError={sapError}
            placeholder="Search SAP Production Orders..."
            getItemKey={(o) => o.DocEntry}
            getItemLabel={(o) => `#${o.DocNum} — ${o.ProdName} (Planned: ${o.PlannedQty})`}
            filterFn={(item, search) =>
              `${item.DocNum} ${item.ProdName} ${item.ItemCode}`
                .toLowerCase()
                .includes(search.toLowerCase())
            }
            renderItem={(item) => (
              <div>
                <span className="font-medium">#{item.DocNum}</span>{' '}
                <span className="text-muted-foreground">— {item.ProdName}</span>{' '}
                <span className="text-xs text-muted-foreground">
                  (Planned: {item.PlannedQty})
                </span>
              </div>
            )}
            loadingText="Loading SAP orders..."
            emptyText="No SAP orders available"
            notFoundText="No matching orders found"
            onItemSelect={(order) => setSelectedDocEntry(order.DocEntry)}
            onClear={() => setSelectedDocEntry(null)}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="p-8 animate-pulse bg-muted/50" /></Card>
      ) : data ? (
        <>
          {/* Header Info */}
          {data.product_name && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Product</p>
                <p className="text-lg font-semibold">{data.product_name}</p>
                <p className="text-sm text-muted-foreground mt-1">SAP Order: #{data.sap_doc_num}</p>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Materials</p>
                <p className="text-2xl font-bold">{data.summary.total_items}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Fully Fulfilled</p>
                <p className="text-2xl font-bold text-green-600">{data.summary.fully_fulfilled}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Shortages</p>
                <p className="text-2xl font-bold text-red-600">{data.summary.shortage_items}</p>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          {data.items.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" /> Material Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Item Code</th>
                        <th className="text-left p-2 font-medium">Material</th>
                        <th className="text-left p-2 font-medium">UoM</th>
                        <th className="text-right p-2 font-medium">BOM Planned</th>
                        <th className="text-right p-2 font-medium">Procured</th>
                        <th className="text-right p-2 font-medium">Consumed</th>
                        <th className="text-right p-2 font-medium">Procurement %</th>
                        <th className="text-right p-2 font-medium">Excess / Shortage</th>
                        <th className="text-center p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item) => (
                        <tr key={item.item_code} className="border-b hover:bg-muted/30">
                          <td className="p-2 font-mono text-xs">{item.item_code}</td>
                          <td className="p-2">{item.item_name}</td>
                          <td className="p-2">{item.uom}</td>
                          <td className="p-2 text-right">{item.bom_planned_qty.toLocaleString()}</td>
                          <td className="p-2 text-right">{item.procured_qty.toLocaleString()}</td>
                          <td className="p-2 text-right">{item.consumed_qty.toLocaleString()}</td>
                          <td className="p-2 text-right">
                            <span className={item.procurement_fulfillment_pct >= 100 ? 'text-green-600' : 'text-red-600'}>
                              {item.procurement_fulfillment_pct}%
                            </span>
                          </td>
                          <td className={`p-2 text-right font-medium ${item.excess_shortage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.excess_shortage >= 0 ? '+' : ''}{item.excess_shortage.toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant="outline" className={STATUS_COLORS[item.status]}>
                              {item.status === 'fulfilled' ? 'Fulfilled' : item.status === 'shortage' ? 'Shortage' : 'Excess'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No BOM components found for this order.
              </CardContent>
            </Card>
          )}
        </>
      ) : selectedDocEntry ? null : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Select a SAP Production Order to view procurement comparison.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProcurementVsPlannedReportPage;
