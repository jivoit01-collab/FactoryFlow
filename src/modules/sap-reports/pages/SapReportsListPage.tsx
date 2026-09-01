import { AlertTriangle, Database, EyeOff, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { SAP_REPORTS_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import type { SapReportListItem } from '../api';
import { useSapReports, useSyncSapReports } from '../api';
import { ReportErrorNotice } from '../components/ReportErrorNotice';

/**
 * The company's SAP reports.
 *
 * Nothing on this page is hard-coded: the list is whatever SAP's Query Manager
 * holds in the synced category, so a report added in SAP appears here after a
 * sync without a release.
 */
export default function SapReportsListPage() {
  const canManage = useHasPermission(SAP_REPORTS_PERMISSIONS.MANAGE);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);
  const [category, setCategory] = useState('');
  const [includeHidden, setIncludeHidden] = useState(false);

  const query = useSapReports({
    search: search || undefined,
    include_hidden: canManage && includeHidden,
  });
  const sync = useSyncSapReports();

  const categories = query.data?.meta.categories ?? [];

  const visible = useMemo(() => {
    const reports = query.data?.data ?? [];
    return category
      ? reports.filter((report) => report.sap_category_name === category)
      : reports;
  }, [query.data, category]);

  function handleSync() {
    sync.mutate(undefined, {
      onSuccess: (summary) => {
        const changed = summary.created.length + summary.updated.length;
        toast.success(
          changed === 0
            ? `Already up to date — ${summary.found_in_sap} reports in SAP.`
            : `${summary.created.length} new, ${summary.updated.length} updated.`,
        );
        if (summary.missing_in_sap.length) {
          toast.warning(`No longer in SAP: ${summary.missing_in_sap.join(', ')}`);
        }
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Could not sync from SAP.')),
    });
  }

  if (query.isError) {
    return (
      <ReportErrorNotice
        error={query.error}
        onRetry={() => query.refetch()}
        fallback="The report list could not be loaded."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">SAP Reports</h1>
          <p className="text-sm text-muted-foreground">
            The saved queries from SAP&apos;s Query Manager, run against live SAP data.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIncludeHidden((current) => !current)}
            >
              <EyeOff className="mr-1.5 h-4 w-4" />
              {includeHidden ? 'Hide unavailable' : 'Show unavailable'}
            </Button>
            <Button size="sm" onClick={handleSync} disabled={sync.isPending}>
              <RefreshCw className={cn('mr-1.5 h-4 w-4', sync.isPending && 'animate-spin')} />
              {sync.isPending ? 'Syncing…' : 'Sync from SAP'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-[260px] pl-8"
          />
        </div>
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={category === '' ? 'default' : 'outline'}
              onClick={() => setCategory('')}
            >
              All
            </Button>
            {categories.map((name) => (
              <Button
                key={name}
                size="sm"
                variant={category === name ? 'default' : 'outline'}
                onClick={() => setCategory(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {query.isLoading ? (
        <ReportSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          canManage={canManage}
          hasSearch={Boolean(search)}
          // Strict === true so a backend without the field fails open to the
          // generic wording rather than telling everyone they are unassigned.
          restricted={query.data?.meta.restricted === true}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((report) => (
            <ReportCard key={report.slug} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report }: { report: SapReportListItem }) {
  const unavailable = !report.is_runnable || !report.is_enabled || report.is_missing_in_sap;

  return (
    <Card className={cn('flex h-full flex-col', unavailable && 'opacity-70')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{report.title}</CardTitle>
          {report.statement_kind === 'CALL' && (
            <Badge variant="outline" className="shrink-0">
              Procedure
            </Badge>
          )}
        </div>
        {report.display_name && report.display_name !== report.sap_name && (
          <p className="text-xs text-muted-foreground">SAP: {report.sap_name}</p>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <div className="space-y-2">
          {report.description ? (
            <p className="text-sm text-muted-foreground">{report.description}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">No description yet.</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {report.parameter_count === 0
                ? 'No filters'
                : `${report.parameter_count} filter${report.parameter_count === 1 ? '' : 's'}`}
            </Badge>
            {report.last_run_at && <span>Last run {formatDateTimeShort(report.last_run_at)}</span>}
          </div>
          {unavailable && (
            <p className="flex items-start gap-1.5 text-xs text-amber-600">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {report.is_missing_in_sap
                ? 'This query no longer exists in SAP.'
                : report.not_runnable_reason || 'Switched off for this company.'}
            </p>
          )}
        </div>

        <Button asChild size="sm" variant={unavailable ? 'outline' : 'default'} className="w-fit">
          <Link to={`/dashboards/sap-reports/${report.slug}`}>
            <Database className="mr-1.5 h-4 w-4" />
            {unavailable ? 'Open' : 'Run report'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  canManage,
  hasSearch,
  restricted,
}: {
  canManage: boolean;
  hasSearch: boolean;
  restricted: boolean;
}) {
  return (
    <div className="rounded-md border border-dashed p-10 text-center">
      <Database className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
      <p className="font-medium">
        {hasSearch
          ? 'No report matches that search.'
          : restricted
            ? 'No reports have been assigned to you yet.'
            : 'No reports yet.'}
      </p>
      {!hasSearch && (
        <p className="mt-1 text-sm text-muted-foreground">
          {canManage
            ? 'Press “Sync from SAP” to pull this company’s saved queries in.'
            : restricted
              ? 'An administrator assigns reports on Admin → SAP Report Access.'
              : 'An administrator needs to sync the reports from SAP first.'}
        </p>
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-md border bg-muted/40" />
      ))}
    </div>
  );
}
