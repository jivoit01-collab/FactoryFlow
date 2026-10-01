import { ARRIVAL_SLIP_TABS, MASTER_TABS, PRODUCTION_QC_TABS } from '../constants/qcSections';
import { usePendingApprovalsCount } from '../hooks/usePendingApprovalsCount';
import { QCSectionTabs } from './QCSectionTabs';

export function ArrivalSlipTabs() {
  const pendingApprovals = usePendingApprovalsCount();
  return (
    <QCSectionTabs
      tabs={ARRIVAL_SLIP_TABS.map((tab) =>
        tab.path === '/qc/arrival-slips/approvals' ? { ...tab, count: pendingApprovals } : tab,
      )}
    />
  );
}

/** Documents: the entries and, for whoever maintains them, the document types. */
export function ProductionQCTabs() {
  return <QCSectionTabs tabs={PRODUCTION_QC_TABS} />;
}

/** Master Data: Print Documents for now — shown even alone, as more tabs will join it. */
export function MasterDataTabs() {
  return <QCSectionTabs tabs={MASTER_TABS} showSingle />;
}
