import { ArrowRight, CheckCircle2, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { useBSTGateOutwards } from '@/modules/warehouse/api';
import { formatBstDateTime } from '@/modules/warehouse/pages/bst/bstFormat';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Card, CardContent } from '@/shared/components/ui';

import { DateRangePicker } from '../../components';

export default function BSTGateOutListPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange, resetDateRange } = useGlobalDateRange();
  const { data: transfers = [], isLoading } = useBSTGateOutwards({
    from_date: dateRange.from,
    to_date: dateRange.to,
  });

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="BST Out"
        description="Branch transfers approved by the warehouse, awaiting vehicle gate-out"
      >
        <DateRangePicker
          date={dateRangeAsDateObjects}
          className="w-full sm:w-[300px]"
          onDateChange={(date) => {
            if (date && 'from' in date) {
              setDateRange(date);
            } else {
              resetDateRange();
            }
          }}
        />
      </DashboardHeader>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Loading…</p>
      ) : transfers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No vehicles awaiting gate-out</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 px-3">Entry No.</th>
                <th className="py-2 px-3">Route</th>
                <th className="py-2 px-3">SAP Doc</th>
                <th className="py-2 px-3">Vehicle</th>
                <th className="py-2 px-3">Driver</th>
                <th className="py-2 px-3 text-right">Boxes</th>
                <th className="py-2 px-3">Approved</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr
                  key={t.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/gate/bst-out/${t.id}`)}
                >
                  <td className="py-2 px-3 font-medium">{t.entry_no}</td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center gap-1">
                      {t.sap_from_warehouse || '—'}
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      {t.sap_to_warehouse || '—'}
                    </span>
                  </td>
                  <td className="py-2 px-3">{t.sap_doc_num || '—'}</td>
                  <td className="py-2 px-3">{t.vehicle_number || '—'}</td>
                  <td className="py-2 px-3">{t.driver_name || '—'}</td>
                  <td className="py-2 px-3 text-right">{t.scanned_box_count}</td>
                  <td className="py-2 px-3">
                    <Badge variant="outline" className="text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {formatBstDateTime(t.scan_approved_at)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
