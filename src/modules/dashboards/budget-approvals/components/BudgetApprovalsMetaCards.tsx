import { CheckCircle2, FileStack, Hourglass, IndianRupee } from 'lucide-react';

import { SummaryCard } from '@/shared/components/dashboard/SummaryCard';

import type { ReportSummary } from '../types';

function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

interface BudgetApprovalsMetaCardsProps {
  summary?: ReportSummary;
}

export function BudgetApprovalsMetaCards({ summary }: BudgetApprovalsMetaCardsProps) {
  if (!summary) return null;

  const approved = summary.by_status.find((s) => s.status === 'Y');
  const rejected = summary.by_status.find((s) => s.status === 'N');

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        title="Pending Amount"
        value={formatInr(summary.pending_amount)}
        icon={Hourglass}
        details={[{ label: 'Lines', value: summary.pending_lines }]}
      />
      <SummaryCard
        title="Approved"
        value={formatInr(approved?.total_amount ?? 0)}
        icon={CheckCircle2}
        details={[{ label: 'Lines', value: approved?.line_count ?? 0 }]}
      />
      <SummaryCard
        title="Rejected"
        value={formatInr(rejected?.total_amount ?? 0)}
        details={[{ label: 'Lines', value: rejected?.line_count ?? 0 }]}
      />
      <SummaryCard
        title="Total"
        value={formatInr(summary.total_amount)}
        icon={IndianRupee}
        details={[
          { label: 'Documents', value: summary.total_documents },
          { label: 'Lines', value: summary.total_lines },
        ]}
      />
    </div>
  );
}

export function BudgetApprovalsEmptyHint() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
      <FileStack className="h-8 w-8" />
      <p className="text-sm">No Factory budget draft lines match the current filters.</p>
    </div>
  );
}
