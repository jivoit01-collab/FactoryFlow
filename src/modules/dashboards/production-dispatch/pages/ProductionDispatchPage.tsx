import { Boxes, Download, Loader2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { DashboardError, DashboardLoading } from '@/shared/components/dashboard';
import { PageHeader } from '@/shared/components/page';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { productionDispatchApi } from '../api';
import {
  ItemDocumentsDialog,
  ItemsTab,
  KpiRow,
  RangeBar,
  ReportNotices,
  SummaryTab,
} from '../components';
import { useProductionDispatch, useReportRange } from '../hooks';
import { dayItemRows, itemRows, type ReportRange, sumTotals } from '../utils';
import { buildWorkbook, reportFileName } from '../utils/exportWorkbook';

type TabKey = 'summary' | 'items';

/** Whose documents the dialog shows, and over which days. */
interface OpenDocuments extends ReportRange {
  itemCode: string;
}

/**
 * Production & Dispatch: Oil's finished goods made against those sold, SKU by
 * SKU, in boxes, litres, tons and pallets -- the workbook "Production &
 * Dispatch- PALLET" made live, for any range of days.
 *
 * TWO SHEETS. Summary is a row per SKU per day it moved; Items is the same
 * SKUs added up over the range, with their FAST / SLOW. Both come from one
 * read of `/dashboards/production-dispatch/report/` -- SAP's quantities per
 * day and item, added up here (`utils/compute.ts`) -- so they always agree.
 * Sales to group companies are never counted; the notices say how much that
 * was.
 */
export default function ProductionDispatchPage() {
  const range = useReportRange();
  const { data: report, isLoading, isFetching, error, refetch } = useProductionDispatch(range);
  const [tab, setTab] = useState<TabKey>('summary');
  const [documents, setDocuments] = useState<OpenDocuments | null>(null);
  const [exporting, setExporting] = useState(false);

  const days = useMemo(() => (report ? dayItemRows(report) : []), [report]);
  const items = useMemo(() => itemRows(days), [days]);
  const totals = useMemo(() => sumTotals(items), [items]);

  const openItemDay = useCallback(
    (itemCode: string, date: string) => setDocuments({ itemCode, from: date, to: date }),
    [],
  );
  const openItem = useCallback(
    (itemCode: string) => report && setDocuments({ itemCode, from: report.from, to: report.to }),
    [report],
  );

  const handleExport = useCallback(async () => {
    if (!report) return;
    setExporting(true);
    try {
      const { lines } = await productionDispatchApi.getDocuments(report);
      XLSX.writeFile(buildWorkbook(report, days, items, lines), reportFileName(report));
      toast.success('Export downloaded');
    } catch (exportError) {
      toast.error(getErrorMessage(exportError, 'The export could not be built.'));
    } finally {
      setExporting(false);
    }
  }, [report, days, items]);

  const documentsItem =
    report?.items.find((item) => item.item_code === documents?.itemCode) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Production & Dispatch"
        description="Jivo Oil · finished goods made against dispatched, per SKU and day, in boxes, litres, tons and pallets"
        icon={Boxes}
        accent="indigo"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={!report || exporting}
        >
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export Excel
        </Button>
      </PageHeader>

      <RangeBar
        range={range}
        isFetching={isFetching}
        readAt={report?.meta.read_at ?? null}
        onRefresh={() => void refetch()}
      />

      <h3 className="text-xl font-semibold tracking-tight">{range.label}</h3>

      {error && (
        <DashboardError
          message={getErrorMessage(error, 'The report could not be read from SAP.')}
          onRetry={() => void refetch()}
        />
      )}

      {isLoading && !report ? (
        <DashboardLoading />
      ) : report ? (
        <>
          <KpiRow totals={totals} items={items} windowDays={report.settings.movement_window_days} />
          <ReportNotices report={report} items={items} totals={totals} />

          <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="items">Items</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-4">
              <SummaryTab rows={days} onOpenItemDay={openItemDay} />
            </TabsContent>
            <TabsContent value="items" className="mt-4">
              <ItemsTab report={report} items={items} onOpenItem={openItem} />
            </TabsContent>
          </Tabs>

          <ItemDocumentsDialog
            range={documents ?? report}
            item={documents ? documentsItem : null}
            settings={report.settings}
            onClose={() => setDocuments(null)}
          />
        </>
      ) : null}
    </div>
  );
}
