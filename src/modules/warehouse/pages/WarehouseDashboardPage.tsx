import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Loader2, PackageCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent } from '@/shared/components/ui';

import { useBOMRequests, useFGReceipts } from '../api';

export default function WarehouseDashboardPage() {
  const navigate = useNavigate();
  const pendingBOMQ = useBOMRequests('PENDING');
  const allBOMQ = useBOMRequests();
  const pendingFGQ = useFGReceipts('PENDING');
  const receivedFGQ = useFGReceipts('RECEIVED');

  const pendingBOM = pendingBOMQ.data ?? [];
  const allBOM = allBOMQ.data ?? [];
  const pendingFG = pendingFGQ.data ?? [];
  const receivedFG = receivedFGQ.data ?? [];

  const isLoading =
    pendingBOMQ.isLoading || allBOMQ.isLoading || pendingFGQ.isLoading || receivedFGQ.isLoading;
  const allZero =
    !isLoading &&
    pendingBOM.length === 0 &&
    allBOM.length === 0 &&
    pendingFG.length === 0 &&
    receivedFG.length === 0;

  const cards = [
    {
      title: 'Pending BOM Requests',
      value: pendingBOM.length,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
      path: '/warehouse/bom-requests?status=PENDING',
    },
    {
      title: 'Total BOM Requests',
      value: allBOM.length,
      icon: ClipboardList,
      color: 'text-blue-600 bg-blue-50',
      path: '/warehouse/bom-requests',
    },
    {
      title: 'FG Pending Receipt',
      value: pendingFG.length,
      icon: AlertTriangle,
      color: 'text-orange-600 bg-orange-50',
      path: '/warehouse/fg-receipts?status=PENDING',
    },
    {
      title: 'FG Ready for SAP',
      value: receivedFG.length,
      icon: PackageCheck,
      color: 'text-green-600 bg-green-50',
      path: '/warehouse/fg-receipts?status=RECEIVED',
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Warehouse"
        subtitle="Material requests, stock management, and finished goods"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(card.path)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  {isLoading ? (
                    <Loader2
                      className="h-5 w-5 animate-spin text-muted-foreground"
                      aria-label="Loading"
                    />
                  ) : (
                    <p className="text-2xl font-bold">{card.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* All-clear state — nothing loaded, nothing pending */}
      {allZero && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-3" />
            <p className="font-medium">All clear</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              No BOM requests or finished-goods receipts to action right now.
              New items will appear here as production teams submit them.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      {pendingBOM.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending Approvals
            </h3>
            <div className="space-y-2">
              {pendingBOM.slice(0, 5).map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted"
                  onClick={() => navigate(`/warehouse/bom-requests/${req.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium">
                      BOM #{req.id} — Run #{req.run_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.product} &middot; Qty: {req.required_qty} &middot; {req.lines_count}{' '}
                      materials
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {req.requested_by_name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
