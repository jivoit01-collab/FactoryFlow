import { Boxes, Download, Loader2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { DashboardError, DashboardLoading } from '@/shared/components/dashboard';
import { PageHeader } from '@/shared/components/page';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { productionDispatchApi } from '../api';
import {
  ItemDocumentsDialog,
  ItemsTab,
  KpiRow,
  RangeBar,
  ReportNotices,
  SummaryTab,
} from '../components';
import { type MeasureKey,MEASURES } from '../components/columns';
import { useProductionDispatch, useReportRange } from '../hooks';
import { dayItemRows, itemRows, type ReportRange, sumTotals } from '../utils';
import { buildWorkbook, reportFileName } from '../utils/exportWorkbook';

type TabKey = 'summary' | 'items';

const UNIT_STORAGE_KEY = 'production-dispatch-unit';

/** The unit last picked, or PALLET, the workbook's own. */
function storedUnit(): MeasureKey {
  try {
    const value = window.localStorage.getItem(UNIT_STORAGE_KEY);
    if (MEASURES.some((measure) => measure.key === value)) return value as MeasureKey;
  } catch {
    // Storage blocked: the default is fine.
  }
  return 'pallet';
}

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
  const [unit, setUnitState] = useState<MeasureKey>(storedUnit);
  const setUnit = (next: MeasureKey) => {
    setUnitState(next);
    try {
      window.localStorage.setItem(UNIT_STORAGE_KEY, next);
    } catch {
      // Remembered for this visit only.
    }
  };

  const days = useMemo(() => (report ? dayItemRows(report) : []), [report]);
  const items = useMemo(() => itemRows(days, report), [days, report]);
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
        <div className="flex rounded-lg border p-0.5" role="group" aria-label="Unit">
          {MEASURES.map((measure) => (
            <button
              key={measure.key}
              type="button"
              onClick={() => setUnit(measure.key)}
              aria-pressed={unit === measure.key}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                unit === measure.key
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {measure.label}
            </button>
          ))}
        </div>
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
          <ReportNotices report={report} items={items} />

          <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="items">Items</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-4">
              <SummaryTab rows={days} unit={unit} onOpenItemDay={openItemDay} />
            </TabsContent>
            <TabsContent value="items" className="mt-4">
              <ItemsTab report={report} items={items} unit={unit} onOpenItem={openItem} />
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
