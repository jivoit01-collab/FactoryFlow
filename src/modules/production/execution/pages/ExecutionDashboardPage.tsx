import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useDeleteRun, useLines, useRuns } from '../api';
import { ProductionStatusBadge } from '../components/ProductionStatusBadge';
import { RunDraftModal } from '../components/RunDraftModal';
import type { ProductionRun } from '../types';

function runSortTime(run: ProductionRun) {
  const createdAt = Date.parse(run.created_at || '');
  if (Number.isFinite(createdAt)) return createdAt;

  const runDate = Date.parse(run.date || '');
  return Number.isFinite(runDate) ? runDate : 0;
}

function formatDateTime(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value || '-';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(parsed));
}

function ExecutionDashboardPage() {
  const navigate = useNavigate();
  const { data: lines } = useLines(true);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const filters = {
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    line_id: lineFilter !== 'ALL' ? Number(lineFilter) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    search: search.trim() || undefined,
  };

  const hasFilters = statusFilter !== 'ALL' || lineFilter !== 'ALL' || dateFrom || dateTo || search;

  const { data: runs, isLoading } = useRuns(filters);
  const deleteRun = useDeleteRun();

  // One dialog for both: `editing` null means a new plan.
  const [draftOpen, setDraftOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionRun | null>(null);

  const openNewDraft = () => {
    setEditing(null);
    setDraftOpen(true);
  };

  const openDraft = (run: ProductionRun) => {
    setEditing(run);
    setDraftOpen(true);
  };

  // Discarding is soft — the run keeps its number and stays recoverable — but
  // it is still a plan disappearing off other people's board, so it is asked
  // for rather than assumed.
  const discardDraft = async (run: ProductionRun) => {
    const confirmed = await confirmDialog({
      title: `Discard Run #${run.run_number}?`,
      description: `${run.product || 'This draft'} on ${run.line_name}, planned for ${run.date}. It disappears from the board; the record is kept.`,
      confirmLabel: 'Discard draft',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteRun.mutateAsync(run.id);
      toast.success(`Run #${run.run_number} discarded`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'The draft was not discarded.'));
    }
  };

  const sortedRuns = useMemo(
    () => [...(runs ?? [])].sort((a, b) => {
      const timeDiff = runSortTime(b) - runSortTime(a);
      if (timeDiff !== 0) return timeDiff;

      if (a.date !== b.date) return b.date.localeCompare(a.date);
      if (a.run_number !== b.run_number) return b.run_number - a.run_number;
      return b.id - a.id;
    }),
    [runs],
  );

  const clearFilters = () => {
    setStatusFilter('ALL');
    setLineFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Production Execution"
        description="Manage production runs & tracking"
        primaryAction={{
          label: 'Start Run',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: openNewDraft,
        }}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search run #, product, SAP entry..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={lineFilter} onValueChange={setLineFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Line" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Lines</SelectItem>
            {lines?.map((line) => (
              <SelectItem key={line.id} value={String(line.id)}>{line.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]"
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]"
            placeholder="To"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[980px] text-sm">
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="p-4">
                    <div className="h-7 animate-pulse rounded bg-muted/60" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : sortedRuns.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Run</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Line</th>
                <th className="px-3 py-2 text-right font-medium">Production</th>
                <th className="px-3 py-2 font-medium">SAP Entry</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRuns.map((run) => (
                <tr
                  key={run.id}
                  className="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-muted/50"
                  onClick={() => navigate(`/production/execution/runs/${run.id}`)}
                >
                  <td className="px-3 py-3 font-semibold">Run #{run.run_number}</td>
                  <td className="px-3 py-3 text-muted-foreground">{formatDateTime(run.created_at)}</td>
                  <td className="px-3 py-3">{run.date}</td>
                  <td className="px-3 py-3">
                    <p className="max-w-[360px] truncate font-medium">{run.product || '-'}</p>
                  </td>
                  <td className="px-3 py-3">{run.line_name}</td>
                  <td className="px-3 py-3 text-right">
                    {parseFloat(run.total_production || '0') > 0 ? `${run.total_production} cases` : 'No production yet'}
                  </td>
                  <td className="px-3 py-3">{run.sap_doc_entry ?? '-'}</td>
                  <td className="px-3 py-3">
                    <ProductionStatusBadge status={run.live_status || run.status} />
                  </td>
                  {/* A draft is still a plan on paper — it can be reworked or
                      thrown away. Anything past DRAFT is the floor's now. */}
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {run.status === 'DRAFT' && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit draft"
                          aria-label={`Edit draft Run #${run.run_number}`}
                          onClick={() => openDraft(run)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Discard draft"
                          aria-label={`Discard draft Run #${run.run_number}`}
                          disabled={deleteRun.isPending}
                          onClick={() => discardDraft(run)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            {hasFilters ? 'No runs match your filters.' : 'No production runs found. Start a new run to begin.'}
          </CardContent>
        </Card>
      )}

      {/* Mounted only while open, so the form starts from the draft it was
          opened on rather than from whatever the last one left behind. */}
      {draftOpen && <RunDraftModal open onOpenChange={setDraftOpen} run={editing} />}
    </div>
  );
}

export default ExecutionDashboardPage;
