/**
 * Upload a monthly plan workbook: the file, the month when the sheet does not
 * say (or says wrong), and a note. It becomes the next version of its month,
 * and the live one.
 *
 * The parser reads every row it can and reports the rest instead of refusing
 * the file: a figure the sheet totals differently from its weeks (the weeks
 * win), a code that repeats, a cell that is not a number. EXIM flashed the
 * first three of each in a toast; here the dialog stays open and lists them
 * all, so they can be fixed in the sheet before it goes round again.
 */
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { type FormEvent, useId, useRef, useState } from 'react';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { cn, getErrorMessage, isApiError } from '@/shared/utils';

import { useUploadMonthlyPlan } from '../api';
import type { MonthlyPlanUploadResult } from '../types';
import { monthName, versionLabel } from './monthlyPlan';

const MAX_BYTES = 10 * 1024 * 1024;

/** Header and buttons stay put while the middle scrolls. */
const FRAME = 'grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-xl';

function sizeOf(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Findings({
  title,
  hint,
  items,
  tone,
}: {
  title: string;
  hint: string;
  items: string[];
  tone: 'amber' | 'slate';
}) {
  if (!items.length) return null;
  return (
    <section
      className={cn(
        'rounded-lg border px-3 py-2.5',
        tone === 'amber'
          ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
          : 'bg-muted/30',
      )}
    >
      <h4
        className={cn(
          'flex items-center gap-2 text-sm font-semibold',
          tone === 'amber' && 'text-amber-800 dark:text-amber-300',
        )}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {title}
      </h4>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto break-words font-mono text-xs">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function UploadForm({
  onUploaded,
  onClose,
}: {
  onUploaded: (result: MonthlyPlanUploadResult) => void;
  onClose: () => void;
}) {
  const baseId = useId();
  const ids = { file: `${baseId}-file`, month: `${baseId}-month`, notes: `${baseId}-notes` };
  const monthRef = useRef<HTMLInputElement>(null);
  const upload = useUploadMonthlyPlan();

  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState('');
  const [notes, setNotes] = useState('');
  const [problem, setProblem] = useState('');
  const [monthNeeded, setMonthNeeded] = useState(false);

  function pick(chosen: File | null) {
    setProblem('');
    setFile(chosen);
    if (!chosen) return;
    if (!/\.xls[xm]$/i.test(chosen.name)) setProblem('Pick the plan as an .xlsx workbook.');
    else if (chosen.size > MAX_BYTES)
      setProblem(`That file is ${sizeOf(chosen.size)}; the limit is 10 MB.`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || problem) return;
    setProblem('');
    upload.mutate(
      { file, month: month ? `${month}-01` : undefined, notes: notes.trim() || undefined },
      {
        onSuccess: onUploaded,
        onError: (error) => {
          const code = isApiError(error) ? error.response?.data?.code : undefined;
          setMonthNeeded(code === 'month_unknown');
          setProblem(getErrorMessage(error, 'The plan could not be uploaded.'));
          if (code === 'month_unknown') monthRef.current?.focus();
        },
      },
    );
  }

  const busy = upload.isPending;

  return (
    <form onSubmit={submit} className="contents">
      <DialogBody className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={ids.file}>Workbook</Label>
          <Input
            id={ids.file}
            type="file"
            accept=".xlsx,.xlsm"
            disabled={busy}
            onChange={(event) => pick(event.target.files?.[0] ?? null)}
            className="h-auto py-1.5"
          />
          {file && (
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{file.name}</span>
              <span className="shrink-0">· {sizeOf(file.size)}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={ids.month}>Month (optional)</Label>
          <Input
            ref={monthRef}
            id={ids.month}
            type="month"
            value={month}
            disabled={busy}
            onChange={(event) => {
              setMonth(event.target.value);
              setMonthNeeded(false);
            }}
            aria-invalid={monthNeeded || undefined}
            className={cn('w-full sm:w-56', monthNeeded && 'border-destructive')}
          />
          <p className="text-xs text-muted-foreground">
            {month
              ? `Saved as ${monthName(`${month}-01`)}, whatever the sheet says.`
              : 'Leave empty to use the month the sheet names in its banner.'}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={ids.notes}>Notes (optional)</Label>
          <Textarea
            id={ids.notes}
            value={notes}
            maxLength={2000}
            rows={3}
            disabled={busy}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What changed in this version"
          />
        </div>

        {problem && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{problem}</span>
          </p>
        )}
      </DialogBody>

      <DialogFooter className="gap-2 sm:space-x-0">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={!file || !!problem || busy}>
          <Upload className="mr-1.5 h-4 w-4" />
          {busy ? 'Reading the workbook…' : 'Upload'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function UploadResult({
  result,
  onClose,
}: {
  result: MonthlyPlanUploadResult;
  onClose: () => void;
}) {
  const { upload, warnings, mismatches, replaced_version: replaced } = result;
  return (
    <>
      <DialogBody className="space-y-3">
        <p className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Saved as {versionLabel(upload)}, {upload.row_count.toLocaleString('en-IN')} SKU rows. It
            is now the live plan for {monthName(upload.month)}
            {replaced ? `; v${replaced} stays in the history.` : '.'}
          </span>
        </p>
        <Findings
          title={`${mismatches.length} figure${mismatches.length === 1 ? '' : 's'} differ from the sheet's own totals`}
          hint="The sheet's monthly or total figure does not add up from its weeks. The weeks were kept; check the sheet."
          items={mismatches}
          tone="amber"
        />
        <Findings
          title={`${warnings.length} warning${warnings.length === 1 ? '' : 's'} while reading`}
          hint="Rows read with a doubt: a repeated code, a cell that is not a number, or a SKU planned in both blocks."
          items={warnings}
          tone="slate"
        />
        {!mismatches.length && !warnings.length && (
          <p className="text-sm text-muted-foreground">Every row read cleanly.</p>
        )}
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  );
}

export function MonthlyPlanUploadDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The new version is saved: show it. */
  onUploaded: (uploadId: number) => void;
}) {
  const [result, setResult] = useState<MonthlyPlanUploadResult | null>(null);

  function close() {
    onOpenChange(false);
    setResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className={FRAME}>
        <DialogHeader>
          <DialogTitle>{result ? 'Plan uploaded' : 'Upload the monthly plan'}</DialogTitle>
          <DialogDescription>
            {result
              ? 'What the workbook said, and what to check in it.'
              : "The planning team's workbook, as an .xlsx up to 10 MB. It becomes the next version of its month and the live plan; earlier versions stay."}
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <UploadResult result={result} onClose={close} />
        ) : (
          open && (
            <UploadForm
              onClose={close}
              onUploaded={(done) => {
                setResult(done);
                onUploaded(done.upload.id);
              }}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
