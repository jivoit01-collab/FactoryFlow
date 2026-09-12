/**
 * Inventory-transfer drafts SAP approved, but which nobody ever added.
 *
 * A transfer keyed in the SAP client on an approval-covered route is saved as
 * a *draft*. Approving it clears the approval and moves nothing — in SAP
 * somebody must still open the draft and press **Add**. Plenty never do, and
 * until then the move exists nowhere else: it is not a transfer request, and
 * the approval queue drops it the moment it stops being pending. This is that
 * Add button, and the only place these surface.
 *
 * Nothing here is editable, deliberately. The draft carries its own
 * quantities, warehouses and batch allocations, settled when it was approved;
 * adding posts exactly that. Changing any of it belongs on the draft in SAP.
 */

import { AlertTriangle, FileCheck2, Info, Stamp } from 'lucide-react';
import { Fragment, useState } from 'react';

import { Button, Card, CardContent } from '@/shared/components/ui';

import { useAddSapTransferDraft } from '../../api';
import type { SapTransferDraft } from '../../types';
import { Route } from './TransferBadges';
import { qty, shortDate } from './transferFormat';

function apiError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

function DraftRow({ row }: { row: SapTransferDraft }) {
  const add = useAddSapTransferDraft();
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  async function submit() {
    setError('');
    setDone('');
    try {
      const result = await add.mutateAsync(row.draft_entry);
      setDone(
        `Added in SAP as transfer ${result.doc_num ?? result.doc_entry ?? row.draft_entry}` +
          (result.confirmed_by_readback
            ? ' — SAP answered late, so the document was read back to confirm it.'
            : '.'),
      );
    } catch (err) {
      setError(apiError(err, 'Could not add this draft in SAP.'));
    }
  }

  return (
    <>
      <tr className="border-b bg-muted/20">
        <td colSpan={4} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="font-medium">
                {row.doc_num ? `SAP ${row.doc_num}` : `draft ${row.draft_entry}`}
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-800">
                  approved draft
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                keyed {shortDate(row.doc_date)}
                {row.created_by ? ` by ${row.created_by}` : ''} · {row.age_days} day
                {row.age_days === 1 ? '' : 's'} unposted
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

      {row.lines.map((line) => (
        <tr key={line.line_num} className="border-b last:border-0">
          <td className="px-4 py-2 pl-8">
            <div className="font-mono text-xs">{line.item_code}</div>
            <div className="text-xs text-muted-foreground">{line.item_name}</div>
          </td>
          <td className="px-4 py-2 text-right text-xs tabular-nums">{qty(line.quantity)}</td>
          <td className="px-4 py-2 text-right text-xs tabular-nums">
            {line.source_stock === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <span className={line.short ? 'font-medium text-red-600' : ''}>
                {qty(line.source_stock)}
              </span>
            )}
            {line.batches_missing && (
              <div className="text-xs text-amber-700">no batch allocated</div>
            )}
          </td>
          <td className="px-4 py-2 text-xs text-muted-foreground">{line.uom}</td>
        </tr>
      ))}

      <tr className="border-b">
        <td colSpan={4} className="px-4 pb-4 pl-8">
          {row.warnings.map((warning) => (
            <div
              key={warning}
              className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {warning}
            </div>
          ))}
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
          {row.can_post && !done && (
            <div className="flex items-center gap-3">
              <Button size="sm" disabled={add.isPending} onClick={submit}>
                <Stamp className="mr-1 h-4 w-4" />
                {add.isPending ? 'Adding in SAP…' : 'Add in SAP'}
              </Button>
              <span className="text-xs text-muted-foreground">
                Posts the draft exactly as it stands — all {row.lines.length} line
                {row.lines.length === 1 ? '' : 's'}, with the batches SAP already holds. The stock
                moves the moment it lands.
              </span>
            </div>
          )}
        </td>
      </tr>
    </>
  );
}

export function SapUnpostedDraftTable({
  rows,
  isLoading,
  isError,
}: {
  rows: SapTransferDraft[];
  isLoading: boolean;
  isError: boolean;
}) {
  // Nothing waiting is the normal state, and a second empty card under the
  // requests table would only be noise.
  if (!isLoading && !isError && rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        These transfers were raised in the SAP client and approved, but never <b>added</b> — in SAP
        an approved transfer is still only a draft, and the stock stays where it is until someone
        adds it. Adding here does exactly what the Add button in SAP does.
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading approved drafts…</p>
          ) : isError ? (
            <p className="p-6 text-sm text-red-600">
              Could not read SAP&apos;s approved drafts. Try again in a moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="inline-flex items-center gap-1">
                        <FileCheck2 className="h-3 w-3" />
                        Approved draft / item
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right font-medium">On the draft</th>
                    <th className="px-4 py-3 text-right font-medium">At the source now</th>
                    <th className="px-4 py-3 text-left font-medium">UoM</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <Fragment key={row.draft_entry}>
                      <DraftRow row={row} />
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
