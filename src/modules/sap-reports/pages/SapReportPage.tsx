import {
  ArrowLeft,
  Clock,
  Code2,
  Download,
  History,
  Play,
  Settings2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { SAP_REPORTS_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import { Badge, Button } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import type { SapReportDetail, SapReportParameterValues } from '../api';
import { useExportSapReport, useRunSapReport, useSapReport } from '../api';
import { ReportErrorNotice } from '../components/ReportErrorNotice';
import { ReportFilterField } from '../components/ReportFilterField';
import { ReportHistoryDialog } from '../components/ReportHistoryDialog';
import { ReportResultTable } from '../components/ReportResultTable';
import { ReportSetupDialog } from '../components/ReportSetupDialog';
import { ReportSqlDialog } from '../components/ReportSqlDialog';

/**
 * Run one SAP report: fill its filters, run it, read it, export it.
 *
 * A report with no filters runs on open, because there is nothing to decide and
 * the user came here for the numbers. One with filters waits: these queries scan
 * years of stock movements on a SAP box the whole factory shares, so an
 * unprompted run with default dates would be both slow and wrong.
 */
export default function SapReportPage() {
  const { slug } = useParams<{ slug: string }>();
  const canManage = useHasPermission(SAP_REPORTS_PERMISSIONS.MANAGE);

  const reportQuery = useSapReport(slug);
  const report = reportQuery.data;

  const [values, setValues] = useState<SapReportParameterValues>({});
  // The three header buttons each open a dialog rather than pushing the report
  // itself down the page.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const run = useRunSapReport(slug);
  const exportRun = useExportSapReport(slug);

  // Seed the filters from the defaults an admin set, once the report arrives.
  useEffect(() => {
    if (!report) return;
    setValues(
      Object.fromEntries(
        report.parameters.map((parameter) => [
          String(parameter.position),
          parameter.default_value ?? '',
        ]),
      ),
    );
  }, [report]);

  const missing = useMemo(() => missingRequired(report, values), [report, values]);
  const canRun = Boolean(report?.is_runnable && report?.is_enabled && !report?.is_missing_in_sap);
  const hasFilters = (report?.parameters.length ?? 0) > 0;

  // A filterless report has one possible answer — fetch it without a click.
  const hasAutoRun = run.isPending || run.isSuccess || run.isError;
  useEffect(() => {
    if (!report || hasFilters || !canRun || hasAutoRun) return;
    run.mutate({ parameters: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, hasFilters, canRun, hasAutoRun]);

  function handleRun() {
    if (missing.length) {
      toast.error(`Fill in ${missing.join(', ')} first.`);
      return;
    }
    run.mutate({ parameters: values });
  }

  function handleExport(exportFormat: 'csv' | 'xlsx') {
    if (missing.length) {
      toast.error(`Fill in ${missing.join(', ')} first.`);
      return;
    }
    exportRun.mutate(
      { parameters: values, exportFormat },
      {
        onSuccess: ({ blob, filename }) => downloadBlob(blob, filename),
        onError: (error) => toast.error(getErrorMessage(error, 'Export failed.')),
      },
    );
  }

  if (reportQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-md border bg-muted/40" />;
  }

  if (reportQuery.isError || !report) {
    return (
      <ReportErrorNotice
        error={reportQuery.error}
        onRetry={() => reportQuery.refetch()}
        fallback="This report could not be loaded."
      />
    );
  }

  const result = run.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 px-2">
            <Link to="/sap-reports">
              <ArrowLeft className="mr-1 h-4 w-4" />
              All reports
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{report.title}</h1>
          {report.description && (
            <p className="text-sm text-muted-foreground">{report.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{report.sap_category_name}</Badge>
            <span>SAP query: {report.sap_name}</span>
            {report.statement_kind === 'CALL' && <Badge variant="outline">Procedure</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="mr-1.5 h-4 w-4" />
            History
          </Button>
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => setSqlOpen(true)}>
                <Code2 className="mr-1.5 h-4 w-4" />
                SQL
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
                <Settings2 className="mr-1.5 h-4 w-4" />
                Setup
              </Button>
            </>
          )}
        </div>
      </div>

      {!canRun && (
        <ReportErrorNotice
          error={null}
          fallback={
            report.is_missing_in_sap
              ? 'This query no longer exists in SAP. Ask an administrator to re-sync.'
              : report.not_runnable_reason || 'This report is switched off for this company.'
          }
        />
      )}

      {/* Filters and the run buttons share one row: on any real screen a report's
          two-to-four filters fit beside them, and the results stay above the fold.
          It wraps rather than squashes when they do not. */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          {hasFilters ? (
            report.parameters.map((parameter) => (
              <ReportFilterField
                key={parameter.position}
                slug={report.slug}
                parameter={parameter}
                value={values[String(parameter.position)] ?? ''}
                disabled={!canRun}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    [String(parameter.position)]: value,
                  }))
                }
              />
            ))
          ) : (
            <span className="pb-2 text-xs text-muted-foreground">
              This report takes no filters.
            </span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {result && (
              <span className="flex items-center gap-1.5 pr-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {result.meta.row_count.toLocaleString()} rows in{' '}
                {(result.meta.duration_ms / 1000).toFixed(1)}s
              </span>
            )}
            <Button size="sm" onClick={handleRun} disabled={!canRun || run.isPending}>
              <Play className="mr-1.5 h-4 w-4" />
              {run.isPending ? 'Running…' : 'Run report'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport('xlsx')}
              disabled={!canRun || exportRun.isPending}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {exportRun.isPending ? 'Preparing…' : 'Excel'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={!canRun || exportRun.isPending}
            >
              <Download className="mr-1.5 h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {run.isError && (
        <ReportErrorNotice error={run.error} onRetry={handleRun} />
      )}

      {run.isPending && (
        <div className="h-48 animate-pulse rounded-md border bg-muted/40" />
      )}

      {result && !run.isPending && (
        <ReportResultTable
          columns={result.columns}
          rows={result.rows}
          wasTruncated={result.meta.was_truncated}
          rowLimit={result.meta.row_limit}
        />
      )}

      <ReportHistoryDialog
        slug={report.slug}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
      {canManage && (
        <>
          <ReportSqlDialog slug={report.slug} open={sqlOpen} onOpenChange={setSqlOpen} />
          <ReportSetupDialog report={report} open={setupOpen} onOpenChange={setSetupOpen} />
        </>
      )}
    </div>
  );
}

function missingRequired(
  report: SapReportDetail | undefined,
  values: SapReportParameterValues,
): string[] {
  if (!report) return [];
  return report.parameters
    .filter(
      (parameter) =>
        parameter.is_required && !(values[String(parameter.position)] ?? '').trim(),
    )
    .map((parameter) => parameter.label);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
