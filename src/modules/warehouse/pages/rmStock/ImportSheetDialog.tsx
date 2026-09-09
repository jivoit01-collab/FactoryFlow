import { AlertTriangle, ClipboardPaste, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import type { RawMaterialSheetImport } from '@/modules/warehouse/api';
import { useImportRMSheet } from '@/modules/warehouse/api';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

export interface ImportSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The warehouse every imported quantity is registered against. */
  registerWarehouse: string;
}

const qty = (value: string) =>
  Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });

/**
 * Reads the warehouse's shift-wise issue sheet into the register.
 *
 * Either route in: pick the saved file, or select the rows in Excel and paste
 * them. For the four or five lines of one shift, pasting beats saving a file
 * and then finding it again, and the clipboard hands over the same grid — the
 * server reads both with one parser.
 *
 * Two steps on purpose. What was given is parsed and shown first — the per-item
 * totals, the rows it could not use, and any line where the two issuers
 * disagreed — and only written when the keeper says go. A wrong sheet is then a
 * wrong screen rather than a wrong register, which matters because an import
 * overwrites every quantity it touches.
 */
export function ImportSheetDialog({
  open,
  onOpenChange,
  registerWarehouse,
}: ImportSheetDialogProps) {
  const importSheet = useImportRMSheet();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<RawMaterialSheetImport | null>(null);

  function reset() {
    setFile(null);
    setText('');
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function switchMode(next: 'paste' | 'file') {
    setMode(next);
    reset();
  }

  async function handleFile(chosen: File | null) {
    setFile(chosen);
    setPreview(null);
    if (!chosen) return;
    try {
      setPreview(await importSheet.mutateAsync({ file: chosen }));
    } catch (err) {
      toast.error(getErrorMessage(err, 'That sheet could not be read.'));
      reset();
    }
  }

  /**
   * Parses as soon as something is pasted. `onPaste` fires before React has the
   * new value, so the clipboard text is read straight off the event rather than
   * from state a render behind.
   */
  async function handlePaste(pasted: string) {
    setText(pasted);
    setPreview(null);
    if (!pasted.trim()) return;
    try {
      setPreview(await importSheet.mutateAsync({ text: pasted }));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Those rows could not be read.'));
      setPreview(null);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    if (mode === 'file' ? !file : !text.trim()) return;
    try {
      const result = await importSheet.mutateAsync({
        ...(mode === 'file' ? { file } : { text }),
        commit: true,
        // The keeper has seen the disagreements on screen by this point.
        acceptMismatches: preview.mismatches.length > 0,
      });
      const written = result.written?.length ?? 0;
      const failed = result.failed?.length ?? 0;
      if (failed > 0) {
        toast.warning(`${written} item(s) registered, ${failed} could not be saved.`);
      } else {
        toast.success(`${written} item(s) registered in ${registerWarehouse}.`);
      }
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err, 'The import could not be saved.'));
    }
  }

  const busy = importSheet.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload the issue sheet</DialogTitle>
          <DialogDescription>
            The shift-wise sheet the store already keeps. Each item&apos;s{' '}
            <strong>Issued to Production</strong> figure is summed across its shifts and
            registered against {registerWarehouse}. Nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === 'paste' ? 'default' : 'outline'}
              onClick={() => switchMode('paste')}
              disabled={busy}
            >
              <ClipboardPaste className="mr-1.5 h-4 w-4" />
              Paste from Excel
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'file' ? 'default' : 'outline'}
              onClick={() => switchMode('file')}
              disabled={busy}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Upload a file
            </Button>
          </div>

          {mode === 'paste' ? (
            <div>
              <Textarea
                rows={5}
                value={text}
                placeholder={
                  'Select the rows in Excel, copy, and paste here…\n' +
                  '08.09.2026\tShift 1\tRM0000011\tGROUNDNUT LOOSE OIL\t16,000\t16000\t16000'
                }
                className="font-mono text-xs"
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (pasted) {
                    e.preventDefault();
                    void handlePaste(pasted);
                  }
                }}
                onChange={(e) => setText(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value.trim() && !preview) void handlePaste(e.target.value);
                }}
                disabled={busy}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Copy across all the columns — Date, Shift, RM SAP Code, SKU, Requirement and
                both Issued to Production columns. The header line is optional.
              </p>
            </div>
          ) : (
            <div>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xlsm"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:cursor-pointer"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                disabled={busy}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Columns: Date, Shift, RM SAP Code, SKU, Requirement, and the two Issued to
                Production columns. The header row is found wherever it sits.
              </p>
            </div>
          )}

          {busy && !preview && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading the rows…
            </p>
          )}

          {preview && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">
                  <FileSpreadsheet className="mr-1 h-3 w-3" />
                  {preview.items.length} item{preview.items.length === 1 ? '' : 's'}
                </Badge>
                <Badge variant="outline">{preview.issuer_columns} issuer columns</Badge>
                {preview.skipped.length > 0 && (
                  <Badge variant="outline" className="text-amber-700 dark:text-amber-400">
                    {preview.skipped.length} row(s) skipped
                  </Badge>
                )}
              </div>

              {preview.mismatches.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium">
                      The two issuers disagree on {preview.mismatches.length} row
                      {preview.mismatches.length === 1 ? '' : 's'}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {preview.mismatches.slice(0, 5).map((m) => (
                        <li key={`${m.row}-${m.item_code}`}>
                          Row {m.row} · <span className="font-mono">{m.item_code}</span> —{' '}
                          {m.values.join(' vs ')}; using {m.using}.
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60">
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Shifts</th>
                      <th className="px-3 py-2 text-right">Requirement</th>
                      <th className="px-3 py-2 text-right">Issued → register</th>
                      <th className="px-3 py-2 text-left">As of</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item) => (
                      <tr key={item.item_code} className="border-t">
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs">{item.item_code}</span>
                          <p className="text-xs text-muted-foreground">{item.item_name}</p>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {item.shifts.join(', ') || '—'}
                          {item.row_count > 1 && ` (${item.row_count} rows)`}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {qty(item.requirement)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                          {qty(item.qty)}
                          {item.has_mismatch && (
                            <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-600" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {item.as_of_date ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.skipped.length > 0 && (
                <div className="rounded-md border px-3 py-2 text-xs">
                  <p className="font-medium">Rows not imported</p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {preview.skipped.slice(0, 5).map((s) => (
                      <li key={`${s.row}-${s.item_code}`}>
                        Row {s.row} · <span className="font-mono">{s.item_code}</span> —{' '}
                        {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Each item&apos;s existing quantity is replaced, and the figure it replaces is
                kept in that item&apos;s history.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleCommit} disabled={!preview || busy}>
            {busy && preview ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1 h-4 w-4" />
            )}
            Register {preview ? `${preview.items.length} item(s)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
