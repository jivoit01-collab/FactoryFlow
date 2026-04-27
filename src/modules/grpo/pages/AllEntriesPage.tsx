import { AlertCircle, ArrowLeft, ChevronRight, RefreshCw, ShieldX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { Button } from '@/shared/components/ui';

import { useAllGRPOEntries } from '../api';
import type { AllGRPOEntry, EntryPhase } from '../types';

const formatDateTime = (dateTime?: string | null) => {
  if (!dateTime) return '-';
  try {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTime;
  }
};

const PHASE_FILTERS = ['ALL', 'GATE', 'QC', 'DONE'] as const;
type PhaseFilter = (typeof PHASE_FILTERS)[number];

const PHASE_PILL_CLASSES: Record<EntryPhase, string> = {
  GATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  QC: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  DONE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const PHASE_LABEL: Record<EntryPhase, string> = {
  GATE: 'Gate',
  QC: 'QC',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

// Strip the leading "QC " from QC-phase status labels — the phase pill already says "QC"
const compactStatusLabel = (entry: AllGRPOEntry): string => {
  if (entry.phase === 'QC' && entry.status_label.startsWith('QC ')) {
    return entry.status_label.slice(3);
  }
  return entry.status_label;
};

export default function AllEntriesPage() {
  const navigate = useNavigate();
  const { data: entries = [], isLoading, refetch, error } = useAllGRPOEntries();
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('ALL');

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  const filtered = useMemo(() => {
    if (phaseFilter === 'ALL') return entries;
    return entries.filter((e) => e.phase === phaseFilter);
  }, [entries, phaseFilter]);

  const counts = useMemo(() => {
    const c: Record<PhaseFilter, number> = { ALL: entries.length, GATE: 0, QC: 0, DONE: 0 };
    for (const entry of entries) {
      if (entry.phase === 'GATE') c.GATE += 1;
      else if (entry.phase === 'QC') c.QC += 1;
      else if (entry.phase === 'DONE') c.DONE += 1;
    }
    return c;
  }, [entries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate('/grpo')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">All Entries</h2>
          </div>
          <p className="text-muted-foreground">
            Every raw-material gate entry — including ones still at gate or QC
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to view entries.'}
            </p>
          </div>
        </div>
      )}

      {error && !isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'An error occurred while loading entries.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="flex flex-wrap gap-2">
            {PHASE_FILTERS.map((p) => (
              <button
                key={p}
                onClick={() => setPhaseFilter(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  phaseFilter === p
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                {p === 'ALL' ? 'All' : PHASE_LABEL[p as EntryPhase]}
                <span className="ml-1.5 text-xs opacity-70">({counts[p]})</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border rounded-lg">
              No entries to show.
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">Entry No.</th>
                      <th className="p-3 text-left text-sm font-medium">Phase</th>
                      <th className="p-3 text-left text-sm font-medium">Status</th>
                      <th className="p-3 text-left text-sm font-medium">Supplier(s)</th>
                      <th className="p-3 text-left text-sm font-medium">PO Numbers</th>
                      <th className="p-3 text-left text-sm font-medium">POs</th>
                      <th className="p-3 text-left text-sm font-medium">Entry Time</th>
                      <th className="p-3 w-8" aria-hidden="true" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry) => {
                      const canPreview = entry.is_ready_for_grpo && entry.pending_po_count > 0;
                      return (
                        <tr
                          key={entry.vehicle_entry_id}
                          className={`border-t transition-colors ${
                            canPreview
                              ? 'hover:bg-muted/50 cursor-pointer'
                              : 'opacity-90 cursor-default'
                          }`}
                          onClick={() => {
                            if (canPreview) {
                              navigate(`/grpo/preview/${entry.vehicle_entry_id}`);
                            }
                          }}
                        >
                          <td className="p-3 text-sm font-medium whitespace-nowrap">
                            {entry.entry_no}
                          </td>
                          <td className="p-3 text-sm whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PHASE_PILL_CLASSES[entry.phase]}`}
                            >
                              {PHASE_LABEL[entry.phase]}
                            </span>
                          </td>
                          <td className="p-3 text-sm">{compactStatusLabel(entry)}</td>
                          <td className="p-3 text-sm">
                            {entry.suppliers.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {entry.suppliers.map((s) => (
                                  <span key={s.supplier_code} className="truncate">
                                    <span className="font-medium">{s.supplier_name}</span>
                                    <span className="text-xs text-muted-foreground ml-1">
                                      ({s.supplier_code})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {entry.po_numbers.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {entry.po_numbers.map((po) => (
                                  <span
                                    key={po}
                                    className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-mono bg-muted/40"
                                  >
                                    {po}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-3 text-sm whitespace-nowrap">
                            {entry.total_po_count === 0 ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <span className="text-xs">
                                {entry.posted_po_count}/{entry.total_po_count} posted
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                            {formatDateTime(entry.entry_time)}
                          </td>
                          <td className="p-3 text-right">
                            {canPreview && (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
