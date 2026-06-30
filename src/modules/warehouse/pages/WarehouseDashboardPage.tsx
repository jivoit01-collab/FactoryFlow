import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  ClipboardList,
  Clock,
  PackageCheck,
  Plus,
  Truck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent } from '@/shared/components/ui';

import { useBOMRequests, useBSTIncoming, useBSTTransfers, useFGReceipts } from '../api';

const BST_TERMINAL = ['RECEIVED', 'PARTIALLY_RECEIVED', 'CLOSED', 'CANCELLED'];

export default function WarehouseDashboardPage() {
  const navigate = useNavigate();
  const { data: pendingBOM = [] } = useBOMRequests('PENDING');
  const { data: allBOM = [] } = useBOMRequests();
  const { data: pendingFG = [] } = useFGReceipts('PENDING');
  const { data: receivedFG = [] } = useFGReceipts('RECEIVED');
  const { data: outgoingBST = [] } = useBSTTransfers();
  const { data: incomingBST = [] } = useBSTIncoming();

  const activeBST = outgoingBST.filter((t) => !BST_TERMINAL.includes(t.status));

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
    {
      title: 'Branch Transfers (active)',
      value: activeBST.length,
      icon: ArrowLeftRight,
      color: 'text-indigo-600 bg-indigo-50',
      path: '/warehouse/bst',
    },
    {
      title: 'Incoming to Receive',
      value: incomingBST.length,
      icon: Truck,
      color: 'text-teal-600 bg-teal-50',
      path: '/warehouse/bst',
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Warehouse"
        subtitle="Material requests, stock management, finished goods, and branch transfers"
        primaryAction={{
          label: 'New Branch Transfer',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => navigate('/warehouse/bst/new'),
        }}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
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
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Incoming branch transfers awaiting receipt */}
      {incomingBST.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Truck className="h-4 w-4 text-teal-600" />
              Incoming Branch Transfers
            </h3>
            <div className="space-y-2">
              {incomingBST.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted"
                  onClick={() => navigate(`/warehouse/bst/incoming/${t.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium">{t.entry_no}</p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      {t.sap_from_warehouse || '—'}
                      <ArrowRight className="h-3 w-3" />
                      {t.sap_to_warehouse || '—'}
                      {t.sap_doc_num ? ` · SAP #${t.sap_doc_num}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t.scanned_box_count} box{t.scanned_box_count === 1 ? '' : 'es'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending BOM approvals */}
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
