import { PackageCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/shared/components/ui';

import AllEntriesPage, { type PhaseFilter } from './AllEntriesPage';
import GRPOHistoryPage from './GRPOHistoryPage';
import PendingEntriesPage from './PendingEntriesPage';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'all', label: 'All' },
  { key: 'gate', label: 'Gate' },
  { key: 'qc', label: 'QC' },
  { key: 'done', label: 'Done' },
  { key: 'history', label: 'History' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// Map an entries tab to the AllEntriesPage phase filter.
const TAB_TO_PHASE: Record<'all' | 'gate' | 'qc' | 'done', PhaseFilter> = {
  all: 'ALL',
  gate: 'GATE',
  qc: 'QC',
  done: 'DONE',
};

/**
 * Unified GRPO landing page. Replaces the old dashboard: lands on the entries
 * list with QC-style tabs, reusing the existing list pages as embedded content.
 */
export default function MaterialGRPOPage() {
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
          <PackageCheck className="h-8 w-8" />
          GRPO Posting
        </h2>
        <p className="text-muted-foreground">Post goods receipts to SAP after gate entry completion</p>
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

      {tab === 'pending' && <PendingEntriesPage embedded />}
      {tab === 'history' && <GRPOHistoryPage embedded />}
      {(tab === 'all' || tab === 'gate' || tab === 'qc' || tab === 'done') && (
        <AllEntriesPage embedded phase={TAB_TO_PHASE[tab]} />
      )}
    </div>
  );
}
