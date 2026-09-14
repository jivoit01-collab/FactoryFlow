/**
 * SAP transfer requests that are approved but still owe stock.
 *
 * Approving an inventory transfer *request* clears the request and moves
 * nothing — the stock only moves when inventory transfers are posted against
 * it, and SAP lets that happen in as many parts as it takes. So each line
 * arrives pre-filled with everything still outstanding and can be edited down:
 * the common case is "send what is in the tank today, leave the rest open".
 *
 * Quantities are handled as strings the whole way to SAP. Loose oil moves in
 * fractions (143.846 KGS is a real quantity here) and a float round-trip is
 * exactly how a tank ends up 0.001 out.
 */

import { AlertTriangle, Info, PackageCheck, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { confirmSapPost } from '@/shared/components';
import { Button, Input } from '@/shared/components/ui';

import { usePostSapTransfer } from '../../api';
import type { SapAwaitingTransfer } from '../../types';
import { Route } from './TransferBadges';
import { qty, shortDate } from './transferFormat';
import {
  ItemCell,
  LineCount,
  LineTable,
  RecordActions,
  RecordList,
  RecordRow,
} from './TransferRecordList';

function apiError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

/** Blank or 0 means "not this time" — the request stays open for that line. */
function isMoving(value: string): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function overOpen(value: string, open: string): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > Number(open);
}

const COLUMNS = [
  { label: 'Item' },
  { label: 'Outstanding', align: 'right' as const, width: '10rem' },
  { label: 'Transfer now', width: '11rem' },
  { label: 'UoM', width: '5rem' },
];

function RequestRow({
  row,
  open,
  onToggle,
}: {
  row: SapAwaitingTransfer;
  open: boolean;
  onToggle: () => void;
}) {
  const post = usePostSapTransfer();
  const [amounts, setAmounts] = useState<Record<number, string>>(() =>
    Object.fromEntries(row.lines.map((line) => [line.line_num, line.open_quantity])),
  );
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const problems = useMemo(
    () => row.lines.filter((line) => overOpen(amounts[line.line_num] ?? '', line.open_quantity)),
    [amounts, row.lines],
  );
  const moving = row.lines.filter((line) => isMoving(amounts[line.line_num] ?? ''));

  async function submit() {
    setError('');
    setDone('');
    const quantities: Record<string, string> = {};
    for (const line of moving) {
      quantities[String(line.line_num)] = amounts[line.line_num];
    }
    const confirmed = await confirmSapPost({
      title: `Post request ${row.doc_num ?? row.doc_entry} as a transfer?`,
      details: [
        { label: 'Creates', value: 'Inventory Transfer against this request' },
        { label: 'Request', value: row.doc_num ?? row.doc_entry },
        { label: 'Out of', value: row.from_warehouse || 'the source warehouse' },
        { label: 'Lines moving', value: moving.length },
      ],
    });
    if (!confirmed) return;
    try {
      const result = await post.mutateAsync({ docEntry: row.doc_entry, quantities });
      setDone(
        result.request_closed
          ? `Transfer ${result.doc_num ?? result.doc_entry} posted — the request is now closed.`
          : `Transfer ${result.doc_num ?? result.doc_entry} posted. ${qty(
              result.remaining_quantity,
            )} still owed on this request.`,
      );
    } catch (err) {
      setError(apiError(err, 'Could not post this transfer.'));
    }
  }

  return (
    /* No action on the closed row, unlike the draft queue next to it: what moves
       is decided line by line inside, and posting the pre-filled amounts without
       looking is the mistake this screen exists to prevent. */
    <RecordRow
      open={open}
      onToggle={onToggle}
      title={row.doc_num ? `SAP ${row.doc_num}` : `request ${row.doc_entry}`}
      meta={
        <>
          raised {shortDate(row.doc_date)}
          {row.draft_entry ? ` · from draft ${row.draft_entry}` : ''}
        </>
      }
      note={row.comments || undefined}
      route={<Route from={row.from_warehouse} to={row.to_warehouse} />}
      flag={
        <>
          <LineCount lines={row.lines.length} />
          {row.blocked_reason && (
            <span
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-amber-700 dark:text-amber-300"
              title={row.blocked_reason}
            >
              <AlertTriangle className="h-3 w-3" />
              not postable here
            </span>
          )}
          {done && (
            <span className="whitespace-nowrap text-xs font-medium text-green-700 dark:text-green-400">
              posted
            </span>
          )}
        </>
      }
      aside={
        <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {row.age_days} day{row.age_days === 1 ? '' : 's'} open
        </span>
      }
    >
      <LineTable columns={COLUMNS}>
        {row.lines.map((line) => {
          const value = amounts[line.line_num] ?? '';
          const tooMuch = overOpen(value, line.open_quantity);
          return (
            <tr key={line.line_num} className="border-b last:border-0">
              <ItemCell code={line.item_code} name={line.item_name} />
              <td className="px-4 py-2 text-right text-xs tabular-nums">
                <div>{qty(line.open_quantity)}</div>
                {Number(line.served_quantity) > 0 && (
                  <div className="text-muted-foreground">
                    {qty(line.served_quantity)} already sent
                  </div>
                )}
              </td>
              <td className="px-4 py-2">
                {row.can_post ? (
                  <>
                    <Input
                      value={value}
                      inputMode="decimal"
                      aria-label={`Quantity to transfer for ${line.item_code}`}
                      className={`h-8 w-full text-right tabular-nums ${
                        tooMuch ? 'border-red-500' : ''
                      }`}
                      onChange={(e) =>
                        setAmounts((prev) => ({ ...prev, [line.line_num]: e.target.value }))
                      }
                    />
                    {tooMuch && (
                      <div className="mt-1 text-xs text-red-600">
                        only {qty(line.open_quantity)} left
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{line.uom}</td>
            </tr>
          );
        })}
      </LineTable>

      <RecordActions
        banners={
          <>
            {row.blocked_reason && (
              <div className="mb-2 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                {row.blocked_reason}
              </div>
            )}
            {error && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                {error}
              </div>
            )}
            {done && (
              <div className="mb-2 rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300">
                {done}
              </div>
            )}
          </>
        }
        hint={
          row.can_post
            ? moving.length === 0
              ? 'Set a quantity on at least one line.'
              : `Moves ${moving.length} of ${row.lines.length} line${
                  row.lines.length === 1 ? '' : 's'
                }; anything left stays open on the request.`
            : undefined
        }
      >
        {row.can_post && (
          <Button
            size="sm"
            disabled={post.isPending || moving.length === 0 || problems.length > 0}
            onClick={submit}
          >
            <Truck className="mr-1 h-4 w-4" />
            {post.isPending ? 'Posting…' : 'Post transfer'}
          </Button>
        )}
      </RecordActions>
    </RecordRow>
  );
}

export function SapAwaitingTransferTable({
  rows,
  isLoading,
  isError,
  searching = false,
}: {
  rows: SapAwaitingTransfer[];
  isLoading: boolean;
  isError: boolean;
  /** A search is on, so an empty list means "no match here", not "nothing owed". */
  searching?: boolean;
}) {
  /* Closed by default, open by default while searching — a row that came back
     from a search usually matched on an item, which is inside it. An explicit
     click wins over both, for as long as the list is on screen. */
  const [toggled, setToggled] = useState<Record<number, boolean>>({});
  const postable = rows.filter((r) => r.can_post).length;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
        <PackageCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          These transfer requests are approved, but the stock has not moved yet — an approved
          request only reserves it. Posting a transfer here is what actually moves it, and you can
          post less than is outstanding: the request stays open for the remainder.
          {rows.length > postable && (
            <>
              {' '}
              <span className="font-medium">
                {rows.length - postable} of {rows.length} cannot be posted from here
              </span>{' '}
              — each one says why.
            </>
          )}
        </span>
      </div>

      {isLoading ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          Loading what SAP still owes…
        </p>
      ) : isError ? (
        <p className="rounded-lg border p-6 text-sm text-red-600">
          Could not read the open transfer requests. Try again in a moment.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          {searching ? (
            <>
              No approved transfer request matches that search. A number taken off a{' '}
              <span className="font-medium">pending</span> row in SAP approvals is the draft&apos;s
              provisional number and belongs to no request yet — the row has to be approved and
              added first.
            </>
          ) : (
            'Every approved transfer request has been fully transferred.'
          )}
        </p>
      ) : (
        <RecordList>
          {rows.map((row) => (
            <RequestRow
              key={row.doc_entry}
              row={row}
              open={toggled[row.doc_entry] ?? searching}
              onToggle={() =>
                setToggled((prev) => ({
                  ...prev,
                  [row.doc_entry]: !(prev[row.doc_entry] ?? searching),
                }))
              }
            />
          ))}
        </RecordList>
      )}

      {rows.some((r) => r.cross_branch) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            A request whose warehouses sit in different SAP branches has to move in two legs through
            an in-transit warehouse. Those are posted in SAP, or raised through this app&apos;s own
            Transfer Requests flow, which tracks the leg in between.
          </span>
        </div>
      )}
    </div>
  );
}
