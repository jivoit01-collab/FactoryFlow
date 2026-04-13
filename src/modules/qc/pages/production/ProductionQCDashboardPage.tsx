import { ArrowLeft, CheckCircle2, ChevronRight, Factory, FileText, FlaskConical, Play, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRuns } from '@/modules/production/execution/api';
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import { useProductionQCCounts, useProductionQCList } from '../../api/productionQC';
import type { ProductionQCWorkflowStatus } from '../../types';

const WORKFLOW_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  SUBMITTED: {
    label: 'Submitted',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
};

const RESULT_BADGE: Record<string, { label: string; className: string }> = {
  PASS: {
    label: 'Pass',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  FAIL: {
    label: 'Fail',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

const RUN_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
};

export default function ProductionQCDashboardPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [runSearch, setRunSearch] = useState('');
  const [runStatusFilter, setRunStatusFilter] = useState<string>('all');

  const { data: counts } = useProductionQCCounts();
  const { data: sessions = [], isLoading: sessionsLoading } = useProductionQCList(
    statusFilter !== 'all' ? { workflow_status: statusFilter as ProductionQCWorkflowStatus } : undefined,
  );

  // Fetch production runs for QC users to pick from
  const { data: runs = [], isLoading: runsLoading } = useRuns(
    runStatusFilter !== 'all' ? { status: runStatusFilter } : undefined,
  );

  // Count QC sessions per run for the runs list
  const qcCountByRun = sessions.reduce<Record<number, number>>((acc, s) => {
    acc[s.production_run] = (acc[s.production_run] || 0) + 1;
    return acc;
  }, {});

  const filteredSessions = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(s.run_number).includes(q) ||
      s.product?.toLowerCase().includes(q) ||
      s.line_name?.toLowerCase().includes(q) ||
      s.material_type_name?.toLowerCase().includes(q)
    );
  });

  const filteredRuns = runs.filter((r) => {
    if (!runSearch) return true;
    const q = runSearch.toLowerCase();
    return (
      String(r.run_number).includes(q) ||
      r.product?.toLowerCase().includes(q) ||
      r.line_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/qc')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> QC Dashboard
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Production QC</h2>
          <p className="text-muted-foreground text-sm">
            In-process and final quality control for production runs
          </p>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'draft', label: 'Draft', count: counts?.draft ?? 0, icon: FileText, color: 'text-gray-600 dark:text-gray-400' },
          { key: 'submitted', label: 'Submitted', count: counts?.submitted ?? 0, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
        ].map(({ key, label, count, icon: Icon, color }) => (
          <Card
            key={key}
            className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === key ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className={`text-xl font-bold ${color}`}>{count}</span>
              </div>
              <p className={`mt-1 text-xs font-medium ${color}`}>{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="runs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="runs">
            <Factory className="h-4 w-4 mr-1.5" />
            Production Runs ({runs.length})
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <FlaskConical className="h-4 w-4 mr-1.5" />
            QC Sessions ({sessions.length})
          </TabsTrigger>
        </TabsList>

        {/* ===== Production Runs Tab ===== */}
        <TabsContent value="runs" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by run #, product, line..."
                className="pl-9"
                value={runSearch}
                onChange={(e) => setRunSearch(e.target.value)}
              />
            </div>
            <Select value={runStatusFilter} onValueChange={setRunStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {runsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border rounded-lg">
              No production runs found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRuns.map((run) => {
                const statusBadge = RUN_STATUS_BADGE[run.status] || RUN_STATUS_BADGE.DRAFT;
                const qcCount = qcCountByRun[run.id] || 0;

                return (
                  <div
                    key={run.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/qc/production/runs/${run.id}`)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2 rounded-lg bg-muted">
                        <Factory className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            Run #{run.run_number}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                          {qcCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <FlaskConical className="h-3 w-3" />
                              {qcCount} QC
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {run.product || 'No product'} &middot; {run.line_name} &middot; {run.date}
                          {run.total_production && Number(run.total_production) > 0 && (
                            <> &middot; {run.total_production} cases</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden sm:flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/qc/production/runs/${run.id}`);
                        }}
                      >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        {qcCount > 0 ? 'View QC' : 'Start QC'}
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== QC Sessions Tab ===== */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by run #, product, line..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sessionsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm border rounded-lg">
              <p>No QC sessions found</p>
              <p className="text-xs mt-1">Select a production run from the Production Runs tab to start QC</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSessions.map((session) => {
                const wfBadge = WORKFLOW_BADGE[session.workflow_status];
                const resBadge = session.overall_result ? RESULT_BADGE[session.overall_result] : null;

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/qc/production/sessions/${session.id}`)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            Run #{session.run_number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Round {session.session_number}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${wfBadge.className}`}>
                            {wfBadge.label}
                          </span>
                          {resBadge && (
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${resBadge.className}`}>
                              {resBadge.label}
                            </span>
                          )}
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            session.session_type === 'FINAL'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
                          }`}>
                            {session.session_type === 'FINAL' ? 'Final' : 'In-Process'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {session.product} &middot; {session.line_name} &middot; {session.run_date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs text-muted-foreground hidden sm:block">
                        <div>
                          {session.pass_count}/{session.total_params} pass
                        </div>
                        {session.checked_by_name && (
                          <div>{session.checked_by_name}</div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
