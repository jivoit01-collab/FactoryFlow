import { Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button, Input, Label } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  type BillSummaryDetail,
  type BillSummaryPlanTransport,
  useBillSummary,
  useResubmitBillSummary,
} from '../../api';

type Field = 'bilty_no' | 'bilty_date' | 'transporter_name';
type Draft = Record<Field, string>;

interface ResendBillSummaryFormProps {
  sheetId: number;
  /** The sheet's company, for a screen that spans several. */
  companyCode?: string;
  /** Keeps the inputs' ids unique when several forms share a page. */
  idPrefix: string;
  onSent?: (sheet: BillSummaryDetail) => void;
}

/**
 * Fix a sheet the warehouse sent back, and send it over again.
 *
 * A sheet nearly always comes back for its bilty, so that is what the form
 * asks for: the number, its date, and the transporter that goes with them.
 * The warehouse cannot approve without the number, and a sheet re-sent
 * without it would only come back again.
 *
 * The sheet copied its dispatch plan when it was raised, often before the
 * plan had a bilty. So each blank on the sheet is filled from the plan as it is
 * now, and the form says when it has done that. Anything else that is wrong
 * is corrected on the plan.
 *
 * Used on the sheet's own page and in the truck's Bill summaries dialog on
 * Vehicle Linking.
 */
export function ResendBillSummaryForm({
  sheetId,
  companyCode,
  idPrefix,
  onSent,
}: ResendBillSummaryFormProps) {
  const { data: sheet, isLoading, isError } = useBillSummary(sheetId, companyCode);
  const resubmit = useResubmitBillSummary(sheetId, companyCode);
  const [draft, setDraft] = useState<Draft | null>(null);

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the sheet…
      </p>
    );
  }
  if (isError || !sheet) {
    return <p className="text-xs text-rose-600">Could not read this sheet.</p>;
  }

  const held: BillSummaryPlanTransport | null = sheet.plan_transport ?? null;
  const fromPlan = (field: Field) => !sheet[field] && Boolean(held?.[field]);
  const value: Draft = draft ?? {
    bilty_no: sheet.bilty_no || held?.bilty_no || '',
    bilty_date: (sheet.bilty_date || held?.bilty_date || '').slice(0, 10),
    transporter_name: sheet.transporter_name || held?.transporter_name || '',
  };
  const filledFromPlan = (['bilty_no', 'bilty_date', 'transporter_name'] as Field[]).filter(
    fromPlan,
  );
  const ready = value.bilty_no.trim() !== '' && value.bilty_date !== '';

  const update = (field: Field, next: string) => setDraft({ ...value, [field]: next });

  async function send() {
    try {
      const updated = await resubmit.mutateAsync({
        bilty_no: value.bilty_no.trim(),
        bilty_date: value.bilty_date,
        transporter_name: value.transporter_name.trim(),
      });
      toast.success(`${updated.entry_no} sent to the warehouse`);
      setDraft(null);
      onSent?.(updated);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not send it over.'));
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-bilty-no`}>Bilty number</Label>
          <Input
            id={`${idPrefix}-bilty-no`}
            value={value.bilty_no}
            placeholder="NCR-4494"
            onChange={(event) => update('bilty_no', event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-bilty-date`}>Bilty date</Label>
          <Input
            id={`${idPrefix}-bilty-date`}
            type="date"
            value={value.bilty_date}
            onChange={(event) => update('bilty_date', event.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-transporter`}>Transporter</Label>
          <Input
            id={`${idPrefix}-transporter`}
            value={value.transporter_name}
            onChange={(event) => update('transporter_name', event.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {filledFromPlan.length > 0 &&
          'Blanks on the sheet are filled from the dispatch plan as it is now. '}
        The bilty also goes onto the dispatch plan if the plan has none, so the docking will not ask
        for it again. Anything else is corrected on the plan.
      </p>
      <div className="flex justify-end">
        <Button disabled={!ready || resubmit.isPending} onClick={() => void send()}>
          {resubmit.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Send back to the warehouse
        </Button>
      </div>
    </div>
  );
}
