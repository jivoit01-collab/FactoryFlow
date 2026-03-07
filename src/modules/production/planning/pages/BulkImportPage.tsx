import { format } from 'date-fns';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Upload, XCircle } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { planningApi } from '../api/planning.api';
import type { CreatePlanRequest } from '../types';

// ---- Types ----

type RowStatus = 'pending' | 'in_progress' | 'success' | 'failed';

interface ParsedRow {
  item_code: string;
  item_name: string;
  planned_qty: number;
  status: RowStatus;
  error?: string;
}

// ---- Column detection helpers ----

function normalizeHeader(val: unknown): string {
  return String(val ?? '').trim().toUpperCase().replace(/[\s_]+/g, ' ');
}

/**
 * Detect column indices from the header row.
 * Returns a map with keys: item_code, item_name, planned_qty (value = column index).
 * Falls back to fixed positions (A=0, F=5, last numeric column) if headers aren't found.
 */
function detectColumns(headerRow: unknown[]): { item_code: number; item_name: number; planned_qty: number } | null {
  const codeKeywords = ['CODE', 'ITEM CODE', 'ITEM_CODE', 'ITEMCODE'];
  const nameKeywords = ['SKU', 'ITEM NAME', 'ITEM_NAME', 'ITEMNAME', 'DESCRIPTION'];
  const qtyKeywords = ['PLANNING', 'PLANNED QTY', 'PLANNED_QTY', 'QTY', 'QUANTITY', 'MONTHLY PLANNING'];

  let codeIdx = -1;
  let nameIdx = -1;
  let qtyIdx = -1;

  for (let i = 0; i < headerRow.length; i++) {
    const h = normalizeHeader(headerRow[i]);
    if (codeIdx === -1 && codeKeywords.some((k) => h.includes(k))) codeIdx = i;
    if (nameIdx === -1 && nameKeywords.some((k) => h.includes(k))) nameIdx = i;
    if (qtyKeywords.some((k) => h.includes(k))) qtyIdx = i; // take last match for qty
  }

  // Fallback to fixed column positions matching the known Excel layout
  if (codeIdx === -1) codeIdx = 0; // Column A
  if (nameIdx === -1) nameIdx = 5; // Column F
  if (qtyIdx === -1) qtyIdx = headerRow.length - 1; // Last column

  return { item_code: codeIdx, item_name: nameIdx, planned_qty: qtyIdx };
}

function parseExcelFile(data: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (raw.length < 2) return [];

  // Find the header row (first row that contains "CODE" or similar)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(raw.length, 5); i++) {
    const row = raw[i];
    if (row.some((cell) => normalizeHeader(cell).includes('CODE'))) {
      headerIdx = i;
      break;
    }
  }

  const cols = detectColumns(raw[headerIdx]);
  if (!cols) return [];

  const rows: ParsedRow[] = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    const itemCode = String(row[cols.item_code] ?? '').trim();
    const itemName = String(row[cols.item_name] ?? '').trim();
    const rawQty = row[cols.planned_qty];
    const plannedQty = typeof rawQty === 'number' ? rawQty : parseFloat(String(rawQty).replace(/,/g, ''));

    if (!itemCode || !plannedQty || isNaN(plannedQty) || plannedQty <= 0) continue;

    rows.push({
      item_code: itemCode,
      item_name: itemName || itemCode,
      planned_qty: plannedQty,
      status: 'pending',
    });
  }

  return rows;
}

// ---- Status badge ----

function StatusBadge({ status, error }: { status: RowStatus; error?: string }) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline">Pending</Badge>;
    case 'in_progress':
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Submitting
        </Badge>
      );
    case 'success':
      return (
        <Badge className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3" /> Success
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive" className="gap-1" title={error}>
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      );
  }
}

// ---- Page Component ----

export default function BulkImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [targetStartDate, setTargetStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default dates to current month start/end
  const setDefaultDates = useCallback(() => {
    if (!targetStartDate) {
      const now = new Date();
      setTargetStartDate(format(now, 'yyyy-MM-01'));
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDueDate(format(lastDay, 'yyyy-MM-dd'));
    }
  }, [targetStartDate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDefaultDates();
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result as ArrayBuffer;
        const parsed = parseExcelFile(data);
        if (parsed.length === 0) {
          toast.error('No valid rows found in the Excel file');
          return;
        }
        setRows(parsed);
        toast.success(`Parsed ${parsed.length} rows from ${file.name}`);
      } catch {
        toast.error('Failed to parse Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async () => {
    if (!targetStartDate || !dueDate) {
      toast.error('Please set both Start Date and Due Date');
      return;
    }
    if (dueDate < targetStartDate) {
      toast.error('Due Date must be on or after Start Date');
      return;
    }
    if (rows.length === 0) return;

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    // Collect indices that need processing
    const pending: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].status === 'success') successCount++;
      else pending.push(i);
    }

    const CONCURRENCY = 5;

    await new Promise<void>((resolve) => {
      if (pending.length === 0) { resolve(); return; }
      let next = 0;
      let completed = 0;

      const run = async () => {
        const cursor = next++;
        if (cursor >= pending.length) return;
        const i = pending[cursor];
        const row = rows[i];

        // Mark in_progress
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'in_progress', error: undefined } : r)));

        try {
          const bom = await planningApi.getBOM(row.item_code, row.planned_qty);
          const materials = bom.bom_found
            ? bom.components.map((c) => ({
                component_code: c.component_code,
                component_name: c.component_name,
                required_qty: c.required_qty,
                uom: c.uom,
              }))
            : undefined;

          const payload: CreatePlanRequest = {
            item_code: row.item_code,
            item_name: row.item_name,
            planned_qty: row.planned_qty,
            target_start_date: targetStartDate,
            due_date: dueDate,
            materials,
          };

          await planningApi.createPlan(payload);
          setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'success' } : r)));
          successCount++;
        } catch (err: unknown) {
          const message =
            err && typeof err === 'object' && 'response' in err
              ? String((err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'API error')
              : 'Network error';
          setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'failed', error: message } : r)));
          failCount++;
        }

        completed++;
        if (completed === pending.length) {
          resolve();
        } else {
          run();
        }
      };

      for (let w = 0; w < Math.min(CONCURRENCY, pending.length); w++) {
        run();
      }
    });

    setIsSubmitting(false);
    if (failCount === 0) {
      toast.success(`All ${successCount} plans created successfully!`);
    } else {
      toast.warning(`${successCount} succeeded, ${failCount} failed`);
    }
  };

  const pendingCount = rows.filter((r) => r.status === 'pending' || r.status === 'failed').length;
  const successCount = rows.filter((r) => r.status === 'success').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/production/planning')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bulk Import Plans</h2>
          <p className="text-muted-foreground">Upload an Excel file to create multiple production plans at once</p>
        </div>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="start_date">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start_date"
                type="date"
                value={targetStartDate}
                onChange={(e) => setTargetStartDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Excel File</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => !isSubmitting && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
            {fileName ? (
              <>
                <FileSpreadsheet className="h-10 w-10 text-green-600 mb-2" />
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">{rows.length} rows parsed</p>
                {!isSubmitting && (
                  <p className="text-xs text-muted-foreground mt-1">Click to upload a different file</p>
                )}
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="font-medium">Click to select an Excel file</p>
                <p className="text-sm text-muted-foreground">Supports .xlsx and .xls files</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Preview ({rows.length} rows)
              </CardTitle>
              {successCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {successCount}/{rows.length} completed
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">#</th>
                    <th className="text-left py-2 px-3 font-medium">Item Code</th>
                    <th className="text-left py-2 px-3 font-medium">Item Name</th>
                    <th className="text-right py-2 px-3 font-medium">Planned Qty</th>
                    <th className="text-left py-2 px-3 font-medium">Status</th>
                    <th className="text-left py-2 px-3 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b ${row.status === 'failed' ? 'bg-destructive/5' : row.status === 'success' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                    >
                      <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono text-xs">{row.item_code}</td>
                      <td className="py-2 px-3">{row.item_name}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {row.planned_qty.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3">
                        <StatusBadge status={row.status} error={row.error} />
                      </td>
                      <td className="py-2 px-3 text-xs text-destructive max-w-xs truncate" title={row.error}>
                        {row.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end mt-6 gap-3">
              <Button variant="outline" onClick={() => navigate('/production/planning')} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || pendingCount === 0}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {successCount > 0 ? `Retry ${pendingCount} Failed` : `Add ${pendingCount} Plans`}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
