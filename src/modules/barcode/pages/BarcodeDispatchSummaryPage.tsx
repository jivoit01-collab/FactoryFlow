import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Printer,
  Truck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useDispatchDetailReport, useDispatchSession } from '../api';
import type { DispatchDetailReport, DispatchSessionStatus } from '../types';

type ExportCell = string | number | boolean | null | undefined;
type ExportRow = Record<string, ExportCell>;

const STATUS_TONE: Partial<Record<DispatchSessionStatus, string>> = {
  COMPLETED: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  CLOSED: 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 text-slate-700 dark:text-muted-foreground',
  CANCELLED: 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
  SAP_SYNC_FAILED: 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
  READY_TO_DISPATCH: 'border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN');
}

function formatNumber(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return String(value ?? '-');
  return numeric.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function formatQtyWithBoxes(
  qty: string | number | null | undefined,
  boxes?: string | number | null,
  uom = 'PCS',
) {
  const qtyText = `${formatNumber(qty)} ${uom}`.trim();
  const boxValue = Number(boxes ?? 0);
  if (!Number.isFinite(boxValue) || boxValue <= 0) return qtyText;
  return `${qtyText} / ${formatNumber(boxValue)} Boxes`;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'dispatch-summary';
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function createSimplePdf(title: string, sections: Array<{ heading: string; lines: string[] }>) {
  const pageHeight = 792;
  const left = 42;
  const lineHeight = 15;
  const pages: string[][] = [[]];
  let y = 748;

  const addLine = (line: string, size = 10) => {
    if (y < 48) {
      pages.push([]);
      y = 748;
    }
    pages[pages.length - 1].push(`BT /F1 ${size} Tf ${left} ${y} Td (${escapePdfText(line)}) Tj ET`);
    y -= lineHeight;
  };

  addLine(title, 16);
  addLine(`Generated ${formatDateTime(new Date().toISOString())}`, 9);
  y -= 8;
  sections.forEach((section) => {
    addLine(section.heading, 12);
    section.lines.forEach((line) => addLine(line, 9));
    y -= 6;
  });

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const pageObjectIds = pages.map((_, index) => 4 + index * 2);
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  pages.forEach((page, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    const content = page.join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function SummaryTile({
  label,
  value,
  icon,
  tone = 'slate',
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'cyan';
}) {
  const toneClass = {
    slate: 'border-slate-200 dark:border-border bg-white',
    emerald: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10',
    amber: 'border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10',
    rose: 'border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10',
    cyan: 'border-cyan-200 dark:border-cyan-500/30 bg-cyan-50/70 dark:bg-cyan-500/10',
  }[tone];

  return (
    <div className={cn('rounded-md border p-4', toneClass)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-xl font-semibold leading-tight">{value}</p>
    </div>
  );
}

function buildExportRows(report: DispatchDetailReport) {
  const { session } = report;
  const summaryRows: ExportRow[] = [
    {
      'Bill Number': session.bill_number,
      'Delivery Number': session.delivery_number,
      Customer: session.customer_name || session.customer_code,
      Status: session.status,
      'Expected Qty': session.total_expected_qty,
      'Expected Boxes': session.total_expected_boxes,
      'Dispatched Qty': session.total_dispatched_qty,
      'Dispatched Boxes': session.total_dispatched_boxes,
    },
  ];

  const lineRows: ExportRow[] = report.lines.map((line) => ({
    Sequence: line.sap_line_no,
    'Material Code': line.material_code,
    Description: line.material_description,
    'Expected Qty': line.expected_qty,
    'Expected Boxes': line.expected_boxes,
    'Dispatched Qty': line.dispatched_qty,
    'Dispatched Boxes': line.dispatched_boxes,
    'Pending Qty': line.pending_qty,
    'Pending Boxes': line.pending_boxes,
    UOM: line.uom,
    Status: line.status,
  }));

  const scanRows: ExportRow[] = report.scans.map((scan) => ({
    'Scan ID': scan.scan_id,
    Barcode: scan.barcode,
    Type: scan.scan_type,
    'Material Code': scan.material_code,
    Qty: scan.qty,
    Result: scan.result,
    'Rejection Reason': scan.rejection_reason,
    User: scan.scanned_by,
    Time: formatDateTime(scan.scanned_at),
  }));

  return { summaryRows, lineRows, scanRows };
}

export default function BarcodeDispatchSummaryPage() {
  const navigate = useNavigate();
  const { sessionId: rawSessionId } = useParams();
  const sessionId = Number(rawSessionId || 0) || null;
  const detailReport = useDispatchDetailReport(sessionId);
  const sessionQuery = useDispatchSession(sessionId);

  const report = detailReport.data ?? null;
  const session = sessionQuery.data ?? null;
  const filename = sanitizeFilename(`dispatch-summary-${report?.session.bill_number || sessionId || ''}`);

  const totals = useMemo(() => {
    if (!report) return null;
    const pendingQty = report.lines.reduce((sum, line) => sum + Number(line.pending_qty || 0), 0);
    const pendingBoxes = report.lines.reduce((sum, line) => sum + Number(line.pending_boxes || 0), 0);
    return {
      pendingQty,
      pendingBoxes,
      acceptedScans: report.scans.filter((scan) => scan.result === 'ACCEPTED').length,
      rejectedScans: report.scans.filter((scan) => scan.result === 'REJECTED').length,
    };
  }, [report]);

  const handleExcelDownload = () => {
    if (!report) {
      toast.info('Summary is still loading');
      return;
    }
    const workbook = XLSX.utils.book_new();
    const { summaryRows, lineRows, scanRows } = buildExportRows(report);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(lineRows), 'Lines');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(scanRows), 'Scans');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const handlePdfDownload = () => {
    if (!report || !totals) {
      toast.info('Summary is still loading');
      return;
    }
    const pdf = createSimplePdf(`Dispatch Summary - ${report.session.bill_number}`, [
      {
        heading: 'Bill',
        lines: [
          `Customer: ${report.session.customer_name || report.session.customer_code || '-'}`,
          `Delivery: ${report.session.delivery_number || '-'}`,
          `Status: ${report.session.status}`,
          `Expected: ${formatQtyWithBoxes(report.session.total_expected_qty, report.session.total_expected_boxes)}`,
          `Dispatched: ${formatQtyWithBoxes(report.session.total_dispatched_qty, report.session.total_dispatched_boxes)}`,
          `Pending: ${formatQtyWithBoxes(totals.pendingQty, totals.pendingBoxes)}`,
        ],
      },
      {
        heading: 'Lines',
        lines: report.lines.map(
          (line) =>
            `${line.material_code} - ${formatQtyWithBoxes(line.dispatched_qty, line.dispatched_boxes, line.uom)} dispatched, ${formatQtyWithBoxes(line.pending_qty, line.pending_boxes, line.uom)} pending`,
        ),
      },
      {
        heading: 'Scans',
        lines: [
          `Accepted: ${totals.acceptedScans}`,
          `Rejected: ${totals.rejectedScans}`,
          ...report.scans.slice(0, 35).map((scan) => `${formatDateTime(scan.scanned_at)} - ${scan.result} - ${scan.barcode}`),
        ],
      },
    ]);
    downloadBlob(`${filename}.pdf`, pdf);
  };

  const handlePrint = () => window.print();

  if (!sessionId) {
    return (
      <div className="space-y-5">
        <DashboardHeader title="Dispatch Summary" description="Completed dispatch summary" />
        <Card className="rounded-md">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Dispatch session id is missing.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (detailReport.isLoading || sessionQuery.isLoading) {
    return (
      <div className="space-y-5">
        <DashboardHeader title="Dispatch Summary" description="Completed dispatch summary" />
        <div className="flex items-center justify-center gap-2 rounded-md border bg-white p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading summary
        </div>
      </div>
    );
  }

  if (!report || detailReport.isError) {
    return (
      <div className="space-y-5">
        <DashboardHeader title="Dispatch Summary" description="Completed dispatch summary" />
        <Card className="rounded-md">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Unable to load dispatch summary.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DashboardHeader
        title={`Dispatch Summary · ${report.session.bill_number}`}
        description="Final dispatch quantities, item status, and scan audit"
      />

      <section className="flex flex-col gap-3 rounded-md border bg-white p-4 shadow-sm print:hidden lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/barcode/dispatch')}>
            <ArrowLeft className="h-4 w-4" />
            Dispatch
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/barcode/dispatch/reports?session=${sessionId}`)}>
            <FileText className="h-4 w-4" />
            Report
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExcelDownload}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePdfDownload}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </section>

      <section className="rounded-md border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={STATUS_TONE[report.session.status] || 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 text-slate-700 dark:text-muted-foreground'}>
                {report.session.status.replaceAll('_', ' ')}
              </Badge>
            </div>
            <h2 className="mt-2 text-2xl font-semibold">{report.session.bill_number}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.session.customer_name || report.session.customer_code || '-'} ·{' '}
              {report.session.delivery_number || 'No delivery ref'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Completed {formatDateTime(session?.completed_at || session?.dispatched_at)}
              {session?.completed_by_name ? ` by ${session.completed_by_name}` : ''}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[420px]">
            <SummaryTile
              label="Expected"
              value={formatQtyWithBoxes(report.session.total_expected_qty, report.session.total_expected_boxes)}
              icon={<Package className="h-4 w-4" />}
              tone="cyan"
            />
            <SummaryTile
              label="Dispatched"
              value={formatQtyWithBoxes(report.session.total_dispatched_qty, report.session.total_dispatched_boxes)}
              icon={<CheckCircle2 className="h-4 w-4" />}
              tone="emerald"
            />
            <SummaryTile
              label="Pending"
              value={formatQtyWithBoxes(totals?.pendingQty, totals?.pendingBoxes)}
              icon={<AlertTriangle className="h-4 w-4" />}
              tone={Number(totals?.pendingQty || 0) > 0 ? 'amber' : 'slate'}
            />
            <SummaryTile
              label="Scans"
              value={`${totals?.acceptedScans || 0} accepted / ${totals?.rejectedScans || 0} rejected`}
              icon={<Truck className="h-4 w-4" />}
            />
          </div>
        </div>
      </section>

      <Card className="rounded-md">
        <div className="border-b p-4">
          <h2 className="text-base font-semibold">Items</h2>
        </div>
        <CardContent className="p-0">
          <div className="divide-y">
            {report.lines.map((line) => (
              <div key={line.line_id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-semibold">{line.material_code}</p>
                    <Badge>{line.status}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{line.material_description || '-'}</p>
                  <p className="mt-2 text-xs text-muted-foreground">SAP line {line.sap_line_no || '-'}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <SummaryTile label="Expected" value={formatQtyWithBoxes(line.expected_qty, line.expected_boxes, line.uom)} icon={<Package className="h-4 w-4" />} tone="cyan" />
                  <SummaryTile label="Done" value={formatQtyWithBoxes(line.dispatched_qty, line.dispatched_boxes, line.uom)} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
                  <SummaryTile label="Pending" value={formatQtyWithBoxes(line.pending_qty, line.pending_boxes, line.uom)} icon={<AlertTriangle className="h-4 w-4" />} tone={Number(line.pending_qty || 0) > 0 ? 'amber' : 'slate'} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <h2 className="text-base font-semibold">Scan Audit</h2>
          <Badge className="border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 text-slate-700 dark:text-muted-foreground">{report.scans.length.toLocaleString('en-IN')}</Badge>
        </div>
        <CardContent className="p-0">
          {report.scans.length ? (
            <div className="divide-y">
              {report.scans.slice(0, 50).map((scan) => (
                <div key={scan.scan_id} className="grid gap-2 p-4 md:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-mono text-sm font-semibold">{scan.barcode}</p>
                      <Badge className={scan.result === 'ACCEPTED' ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'}>
                        {scan.result}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {scan.material_code || '-'} · {formatQtyWithBoxes(scan.qty, null)}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground md:text-right">
                    <p>{scan.scanned_by || '-'}</p>
                    <p>{formatDateTime(scan.scanned_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">No scan rows found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
