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
import { Fragment, useMemo, useState } from 'react';

import { Button, Card, CardContent, Input } from '@/shared/components/ui';

import { usePostSapTransfer } from '../../api';
import type { SapAwaitingTransfer } from '../../types';
import { Route } from './TransferBadges';
import { qty, shortDate } from './transferFormat';

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

function RequestRow({ row }: { row: SapAwaitingTransfer }) {
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
    <>
      <tr className="border-b bg-muted/20">
        <td colSpan={4} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="font-medium">
                {row.doc_num ? `SAP ${row.doc_num}` : `request ${row.doc_entry}`}
              </div>
              <div className="text-xs text-muted-foreground">
                raised {shortDate(row.doc_date)} · {row.age_days} day
                {row.age_days === 1 ? '' : 's'} open
              </div>
            </div>
            <Route from={row.from_warehouse} to={row.to_warehouse} />
            {row.comments && (
              <span className="max-w-sm text-xs text-muted-foreground">{row.comments}</span>
            )}
          </div>
          {row.blocked_reason && (
            <div className="mt-2 inline-flex items-start gap-1 text-xs text-amber-700">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {row.blocked_reason}
            </div>
          )}
        </td>
      </tr>

      {row.lines.map((line) => {
        const value = amounts[line.line_num] ?? '';
        const tooMuch = overOpen(value, line.open_quantity);
        return (
          <tr key={line.line_num} className="border-b last:border-0">
            <td className="px-4 py-2 pl-8">
              <div className="font-mono text-xs">{line.item_code}</div>
              <div className="text-xs text-muted-foreground">{line.item_name}</div>
            </td>
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
                    className={`h-8 w-32 text-right tabular-nums ${
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

      {(row.can_post || error || done) && (
        <tr className="border-b">
          <td colSpan={4} className="px-4 pb-4 pl-8">
            {error && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {done && (
              <div className="mb-2 rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-800">
                {done}
              </div>
            )}
            {row.can_post && (
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  disabled={post.isPending || moving.length === 0 || problems.length > 0}
                  onClick={submit}
                >
                  <Truck className="mr-1 h-4 w-4" />
                  {post.isPending ? 'Posting…' : 'Post transfer'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {moving.length === 0
                    ? 'Set a quantity on at least one line.'
                    : `Moves ${moving.length} of ${row.lines.length} line${
                        row.lines.length === 1 ? '' : 's'
                      }; anything left stays open on the request.`}
                </span>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function SapAwaitingTransferTable({
  rows,
  isLoading,
  isError,
}: {
  rows: SapAwaitingTransfer[];
  isLoading: boolean;
  isError: boolean;
}) {
  const postable = rows.filter((r) => r.can_post).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        These transfer requests are approved, but the stock has not moved yet — an approved request
        only reserves it. Posting a transfer here is what actually moves it, and you can post less
        than is outstanding: the request stays open for the remainder.
        {rows.length > postable && (
          <>
            {' '}
            <span className="font-medium">
              {rows.length - postable} of {rows.length} cannot be posted from here
            </span>{' '}
            — each row says why.
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading what SAP still owes…</p>
          ) : isError ? (
            <p className="p-6 text-sm text-red-600">
              Could not read the open transfer requests. Try again in a moment.
            </p>
          ) : rows.length === 0 ? (
            <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <PackageCheck className="h-4 w-4" />
              Every approved transfer request has been fully transferred.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Request / item</th>
                    <th className="px-4 py-3 text-right font-medium">Outstanding</th>
                    <th className="px-4 py-3 text-left font-medium">Transfer now</th>
                    <th className="px-4 py-3 text-left font-medium">UoM</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <Fragment key={row.doc_entry}>
                      <RequestRow row={row} />
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {rows.some((r) => r.cross_branch) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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
