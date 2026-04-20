import { useNavigate } from 'react-router-dom';
import { ScanBarcode, Package, Boxes, Clock, XCircle } from 'lucide-react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent } from '@/shared/components/ui';

import { usePallets, useBoxes } from '../api';

export default function BarcodeDashboardPage() {
  const navigate = useNavigate();
  const { data: activePallets = [] } = usePallets({ status: 'ACTIVE' });
  const { data: allPallets = [] } = usePallets();
  const { data: activeBoxes = [] } = useBoxes({ status: 'ACTIVE' });
  const { data: allBoxes = [] } = useBoxes();

  const voidedPallets = allPallets.filter((p) => p.status === 'VOID').length;

  const cards = [
    {
      title: 'Active Pallets',
      value: activePallets.length,
      icon: Package,
      color: 'text-blue-600 bg-blue-50',
      path: '/barcode/pallets?status=ACTIVE',
    },
    {
      title: 'Total Boxes',
      value: activeBoxes.length,
      icon: Boxes,
      color: 'text-green-600 bg-green-50',
      path: '/barcode/boxes?status=ACTIVE',
    },
    {
      title: 'All Pallets',
      value: allPallets.length,
      icon: ScanBarcode,
      color: 'text-purple-600 bg-purple-50',
      path: '/barcode/pallets',
    },
    {
      title: 'Voided Pallets',
      value: voidedPallets,
      icon: XCircle,
      color: 'text-red-600 bg-red-50',
      path: '/barcode/pallets?status=VOID',
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Barcode"
        subtitle="Pallet and box tracking, label management"
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
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent pallets */}
      {activePallets.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Recent Pallets
            </h3>
            <div className="space-y-2">
              {activePallets.slice(0, 5).map((pallet) => (
                <div
                  key={pallet.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted"
                  onClick={() => navigate(`/barcode/pallets/${pallet.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium">{pallet.pallet_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {pallet.item_name || pallet.item_code} &middot; Batch: {pallet.batch_number} &middot;{' '}
                      {pallet.box_count} boxes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{pallet.total_qty} {pallet.uom}</p>
                    <p className="text-xs text-muted-foreground">{pallet.current_warehouse}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
