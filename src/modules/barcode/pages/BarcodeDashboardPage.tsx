import { Boxes, Layers, Package, Radio, ScanBarcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { useBoxesPage, usePalletsPage, useRecentActivity } from '../api';
import { ActivityRow } from '../components/ActivityRow';

export default function BarcodeDashboardPage() {
  const navigate = useNavigate();
  // Read the true totals from the paginated endpoints' ``count`` -- the plain list
  // is capped at 500 rows, so counting its length pinned every stat card at 500.
  const { data: activePalletsPage } = usePalletsPage({ status: 'ACTIVE', page_size: 1 });
  const { data: allPalletsPage } = usePalletsPage({ page_size: 1 });
  const { data: activeBoxesPage } = useBoxesPage({ status: 'ACTIVE', page_size: 1 });
  const { data: allBoxesPage } = useBoxesPage({ page_size: 1 });

  const { data: activity = [] } = useRecentActivity(15);

  const cards = [
    {
      title: 'Active Pallets',
      value: activePalletsPage?.count ?? 0,
      icon: Package,
      color: 'text-blue-600 bg-blue-50',
      path: '/barcode/pallets?status=ACTIVE',
    },
    {
      title: 'All Pallets',
      value: allPalletsPage?.count ?? 0,
      icon: ScanBarcode,
      color: 'text-purple-600 bg-purple-50',
      path: '/barcode/pallets',
    },
    {
      title: 'Active Boxes',
      value: activeBoxesPage?.count ?? 0,
      icon: Boxes,
      color: 'text-green-600 bg-green-50',
      path: '/barcode/boxes?status=ACTIVE',
    },
    {
      title: 'All Boxes',
      value: allBoxesPage?.count ?? 0,
      icon: Layers,
      color: 'text-amber-600 bg-amber-50',
      path: '/barcode/boxes',
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader title="Barcode" subtitle="Pallet and box tracking, label management" />

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

      {/* Live activity — polls every few seconds so scans, prints, and moves
          show up here moments after they happen on the floor. */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Radio className="h-4 w-4 text-green-600 animate-pulse" />
            Live Activity
          </h3>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No recent activity. Scans, label prints, and pallet moves will appear here live.
            </p>
          ) : (
            <div className="space-y-2">
              {activity.map((event, index) => (
                <ActivityRow key={`${event.kind}-${event.at}-${index}`} event={event} />
              ))}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full mt-3"
            onClick={() => navigate('/barcode/activity')}
          >
            View all
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
