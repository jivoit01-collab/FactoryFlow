import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Factory, Gauge, Package, Plus } from 'lucide-react';

import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { RunCard } from '../components/RunCard';
import { useExecutionDashboard, useProductionRuns } from '../api/execution.queries';
import type { RunStatus } from '../types';

const STATUS_TABS: { label: string; value: RunStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Draft', value: 'DRAFT' },
];

export default function ExecutionDashboardPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'ALL'>('ALL');

  const today = new Date().toISOString().slice(0, 10);
  const { data: summary } = useExecutionDashboard();
  const { data: runs = [], isLoading } = useProductionRuns({
    date: today,
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
  });

  const summaryCards = [
    {
      label: "Today's Production",
      value: `${(summary?.todays_production ?? 0).toLocaleString()} Cases`,
      icon: Package,
      color: 'text-blue-600',
    },
    {
      label: 'Active Runs',
      value: String(summary?.active_runs ?? 0),
      icon: Factory,
      color: 'text-green-600',
    },
    {
      label: 'Breakdown Time',
      value: `${summary?.total_breakdown_minutes ?? 0} min`,
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      label: 'Line Efficiency',
      value: `${(summary?.line_efficiency ?? 0).toFixed(1)}%`,
      icon: Gauge,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Production Execution"
        description="Monitor and manage production runs"
        primaryAction={{
          label: 'Start New Run',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => navigate('/production/execution/start-run'),
        }}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                </div>
                <card.icon className={`h-5 w-5 ${card.color} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {summary && (summary.pending_clearances > 0 || summary.pending_waste_approvals > 0) && (
        <div className="flex flex-wrap gap-3">
          {summary.pending_clearances > 0 && (
            <Card
              className="flex-1 min-w-[200px] cursor-pointer hover:shadow-md transition-shadow border-amber-200 dark:border-amber-800"
              onClick={() => navigate('/production/execution/line-clearance')}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">Pending Clearances</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.pending_clearances} clearance(s) awaiting QA
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {summary.pending_waste_approvals > 0 && (
            <Card
              className="flex-1 min-w-[200px] cursor-pointer hover:shadow-md transition-shadow border-red-200 dark:border-red-800"
              onClick={() => navigate('/production/execution/waste')}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Pending Waste Approvals</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.pending_waste_approvals} waste log(s) need approval
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <Badge
            key={tab.value}
            variant={statusFilter === tab.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </Badge>
        ))}
      </div>

      {/* Runs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Factory className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">No production runs today</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start a new production run to begin tracking output.
            </p>
            <Button className="mt-4" onClick={() => navigate('/production/execution/start-run')}>
              <Plus className="h-4 w-4 mr-2" />
              Start New Run
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
