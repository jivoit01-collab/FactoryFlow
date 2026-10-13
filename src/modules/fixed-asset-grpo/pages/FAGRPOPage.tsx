import { Landmark } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { Button, Card } from '@/shared/components/ui';

import { useFAGRPOSummary } from '../api/faGrpo.queries';
import { FAClosedTab, FAHistoryTab, FANeedsPOTab, FAReadyTab } from '../components';

const TABS = [
  { key: 'needs-po', label: 'Needs PO' },
  { key: 'ready', label: 'Ready to post' },
  { key: 'history', label: 'History' },
  { key: 'closed', label: 'Done in SAP by hand' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * Fixed Asset GRPO: a vendor's fixed-asset delivery, from the gate to SAP.
 *
 * The gate records the arrival with free text and completes it. Here the
 * SAP PO is linked afterwards (**Needs PO**), the GRPO is reviewed and posted
 * (**Ready to post**), and every attempt is kept (**History**). An entry
 * accounts key in SAP themselves is closed out (**Done in SAP by hand**).
 *
 * The tab lives in the URL (`?tab=`), as on Material GRPO, so a link or a
 * refresh lands on the same list. The numbers come from `summary/`, counted
 * over fixed-asset entries only.
 */
export default function FAGRPOPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : 'needs-po';
  const setTab = (key: TabKey) => setSearchParams(key === 'needs-po' ? {} : { tab: key });

  const { data: summary } = useFAGRPOSummary();
  const badge: Partial<Record<TabKey, number | undefined>> = {
    'needs-po': summary?.needs_po_count,
    ready: summary?.pending_entry_count,
    closed: summary?.closed_count,
  };

  const cards: { label: string; value: number; tone?: string }[] = summary
    ? [
        { label: 'Needs PO', value: summary.needs_po_count },
        { label: 'Ready to post', value: summary.pending_entry_count },
        { label: 'Waiting for SAP', value: summary.queued_count },
        { label: 'Failed', value: summary.failed_count, tone: 'text-red-600' },
        { label: 'Posted', value: summary.posted_count, tone: 'text-green-600' },
        { label: 'Simulated', value: summary.simulated_count, tone: 'text-amber-600' },
        { label: 'Done by hand', value: summary.closed_count },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Landmark className="h-8 w-8" />
          Fixed Asset GRPO
        </h2>
        <p className="text-muted-foreground">
          Link the SAP PO to a fixed-asset gate entry, then post its goods receipt to SAP.
        </p>
      </div>

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {cards.map((card) => (
            <Card key={card.label} className="p-3">
              <div className="text-xs text-muted-foreground">{card.label}</div>
              <div className={`text-2xl font-semibold ${card.tone ?? ''}`}>{card.value}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = badge[t.key];
          return (
            <Button
              key={t.key}
              variant={tab === t.key ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {count !== undefined && <span className="ml-1.5 text-xs opacity-70">({count})</span>}
            </Button>
          );
        })}
      </div>

      {tab === 'needs-po' && <FANeedsPOTab />}
      {tab === 'ready' && <FAReadyTab />}
      {tab === 'history' && <FAHistoryTab />}
      {tab === 'closed' && <FAClosedTab />}
    </div>
  );
}
