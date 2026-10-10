import { AlertCircle, FileUp } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useCreateAPInvoiceDraft, useOpenGRPO } from '../api';
import type { APInvoiceDraftDetail, OpenGRPO } from '../types';
import { GRPOSelect } from './GRPOSelect';

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Add new entry: the GRPO the bill is for, and the bill itself.
 *
 * Submitting saves the entry, reads the bill and runs the checklist, in one go.
 * The A/P invoice draft goes to SAP later, from the entry, after the checklist.
 *
 * Opened from a GRPO's own page, `grpoDocEntry` fixes the GRPO: it is looked
 * up in SAP and shown instead of the picker, and only the bill is asked for.
 * With `onCreated` the form hands the new entry back and stays out of the way;
 * without it, it goes to the entry's page.
 */
export function NewAPInvoiceDraftDialog({
  open,
  onOpenChange,
  grpoDocEntry = null,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grpoDocEntry?: number | null;
  onCreated?: (entry: APInvoiceDraftDetail) => void;
}) {
  const navigate = useNavigate();
  const create = useCreateAPInvoiceDraft();
  const [picked, setPicked] = useState<OpenGRPO | null>(null);
  const fixed = useOpenGRPO(grpoDocEntry, open);
  const grpo = grpoDocEntry ? (fixed.data ?? null) : picked;
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      setPicked(null);
      setFile(null);
      setFormError(null);
      create.reset();
    }
    onOpenChange(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!grpo) {
      setFormError('Pick the GRPO this bill is for.');
      return;
    }
    if (grpo.entry_no) {
      setFormError(`GRPO ${grpo.doc_num} is already entered as ${grpo.entry_no}.`);
      return;
    }
    if (!file) {
      setFormError('Upload the bill (PDF or photo).');
      return;
    }
    if (file.size > MAX_BYTES) {
      setFormError('The bill is larger than 15 MB. Scan it at a lower resolution.');
      return;
    }
    setFormError(null);
    create.mutate(
      { grpo_doc_entry: grpo.doc_entry, invoice_file: file },
      {
        onSuccess: (entry) => {
          close(false);
          if (onCreated) onCreated(entry);
          else navigate(`/warehouse/ap-invoice-drafts/${entry.id}`);
        },
      },
    );
  };

  const errorMessage =
    formError ?? (create.error ? getErrorMessage(create.error, 'Could not save the entry.') : null);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            New A/P invoice draft
          </DialogTitle>
          <DialogDescription>
            {grpoDocEntry
              ? "Upload the vendor's bill for this GRPO."
              : "Pick the GRPO and upload the vendor's bill."}{' '}
            Creating reads the bill and runs the checklist — about ten seconds. The A/P invoice
            draft goes to SAP from the entry, after the checklist.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {grpoDocEntry ? (
            <FixedGRPO grpo={grpo} isLoading={fixed.isLoading} isError={fixed.isError} />
          ) : (
            // Not inside DialogBody: its scroll box would clip the picker's list.
            <GRPOSelect
              value={picked ? String(picked.doc_entry) : undefined}
              onChange={setPicked}
              disabled={create.isPending}
            />
          )}
          {grpo && (
            <p className="text-xs text-muted-foreground">
              {grpo.vendor_name} · bill no. on the GRPO: {grpo.reference || '—'} · into{' '}
              {grpo.warehouses.join(', ') || '—'}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ap-invoice-draft-file">
              Vendor's bill <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ap-invoice-draft-file"
              type="file"
              accept={ACCEPT}
              disabled={create.isPending}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">PDF or photo, up to 15 MB.</p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => close(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || (!!grpoDocEntry && !grpo)}>
              {create.isPending ? 'Making the draft and reading the bill…' : 'Create draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The GRPO the form was opened on, as SAP has it now. */
function FixedGRPO({
  grpo,
  isLoading,
  isError,
}: {
  grpo: OpenGRPO | null;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Looking the GRPO up in SAP…</p>;
  }
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        SAP is not answering. Try again in a moment.
      </p>
    );
  }
  if (!grpo) {
    return (
      <p role="alert" className="text-sm text-destructive">
        SAP no longer has this GRPO open — it is already invoiced or closed.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">GRPO</p>
      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
        {grpo.doc_num}
        {grpo.entry_no ? (
          <span className="block text-xs text-destructive">Already entered as {grpo.entry_no}</span>
        ) : grpo.sap_draft_entries.length > 0 ? (
          <span className="block text-xs text-amber-700 dark:text-amber-400">
            SAP already has draft {grpo.sap_draft_entries.join(', ')} — it will be linked
          </span>
        ) : null}
      </p>
    </div>
  );
}
