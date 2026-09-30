import { Fragment, useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { usePostingPreview, usePostToSap } from '../api';
import { qty } from '../format';
import type { StockAuditDetail } from '../types';

/**
 * The one step that writes to SAP: shows what the Inventory Posting will
 * change — each RM and PM line that differs, and for a batch item each batch —
 * and posts it once confirmed.
 */
export function PostToSapDialog({
  audit,
  open,
  onClose,
}: {
  audit: StockAuditDetail;
  open: boolean;
  onClose: () => void;
}) {
  const preview = usePostingPreview(audit.id, open);
  const post = usePostToSap(audit.id);
  const unknown = audit.sap_posting === 'UNKNOWN';
  const [checkedSap, setCheckedSap] = useState(false);

  const lines = preview.data?.lines ?? [];
  const blocked = preview.data?.blocked ?? [];
  const canPost = lines.length > 0 && blocked.length === 0 && (!unknown || checkedSap);

  const handlePost = async () => {
    try {
      const result = await post.mutateAsync(unknown);
      toast.success(`Posted to SAP as document ${result.sap_doc_num}`);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'The posting did not go through.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Post to SAP</DialogTitle>
        </DialogHeader>

        {preview.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Reading SAP…</p>
        ) : preview.isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            {getErrorMessage(preview.error, 'SAP is not answering.')}
          </p>
        ) : lines.length === 0 && blocked.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No RM or PM difference to post.
          </p>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Item</th>
                  <th className="py-2 pr-2 text-right font-medium">SAP</th>
                  <th className="py-2 pr-2 text-right font-medium">On Hand</th>
                  <th className="py-2 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <Fragment key={line.line_id}>
                    <tr className="border-b last:border-0">
                      <td className="py-2 pr-2">
                        <span className="font-mono">{line.item_code}</span>
                        <span className="block text-xs text-muted-foreground">
                          {line.item_name}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-right font-mono tabular-nums">
                        {qty(line.sap_qty)}
                      </td>
                      <td className="py-2 pr-2 text-right font-mono tabular-nums">
                        {qty(line.counted_qty)}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums">
                        {Number(line.difference) > 0 ? '+' : ''}
                        {qty(line.difference)} {line.uom}
                      </td>
                    </tr>
                    {line.batches.map((b) => (
                      <tr
                        key={`${line.line_id}-${b.batch}`}
                        className="text-xs text-muted-foreground"
                      >
                        <td className="py-1 pl-4 pr-2">Batch {b.batch}</td>
                        <td className="py-1 pr-2 text-right font-mono tabular-nums">
                          {qty(b.sap_qty)}
                        </td>
                        <td className="py-1 pr-2 text-right font-mono tabular-nums">
                          {qty(b.counted_qty)}
                        </td>
                        <td />
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {blocked.length > 0 && (
              <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                <p className="font-medium">Cannot be posted:</p>
                <ul className="mt-1 list-disc pl-5">
                  {blocked.map((b) => (
                    <li key={b.line_id}>
                      <span className="font-mono">{b.item_code}</span> — {b.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {unknown && (
          <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
            <Checkbox
              checked={checkedSap}
              onCheckedChange={(value) => setCheckedSap(value === true)}
              aria-label="I checked SAP"
            />
            <span>
              The last try got no answer from SAP. I checked SAP and this audit’s Inventory Posting
              is not there.
            </span>
          </label>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePost} disabled={!canPost || post.isPending}>
            {post.isPending ? 'Posting…' : `Post ${lines.length} items to SAP`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
