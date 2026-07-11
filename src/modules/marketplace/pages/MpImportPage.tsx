/**
 * Step 1 — Import a Flipkart order sheet (CSV), with a duplicate-safe review.
 *
 * Flow: choose file → Analyze → review (new vs duplicate orders + unmapped SKUs).
 * Orders that already exist are shown as duplicates and are NOT re-imported until
 * the user explicitly acknowledges them; otherwise only the new orders import.
 */
import { AlertTriangle, FileUp, Search, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
} from '@/shared/components/ui';

import { useBatches, useImportOrders, useImportPreview } from '../api/marketplace.queries';
import { MpFlowSteps } from '../components/MpFlowSteps';
import type { ImportPreview, OrderImportBatch } from '../types/marketplace.types';

export default function MpImportPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; text: string; rows: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [ack, setAck] = useState(false);
  const [result, setResult] = useState<OrderImportBatch | null>(null);

  const previewMut = useImportPreview();
  const importMut = useImportOrders();
  const { data: batches = [] } = useBatches('FLIPKART');

  function reset() {
    setPreview(null);
    setAck(false);
    setResult(null);
  }

  async function readFile(f: File) {
    if (!/\.csv$/i.test(f.name)) {
      toast.error('Please choose a .csv file exported from Flipkart.');
      return;
    }
    const text = await f.text();
    const rows = Math.max(0, text.trim().split(/\r?\n/).length - 1);
    setFile({ name: f.name, text, rows });
    reset();
  }

  function analyze() {
    if (!file) return;
    previewMut.mutate(
      { text: file.text, filename: file.name },
      {
        onSuccess: (p) => setPreview(p),
        onError: (e: unknown) =>
          toast.error((e as { message?: string })?.message ?? 'Could not read the sheet.'),
      },
    );
  }

  function runImport(skipDuplicates: boolean) {
    if (!file) return;
    importMut.mutate(
      { text: file.text, filename: file.name, skip_duplicates: skipDuplicates },
      {
        onSuccess: (batch) => {
          setResult(batch);
          setPreview(null);
          toast.success(`Imported ${batch.order_count} orders.`);
        },
        onError: (e: unknown) =>
          toast.error((e as { message?: string })?.message ?? 'Import failed.'),
      },
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Import Flipkart Orders</h1>
        <p className="text-sm text-muted-foreground">
          Upload the Flipkart order sheet. We check for duplicates before importing.
        </p>
        <MpFlowSteps current={1} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 · Choose order sheet</CardTitle>
          <CardDescription>CSV exported from the Flipkart Seller portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void readFile(f);
            }}
            className={[
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
            ].join(' ')}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm font-medium">
              {file ? file.name : 'Drop the CSV here, or click to choose'}
            </div>
            {file && <div className="text-xs text-muted-foreground">{file.rows} order rows</div>}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void readFile(f);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={analyze} disabled={!file || previewMut.isPending}>
              <Search className="mr-2 h-4 w-4" />
              {previewMut.isPending ? 'Checking…' : 'Analyze sheet'}
            </Button>
            {file && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  reset();
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2 · Review before import</CardTitle>
            <CardDescription>
              {preview.total_orders} orders in the sheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="New orders" value={preview.new_count} tone="emerald" />
              <Stat label="Duplicates" value={preview.duplicate_count} tone={preview.duplicate_count ? 'amber' : undefined} />
              <Stat label="Unmapped SKUs" value={preview.unmapped_skus.length} tone={preview.unmapped_skus.length ? 'amber' : undefined} />
            </div>

            {preview.has_duplicates && (
              <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  {preview.duplicate_count} order(s) already imported earlier
                </div>
                <div className="max-h-32 overflow-y-auto text-xs">
                  <div className="flex flex-wrap gap-1">
                    {preview.duplicate_order_ids.map((id) => (
                      <Badge key={id} variant="outline">
                        {id}
                      </Badge>
                    ))}
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox checked={ack} onCheckedChange={(v) => setAck(Boolean(v))} className="mt-0.5" />
                  <span>
                    Yes, these are duplicates — re-import and <strong>refresh</strong> them with the
                    latest sheet data.
                  </span>
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {preview.has_duplicates ? (
                <>
                  <Button onClick={() => runImport(false)} disabled={!ack || importMut.isPending}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Import all ({preview.total_orders}) & refresh duplicates
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runImport(true)}
                    disabled={importMut.isPending || preview.new_count === 0}
                  >
                    Import new only ({preview.new_count})
                  </Button>
                </>
              ) : (
                <Button onClick={() => runImport(false)} disabled={importMut.isPending}>
                  <FileUp className="mr-2 h-4 w-4" />
                  Import {preview.new_count} orders
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-emerald-500/40">
          <CardHeader>
            <CardTitle className="text-base">Imported — batch #{result.id}</CardTitle>
            <CardDescription>{result.filename}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Imported" value={result.order_count} />
              <Stat label="New" value={result.summary?.created ?? 0} />
              <Stat label="Refreshed" value={result.summary?.updated ?? 0} />
              <Stat label="Skipped dups" value={result.summary?.duplicates_skipped ?? 0} />
            </div>
            {result.unmapped_skus && result.unmapped_skus.length > 0 ? (
              <div className="text-sm text-amber-700 dark:text-amber-400">
                {result.unmapped_skus.length} SKU(s) still need mapping — resolve them in the batch.
              </div>
            ) : (
              <div className="text-sm text-emerald-700 dark:text-emerald-400">
                All SKUs mapped — {result.stock_line_count} consolidated stock lines ready.
              </div>
            )}
            <Button onClick={() => navigate(`/marketplace/batches/${result.id}`)}>
              Review batch →
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent imports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Sheet</th>
                  <th className="p-3">Orders</th>
                  <th className="p-3">Lines</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Uploaded</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No imports yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-3 font-medium">{b.filename || `batch #${b.id}`}</td>
                      <td className="p-3">{b.order_count}</td>
                      <td className="p-3">{b.line_count}</td>
                      <td className="p-3">
                        <Badge variant="outline">{b.status}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/marketplace/batches/${b.id}`)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'amber' }) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-600'
      : tone === 'amber'
        ? 'text-amber-600'
        : '';
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
