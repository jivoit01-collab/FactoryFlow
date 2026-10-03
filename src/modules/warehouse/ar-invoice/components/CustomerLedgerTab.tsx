import { BookOpen, Download } from 'lucide-react';
import { useState } from 'react';

import {
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input, Label } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useCustomerLedger } from '../api/ar-invoice.queries';
import type { CustomerLedgerLine } from '../types';
import {
  defaultLedgerRange,
  drCr,
  exportCustomerLedger,
  isOverdue,
  ledgerAmount,
  ledgerDate,
} from '../utils/customerLedger';
import { CustomerSelect } from './CustomerSelect';

const COLUMNS = 7;

/** What is still open on the posting, and — for a bill — whether it is late. */
function PendingCell({ line }: { line: CustomerLedgerLine }) {
  if (!line.open_amount) return null;
  if (line.open_amount < 0) {
    return (
      <>
        {ledgerAmount(-line.open_amount)} Cr
        <div className="text-xs text-muted-foreground">Not adjusted</div>
      </>
    );
  }
  const overdue = isOverdue(line);
  return (
    <>
      {ledgerAmount(line.open_amount)}
      {line.due_date ? (
        <div
          className={cn('text-xs', overdue ? 'font-medium text-red-600' : 'text-muted-foreground')}
        >
          {overdue ? 'Overdue · ' : 'Due '}
          {ledgerDate(line.due_date)}
        </div>
      ) : null}
    </>
  );
}

/**
 * Ledger — one customer's account as SAP holds it: every bill, credit note,
 * receipt and journal entry posted to them, oldest first, with the balance
 * after each. Read from SAP's journal, so it includes what the counter enters
 * in SAP directly, which this app has no record of.
 */
export function CustomerLedgerTab() {
  const [customerCode, setCustomerCode] = useState('');
  const [range, setRange] = useState(defaultLedgerRange);
  const badRange = !!range.from && !!range.to && range.from > range.to;

  const ledger = useCustomerLedger({
    customer_code: badRange ? '' : customerCode,
    ...(range.from ? { date_from: range.from } : {}),
    ...(range.to ? { date_to: range.to } : {}),
  });
  const data = customerCode && !badRange ? ledger.data : undefined;
  const lines = data?.lines ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-96">
          <CustomerSelect
            label="Customer"
            required
            value={customerCode}
            onChange={(customer) => setCustomerCode(customer?.customer_code ?? '')}
          />
        </div>
        <div>
          <Label htmlFor="ledger-from">From</Label>
          <Input
            id="ledger-from"
            type="date"
            value={range.from}
            onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="ledger-to">To</Label>
          <Input
            id="ledger-to"
            type="date"
            value={range.to}
            onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>
      {badRange ? (
        <p className="text-sm text-red-600">The end date is before the start date.</p>
      ) : null}

      {data ? (
        <StatTileRow>
          <StatTile
            label="Opening balance"
            value={drCr(data.opening_balance)}
            sub={data.date_from ? `On ${ledgerDate(data.date_from)}` : 'Start of the account'}
          />
          <StatTile
            label="Debit"
            value={ledgerAmount(data.total_debit)}
            sub="Bills and charges in the range"
          />
          <StatTile
            label="Credit"
            value={ledgerAmount(data.total_credit)}
            sub="Receipts, credit notes and adjustments"
          />
          <StatTile
            label="Closing balance"
            value={drCr(data.closing_balance)}
            sub={
              data.date_to && data.balance_today !== data.closing_balance
                ? `On ${ledgerDate(data.date_to)} · today ${drCr(data.balance_today)}`
                : `On ${ledgerDate(data.date_to) || 'today'}`
            }
          />
        </StatTileRow>
      ) : null}

      <TableCard
        summary={
          data
            ? data.truncated
              ? `First ${lines.length.toLocaleString('en-IN')} of ${data.total.toLocaleString('en-IN')} postings — shorten the dates to see the rest. The totals cover the whole range.`
              : `${data.total.toLocaleString('en-IN')} posting${data.total === 1 ? '' : 's'} · ${data.customer_name}`
            : undefined
        }
        actions={
          data ? (
            <Button variant="outline" size="sm" onClick={() => exportCustomerLedger(data)}>
              <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
          ) : undefined
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Date</Th>
              <Th>Particulars</Th>
              <Th>Document</Th>
              <Th align="right">Debit</Th>
              <Th align="right">Credit</Th>
              <Th align="right">Balance</Th>
              <Th
                align="right"
                title="What SAP has not matched yet: the unpaid part of a bill, or a receipt or credit note not yet set against one."
              >
                Pending
              </Th>
            </tr>
          </thead>
          <tbody>
            {!customerCode ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={BookOpen}
                message="No customer chosen"
                hint="Pick a customer to see every posting to their account in SAP."
              />
            ) : badRange ? (
              <TableEmpty colSpan={COLUMNS} message="Fix the dates to see the ledger" />
            ) : ledger.isLoading ? (
              <TableLoading colSpan={COLUMNS} message="Reading the ledger from SAP…" />
            ) : ledger.isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                message="SAP could not be read"
                hint={getErrorMessage(ledger.error, 'Please try again.')}
              />
            ) : data ? (
              <>
                <tr className={cn(ROW_CLASSES, 'bg-muted/20')}>
                  <Td className="whitespace-nowrap">{ledgerDate(data.date_from)}</Td>
                  <Td className="font-medium" colSpan={4}>
                    Opening balance
                  </Td>
                  <Td numeric className="whitespace-nowrap font-medium">
                    {drCr(data.opening_balance)}
                  </Td>
                  <Td />
                </tr>
                {lines.length === 0 ? (
                  <TableEmpty colSpan={COLUMNS} message="No postings in this range" />
                ) : (
                  lines.map((line) => (
                    <tr key={`${line.trans_id}-${line.line_id}`} className={ROW_CLASSES}>
                      <Td className="whitespace-nowrap">{ledgerDate(line.date)}</Td>
                      {/* As Tally prints it: the account on the other side of the
                          posting, with what the document says about itself beneath. */}
                      <Td>
                        <div
                          className="max-w-[16rem] truncate"
                          title={[line.offset_account, line.offset_name]
                            .filter(Boolean)
                            .join(' — ')}
                        >
                          {line.offset_name || line.offset_account || '-'}
                        </div>
                        {line.reference || line.narration ? (
                          <div
                            className="max-w-[16rem] truncate text-xs text-muted-foreground"
                            title={line.narration || undefined}
                          >
                            {[line.reference && `Ref ${line.reference}`, line.narration]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        ) : null}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {line.trans_type_label}
                        <div className="text-xs tabular-nums text-muted-foreground">
                          {line.doc_num || `JE ${line.trans_id}`}
                        </div>
                      </Td>
                      <Td numeric>{line.debit ? ledgerAmount(line.debit) : ''}</Td>
                      <Td numeric>{line.credit ? ledgerAmount(line.credit) : ''}</Td>
                      <Td numeric className="whitespace-nowrap font-medium">
                        {drCr(line.balance)}
                      </Td>
                      <Td numeric className="whitespace-nowrap">
                        <PendingCell line={line} />
                      </Td>
                    </tr>
                  ))
                )}
              </>
            ) : null}
          </tbody>
          {data ? (
            <tfoot className="border-t bg-muted/40 font-medium">
              <tr>
                <Td className="whitespace-nowrap">{ledgerDate(data.date_to)}</Td>
                <Td colSpan={2}>Closing balance</Td>
                <Td numeric>{ledgerAmount(data.total_debit)}</Td>
                <Td numeric>{ledgerAmount(data.total_credit)}</Td>
                <Td numeric className="whitespace-nowrap">
                  {drCr(data.closing_balance)}
                </Td>
                <Td />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </TableCard>
    </div>
  );
}
