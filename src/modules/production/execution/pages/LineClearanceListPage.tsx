import { ChevronLeft, ChevronRight, ClipboardCheck, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EXECUTION_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader, DashboardLoading } from '@/shared/components';
import { Button, Card } from '@/shared/components/ui';

import { useLineClearances, useProductionLines } from '../api';
import { ClearanceStatusBadge } from '../components/ClearanceStatusBadge';
import type { ClearanceStatus } from '../types';

type StatusFilter = 'all' | ClearanceStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'CLEARED', label: 'Cleared' },
  { value: 'NOT_CLEARED', label: 'Not Cleared' },
];

export default function LineClearanceListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [lineFilter, setLineFilter] = useState<number | undefined>();
  const [dateOffset, setDateOffset] = useState(0);

  const currentDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().split('T')[0];
  }, [dateOffset]);

  const dateLabel = useMemo(() => {
    const d = new Date(currentDate + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [currentDate]);

  const { data: clearances, isLoading, error, refetch } = useLineClearances({
    date: currentDate,
    line_id: lineFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const { data: lines } = useProductionLines(true);

  const canCreate = hasPermission(EXECUTION_PERMISSIONS.CREATE_CLEARANCE);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Line Clearance"
        description="Pre-production clearance checklists"
        primaryAction={
          canCreate
            ? {
                label: 'New Clearance',
                icon: <Plus className="h-4 w-4 mr-2" />,
                onClick: () => navigate('/production/execution/line-clearance/create'),
              }
            : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setDateOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-48 text-center">{dateLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setDateOffset((o) => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {dateOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setDateOffset(0)}>
              Today
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Line filter */}
          <select
            value={lineFilter ?? ''}
            onChange={(e) => setLineFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All Lines</option>
            {lines?.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <DashboardLoading />
      ) : error ? (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <ClipboardCheck className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">
              Failed to load clearances
            </p>
            <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      ) : !clearances?.length ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground font-medium">No clearances found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {statusFilter !== 'all'
              ? `No ${statusFilter.toLowerCase().replace('_', ' ')} clearances for this date`
              : 'No clearances recorded for this date'}
          </p>
          {canCreate && (
            <Button
              className="mt-4"
              onClick={() => navigate('/production/execution/line-clearance/create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Clearance
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium px-4 py-3">Line</th>
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-left font-medium px-4 py-3">Document ID</th>
                  <th className="text-left font-medium px-4 py-3">Plan</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">QA</th>
                  <th className="text-left font-medium px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {clearances.map((clearance) => (
                  <tr
                    key={clearance.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate(`/production/execution/line-clearance/${clearance.id}`)
                    }
                  >
                    <td className="px-4 py-3 font-medium">{clearance.line_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(clearance.date + 'T00:00:00').toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {clearance.document_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      Plan #{clearance.production_plan}
                    </td>
                    <td className="px-4 py-3">
                      <ClearanceStatusBadge status={clearance.status} />
                    </td>
                    <td className="px-4 py-3">
                      {clearance.qa_approved ? (
                        <span className="text-xs text-green-600 font-medium">Approved</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(clearance.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
