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

import { useCreateAPInvoiceDraft } from '../api';
import type { OpenGRPO } from '../types';
import { GRPOSelect } from './GRPOSelect';

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Add new entry: the GRPO the bill is for, and the bill itself.
 *
 * Submitting saves the entry and makes the A/P invoice draft in SAP in one go.
 */
export function NewAPInvoiceDraftDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const create = useCreateAPInvoiceDraft();
  const [grpo, setGrpo] = useState<OpenGRPO | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      setGrpo(null);
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
          navigate(`/warehouse/ap-invoice-drafts/${entry.id}`);
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
            Pick the GRPO and upload the vendor's bill. Creating makes the A/P invoice draft in SAP
            straight away.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Not inside DialogBody: its scroll box would clip the picker's list. */}
          <GRPOSelect
            value={grpo ? String(grpo.doc_entry) : undefined}
            onChange={setGrpo}
            disabled={create.isPending}
          />
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
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Making the SAP draft…' : 'Create draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
