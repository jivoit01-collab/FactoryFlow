import { Factory, Loader2, Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui';

import { useLines,useRuns } from '../api';
import { RunCard } from '../components/RunCard';

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

  const { data: runs, isLoading, isFetching } = useRuns(filters);
  // Distinguish "initial load" (show skeletons) from "re-fetching on filter/search
  // change" (show an inline spinner so existing results don't flash away).
  const isInitialLoad = isLoading && !runs;
  const isRefetching = isFetching && !isInitialLoad;

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
          onClick: () => navigate('/production/execution/start-run'),
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
          <SelectTrigger className="w-full sm:w-[150px]">
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
          <SelectTrigger className="w-full sm:w-[150px]">
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
            className="w-full sm:w-[150px]"
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-[150px]"
            placeholder="To"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Re-fetch indicator — visible when filters change, but keep old results in place */}
      {isRefetching && (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {search ? 'Searching runs…' : 'Updating results…'}
        </div>
      )}

      {/* Results */}
      {isInitialLoad ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 h-32 animate-pulse bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : runs && runs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {runs.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              onClick={() => navigate(`/production/execution/runs/${run.id}`)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Factory className="h-12 w-12 text-muted-foreground mb-4" />
            {hasFilters ? (
              <>
                <p className="font-medium">No runs match your filters</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Try widening the date range, clearing the search, or selecting a
                  different line or status.
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Clear filters
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium">No production runs yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Start a new run to begin tracking production output, breakdowns,
                  and resource consumption.
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/production/execution/start-run')}
                >
                  <Plus className="h-4 w-4 mr-2" /> Start your first run
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ExecutionDashboardPage;
