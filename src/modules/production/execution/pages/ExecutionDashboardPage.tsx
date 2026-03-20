import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui';

import { useRuns } from '../api';
import { RunCard } from '../components/RunCard';

function ExecutionDashboardPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const statusValue = statusFilter === 'ALL' ? undefined : statusFilter;
  const { data: runs, isLoading } = useRuns(statusValue, dateFilter || undefined);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Production Execution"
        description="Manage production runs, hourly logging & tracking"
        primaryAction={{
          label: 'Start Run',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => navigate('/production/execution/start-run'),
        }}
      />

      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-[180px]"
        />
        {(statusFilter !== 'ALL' || dateFilter) && (
          <Button variant="ghost" onClick={() => { setStatusFilter('ALL'); setDateFilter(''); }}>
            Clear Filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4 h-32 animate-pulse bg-muted/50" /></Card>
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
          <CardContent className="p-12 text-center text-muted-foreground">
            No production runs found. Start a new run to begin.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ExecutionDashboardPage;
