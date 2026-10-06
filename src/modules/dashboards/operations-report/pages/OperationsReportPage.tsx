import { ClipboardList, Download } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { useAuth } from '@/core/auth';
import { DashboardError, DashboardLoading } from '@/shared/components/dashboard';
import { PageHeader } from '@/shared/components/page';
import { Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/contexts';
import { getErrorMessage } from '@/shared/utils';

import {
  BreakdownPanels,
  CostPerLitrePanel,
  DailyLedgerTable,
  ReportKpiRow,
  ReportNotices,
  ReportPeriodBar,
  ReportTrends,
} from '../components';
import { REPORT_PALETTES } from '../constants';
import { useOperationsReport, useReportPeriod } from '../hooks';
import { buildReportWorkbook, reportFileName } from '../utils/reportExport';

/**
 * The Operations Report: production, wastage, labour and electricity for a day
 * or a month, and what a litre cost to make.
 *
 * READING ORDER. The five headline figures, each against the period before;
 * what a litre cost and what it was made of; the run of days around the
 * period, with its Excel export above it; the registers behind the headlines;
 * and on the month view, the month as a row a day.
 *
 * WHERE THE FIGURES COME FROM. One read of `/dashboards/operations-report/days/`
 * — the floor's runs, the waste register, the labour gate, the Cost Master
 * salary rates and Daily Electricity++, a day at a time — added up here. What could not be read, or
 * may not be shown to this reader, is said in a band under the period rather
 * than drawn as zero.
 */
export default function OperationsReportPage() {
  const { currentCompany } = useAuth();
  const { resolvedTheme } = useTheme();
  const palette = REPORT_PALETTES[resolvedTheme === 'dark' ? 'dark' : 'light'];

  const period = useReportPeriod();
  const { data: report, isLoading, isFetching, error, refetch } = useOperationsReport(period);

  const handleExport = useCallback(() => {
    if (!report) return;
    XLSX.writeFile(buildReportWorkbook(report, period.label), reportFileName(report));
    toast.success('Export downloaded');
  }, [report, period.label]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Operations Report"
        description={`${currentCompany?.company_name ?? 'This company'} · production, wastage, labour, salary and electricity, and what each litre cost`}
        icon={ClipboardList}
        accent="indigo"
      />

      <ReportPeriodBar period={period} isFetching={isFetching && !isLoading} />

      <div>
        <h3 className="text-xl font-semibold tracking-tight">{period.label}</h3>
        {period.sublabel && <p className="text-sm text-muted-foreground">{period.sublabel}</p>}
      </div>

      {error && (
        <DashboardError
          message={getErrorMessage(error, 'The report could not be read.')}
          onRetry={() => void refetch()}
        />
      )}

      {isLoading && !report ? (
        <DashboardLoading />
      ) : report ? (
        <>
          <ReportNotices report={report} />
          <ReportKpiRow report={report} />
          <CostPerLitrePanel report={report} palette={palette} />
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
          <ReportTrends report={report} palette={palette} onSelectDay={period.openDay} />
          <BreakdownPanels report={report} palette={palette} />
          {report.view === 'month' && (
            <DailyLedgerTable report={report} onSelectDay={period.openDay} />
          )}
        </>
      ) : null}
    </div>
  );
}
