import { Truck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/shared/components/ui';

import ServiceGRPOHistoryPage from './ServiceGRPOHistoryPage';
import ServicePendingEntriesPage from './ServicePendingEntriesPage';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'history', label: 'History' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * Unified Service GRPO landing page. Mirrors the Material GRPO page: pill tabs
 * driven by a `?tab=` URL param, reusing the service list pages as embedded
 * content. /dispatch/bilty-grpo routes here.
 */
export default function ServiceGRPODashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : 'pending';

  const setTab = (key: TabKey) => {
    // Default tab stays clean in the URL.
    setSearchParams(key === 'pending' ? {} : { tab: key });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Truck className="h-8 w-8" />
          Service GRPO
        </h2>
        <p className="text-muted-foreground">
          Post transport service receipts for booked dispatch vehicles
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? 'default' : 'outline'}
            size="sm"
            className="h-8"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'pending' && <ServicePendingEntriesPage embedded />}
      {tab === 'history' && <ServiceGRPOHistoryPage embedded />}
    </div>
  );
}
