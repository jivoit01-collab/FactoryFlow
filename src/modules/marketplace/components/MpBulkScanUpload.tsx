/**
 * Bulk scan from a file — the sheet-driven twin of the barcode gun.
 *
 * Flipkart's own scanning report (one column of Tracking IDs) is dropped here, the
 * IDs are read in the browser, and each one is put through the SAME scan endpoint
 * the gun uses — so packing/cancelled/unmapped rules still apply and nothing is
 * dispatched that a hand scan would have refused. Whatever the backend rejects is
 * listed back with its reason instead of failing the whole upload.
 */
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { Badge, Button } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import type { BulkScanResponse } from '../types/marketplace.types';

/** A header cell that looks like the tracking-ID column. */
const TRACKING_HEADER = /track(ing)?\s*(id|no|number)?/i;
/** Junk rows: blanks, the header itself, obvious totals. */
const NOT_AN_ID = /^(tracking|total|grand total|count)\b/i;

interface Props {
  pending: boolean;
  onScan: (barcodes: string[]) => void;
  result: BulkScanResponse | null;
  onClearResult: () => void;
}

/** Pull the tracking IDs out of a workbook: prefer a column whose header says
 *  "Tracking ID", else fall back to the first column with data. */
function extractTrackingIds(rows: unknown[][]): string[] {
  if (rows.length === 0) return [];
  const header = (rows[0] ?? []).map((c) => String(c ?? '').trim());
  let col = header.findIndex((h) => TRACKING_HEADER.test(h));
  let start = 1;
  if (col < 0) {
    // No recognisable header — treat every row as data and read the first column.
    col = 0;
    start = 0;
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (let r = start; r < rows.length; r += 1) {
    const raw = String(rows[r]?.[col] ?? '').trim();
    if (!raw || NOT_AN_ID.test(raw)) continue;
    const key = raw.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(raw);
  }
  return ids;
}

export function MpBulkScanUpload({ pending, onScan, result, onClearResult }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState('');
  const [ids, setIds] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [showFailed, setShowFailed] = useState(false);

  function reset() {
    setFilename('');
    setIds([]);
    onClearResult();
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(file: File) {
    setReading(true);
    onClearResult();
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
      const found = extractTrackingIds(rows);
      if (found.length === 0) {
        toast.error('No tracking IDs found — the first sheet needs a "Tracking Id" column.');
        reset();
        return;
      }
      setFilename(file.name);
      setIds(found);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not read that file.'));
      reset();
    } finally {
      setReading(false);
    }
  }

  const failed = result?.results.filter((r) => r.outcome === 'FAILED') ?? [];

  return (
    <div className="rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <FileUp className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Or upload a scanning sheet</span>
        <span className="text-xs text-muted-foreground">
          .xlsx / .csv with a <strong>Tracking Id</strong> column — every ID in it gets scanned.
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={reading || pending}
          onClick={() => fileRef.current?.click()}
        >
          {reading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading…</>
          ) : (
            <><Upload className="mr-2 h-4 w-4" /> Choose file</>
          )}
        </Button>

        {filename && (
          <>
            <Badge variant="secondary" className="max-w-[16rem] truncate" title={filename}>
              {filename}
            </Badge>
            <Badge variant="outline" className="tabular-nums">{ids.length} tracking IDs</Badge>
            <Button size="sm" disabled={pending || ids.length === 0} onClick={() => onScan(ids)}>
              {pending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning {ids.length}…</>
              ) : (
                <>Scan {ids.length} tracking IDs</>
              )}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={reset}>
              <X className="mr-1 h-4 w-4" /> Clear
            </Button>
          </>
        )}
      </div>

      {result && (
        <div className="mt-3 space-y-2 rounded-md bg-muted/50 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> {result.scanned} scanned
            </span>
            {result.duplicate > 0 && (
              <span className="text-muted-foreground">{result.duplicate} already scanned</span>
            )}
            {result.failed > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 font-medium text-destructive underline-offset-2 hover:underline"
                onClick={() => setShowFailed((v) => !v)}
              >
                <AlertTriangle className="h-4 w-4" /> {result.failed} not scanned — see why
              </button>
            )}
            <span className="text-xs text-muted-foreground">of {result.total} in the file</span>
          </div>
          {showFailed && failed.length > 0 && (
            <ul className="max-h-56 space-y-1 overflow-auto text-xs">
              {failed.map((f) => (
                <li key={f.barcode} className="flex flex-wrap gap-2">
                  <span className="font-mono font-medium">{f.barcode}</span>
                  <span className="text-muted-foreground">{f.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
