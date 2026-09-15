import { Printer, Search } from 'lucide-react';
import { useState } from 'react';

import { Button, Input, Label } from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

import { useSapTransferSearch } from '../api';
import { SapTransferPrintButton } from './SapTransferPrintButton';

/**
 * Print an inventory transfer by its SAP document number.
 *
 * The lists in this app only know transfers it raised itself. Plenty are keyed
 * straight into the SAP client — they have no request here and no BST, so they
 * appear on no row, yet they are exactly the ones somebody is standing at a
 * desk waiting to print. Asking for the number reaches every transfer, however
 * it was raised.
 *
 * Mounted on both the Inventory Transfer page (where the document is created)
 * and BST Scanning (where the stock is moved against it), because either desk
 * may be the one that needs the paper.
 *
 * SAP is read only once a number is submitted, never per keystroke: each search
 * is a HANA round trip.
 */
export function PrintTransferDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [docNum, setDocNum] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data: matches, isFetching, isError } = useSapTransferSearch(submitted, open);

  const submit = () => setSubmitted(docNum.trim());

  const close = (next: boolean) => {
    if (!next) {
      setDocNum('');
      setSubmitted('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Print an inventory transfer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="print-transfer-doc-num">SAP document number</Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="print-transfer-doc-num"
                placeholder="e.g. 926676623"
                value={docNum}
                onChange={(e) => setDocNum(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                autoFocus
              />
              <Button variant="outline" onClick={submit} disabled={!docNum.trim()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Works for transfers raised here and for ones keyed straight into SAP.
            </p>
          </div>

          {isFetching ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Searching SAP…</p>
          ) : isError ? (
            <p className="py-4 text-center text-sm text-destructive">
              Could not reach SAP. Try again in a moment.
            </p>
          ) : submitted && matches?.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No inventory transfer found with that number.
            </p>
          ) : matches && matches.length > 0 ? (
            <div className="divide-y rounded-md border">
              {matches.map((t) => (
                <div key={t.doc_entry} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      #{t.doc_num}
                      {t.cancelled ? (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">
                          Cancelled
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.from_warehouse} → {t.to_warehouse} · {t.line_count} lines ·{' '}
                      {t.total_quantity} qty
                      {t.doc_date ? ` · ${new Date(t.doc_date).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <SapTransferPrintButton
                    docEntry={t.doc_entry}
                    docNum={t.doc_num}
                    label="Print"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The header button that opens the dialog, with the dialog's state alongside. */
export function PrintTransferAction() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Printer className="mr-2 h-4 w-4" />
        Print transfer
      </Button>
      <PrintTransferDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
