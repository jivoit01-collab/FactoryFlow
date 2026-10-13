import { Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useAttachVoucherBill, useRemoveVoucherBill } from '../api';
import type { VoucherBill } from '../types';
import { BILL_EXTENSIONS, billFileProblem } from '../utils/bills';

interface VoucherBillUploadProps {
  entryId: number;
  /** From the plan: whether the voucher already has a bill (cash book or here). */
  hasBill: boolean;
  billCount: number;
  disabled?: boolean;
}

/**
 * A "posting bill": a photograph added on the SAP page, because an APPROVED
 * voucher cannot take one in the cash book any more. SAP refuses an imprest
 * GRPO without an attachment (rule 200019), so a goods voucher with none is
 * blocking (`NO_BILL`) until one is added here.
 *
 * The plan only counts bills; it does not list them. A bill added in this
 * session can be taken off again from here (until it is in SAP); an older one
 * is removed by the person who added it, or in SAP.
 */
export function VoucherBillUpload({
  entryId,
  hasBill,
  billCount,
  disabled,
}: VoucherBillUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [added, setAdded] = useState<VoucherBill[]>([]);
  const attach = useAttachVoucherBill();
  const remove = useRemoveVoucherBill();

  async function upload(file: File | undefined) {
    if (!file) return;
    const problem = billFileProblem(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      const bill = await attach.mutateAsync({ entryId, file });
      setAdded((rows) => [...rows, bill]);
      toast.success(`${bill.original_filename} added`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'The bill could not be added.'));
    } finally {
      if (input.current) input.current.value = '';
    }
  }

  async function takeOff(bill: VoucherBill) {
    try {
      await remove.mutateAsync(bill.id);
      setAdded((rows) => rows.filter((row) => row.id !== bill.id));
      toast.success(`${bill.original_filename} taken off`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'The bill could not be taken off.'));
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        {hasBill ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <Paperclip className="h-3.5 w-3.5" />
            {billCount > 0 ? billCount : 'Yes'}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
        {!disabled && (
          <>
            <input
              ref={input}
              type="file"
              accept={BILL_EXTENSIONS.join(',')}
              className="hidden"
              aria-label="Add a bill photo"
              onChange={(e) => void upload(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5"
              onClick={() => input.current?.click()}
              disabled={attach.isPending}
              title="Add a bill photo"
            >
              {attach.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
            </Button>
          </>
        )}
      </div>
      {added.map((bill) => (
        <div key={bill.id} className="flex items-center gap-1 text-[11px]">
          <a
            href={bill.url}
            target="_blank"
            rel="noreferrer"
            className="max-w-[120px] truncate underline"
          >
            {bill.original_filename}
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 px-1"
            onClick={() => void takeOff(bill)}
            disabled={remove.isPending}
            title="Take this bill off"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
