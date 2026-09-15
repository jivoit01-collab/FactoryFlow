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
 *
 * What IS decided here is whether to offer the button at all. A draft that sat
 * for two months is usually stale rather than short — its stock left the
 * warehouse whole on some later document — and SAP answers the add with a code
 * ("10001153 - Insufficient quantity ... with batch LS1103") that means nothing
 * on a warehouse floor. So when the refusal is certain the row says so and
 * keeps the button inside, behind the reason; pressing it anyway stays possible
 * because SAP, not this page, is the authority on its own stock.
 */

import { AlertTriangle, FileCheck2, Info, Stamp } from 'lucide-react';
import { useState } from 'react';

import { confirmSapPost } from '@/shared/components';
import { Button } from '@/shared/components/ui';

import { useAddSapTransferDraft } from '../../api';
import type { SapTransferDraft } from '../../types';
import { Route } from './TransferBadges';
import { qty, shortDate } from './transferFormat';
import {
  ItemCell,
  LineCount,
  LineTable,
  RecordActions,
  RecordList,
  RecordRow,
  RecordWarning,
} from './TransferRecordList';

function apiError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

const COLUMNS = [
  { label: 'Item' },
  { label: 'On the draft', align: 'right' as const, width: '9rem' },
  { label: 'At the source now', align: 'right' as const, width: '10rem' },
  { label: 'UoM', width: '5rem' },
];

function DraftRow({
  row,
  open,
  onToggle,
}: {
  row: SapTransferDraft;
  open: boolean;
  onToggle: () => void;
}) {
  const add = useAddSapTransferDraft();
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  async function submit() {
    setError('');
    setDone('');
    const confirmed = await confirmSapPost({
      title: `Add draft ${row.doc_num ?? row.draft_entry} in SAP?`,
      details: [
        { label: 'Creates', value: 'The Inventory Transfer this approved draft stands for' },
        { label: 'Draft', value: row.doc_num ?? row.draft_entry },
        { label: 'Out of', value: row.from_warehouse || 'the source warehouse' },
        // Said again at the last moment, because this is the press that five
        // identical refusals went through.
        ...(row.will_be_refused
          ? [{ label: 'Expect', value: 'SAP to refuse this — see the reasons on the row' }]
          : []),
      ],
      confirmLabel: row.will_be_refused ? 'Try it anyway' : 'Add it in SAP',
    });
    if (!confirmed) return;
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

  const needsAttention = row.warnings.length > 0 || Boolean(row.blocked_reason);
  /* The button only sits on the closed row when pressing it can work. A
     refusal that is certain moves it inside, under the reason for it. */
  const offerOnRow = row.can_post && !done && !row.will_be_refused;
  const offerInside = row.can_post && !done && row.will_be_refused;

  return (
    <RecordRow
      open={open}
      onToggle={onToggle}
      title={row.doc_num ? `SAP ${row.doc_num}` : `draft ${row.draft_entry}`}
      chip={
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          approved draft
        </span>
      }
      meta={
        <>
          keyed {shortDate(row.doc_date)}
          {row.created_by ? ` by ${row.created_by}` : ''}
        </>
      }
      note={row.comments || undefined}
      route={<Route from={row.from_warehouse} to={row.to_warehouse} />}
      flag={
        <>
          <LineCount lines={row.lines.length} />
          {needsAttention && (
            /* Said on the closed row: on a backlog of twenty, which ones SAP
               will refuse is the thing worth seeing without opening each. */
            <span
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-amber-700 dark:text-amber-300"
              title={row.blocked_reason ?? row.warnings.join(' ')}
            >
              <AlertTriangle className="h-3 w-3" />
              {row.blocked_reason
                ? 'blocked'
                : row.will_be_refused
                  ? 'SAP will refuse'
                  : `${row.warnings.length} to check`}
            </span>
          )}
        </>
      }
      aside={
        <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {row.age_days} day{row.age_days === 1 ? '' : 's'} unposted
        </span>
      }
      action={
        offerOnRow ? (
          // On the row itself: a draft is added exactly as it stands, so there
          // is nothing to fill in first — and a 23-row backlog should not need
          // 23 expansions to clear.
          <Button size="sm" disabled={add.isPending} onClick={submit}>
            <Stamp className="mr-1 h-4 w-4" />
            {add.isPending ? 'Adding…' : 'Add in SAP'}
          </Button>
        ) : done ? (
          <span className="whitespace-nowrap text-xs font-medium text-green-700 dark:text-green-400">
            added in SAP
          </span>
        ) : undefined
      }
    >
      <LineTable columns={COLUMNS}>
        {row.lines.map((line) => (
          <tr key={line.line_num} className="border-b last:border-0">
            <ItemCell code={line.item_code} name={line.item_name} />
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
              {line.allocation_partial && (
                <div className="text-xs text-amber-700">
                  only {qty(line.allocated_quantity)} allocated
                </div>
              )}
              {/* Per batch, because that is what SAP checks — the item total
                  beside it can be perfectly sufficient. Defaulted, because the
                  frontend and the API are deployed separately here: a row from
                  a backend that predates this field must not blank the page. */}
              {(line.batches_short ?? []).map((batch) => (
                <div key={batch.batch} className="text-xs text-amber-700">
                  batch {batch.batch}: {qty(batch.in_stock)} of {qty(batch.allocated)}
                </div>
              ))}
            </td>
            <td className="px-4 py-2 text-xs text-muted-foreground">{line.uom}</td>
          </tr>
        ))}
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
            {row.warnings.map((warning) => (
              <RecordWarning key={warning}>
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {warning}
              </RecordWarning>
            ))}
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
          offerOnRow ? (
            <>
              Posts the draft exactly as it stands — all {row.lines.length} line
              {row.lines.length === 1 ? '' : 's'}, with the batches SAP already holds. The stock
              moves the moment it lands.
            </>
          ) : offerInside ? (
            <>
              SAP will refuse this as things stand, so the fix is on the draft in SAP — or the
              draft is finished with and belongs removed there. Adding anyway costs nothing but
              the same refusal.
            </>
          ) : undefined
        }
      >
        {offerInside && (
          <Button size="sm" variant="outline" disabled={add.isPending} onClick={submit}>
            <Stamp className="mr-1 h-4 w-4" />
            {add.isPending ? 'Adding…' : 'Add anyway'}
          </Button>
        )}
      </RecordActions>
    </RecordRow>
  );
}

export function SapUnpostedDraftTable({
  rows,
  isLoading,
  isError,
  searching = false,
}: {
  rows: SapTransferDraft[];
  isLoading: boolean;
  isError: boolean;
  /** A search is on, so an empty list means "no match here", not "nothing owed". */
  searching?: boolean;
}) {
  /* Closed by default, open by default while searching — a row that came back
     from a search usually matched on an item, which is inside it. An explicit
     click wins over both, for as long as the list is on screen. */
  const [toggled, setToggled] = useState<Record<number, boolean>>({});

  // Nothing waiting is the normal state, and a second empty list under the
  // requests table would only be noise.
  if (!isLoading && !isError && rows.length === 0 && !searching) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          These transfers were raised in the SAP client and approved, but never <b>added</b> — in
          SAP an approved transfer is still only a draft, and the stock stays where it is until
          someone adds it. Adding here does exactly what the Add button in SAP does.
        </span>
      </div>

      {isLoading ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          Loading approved drafts…
        </p>
      ) : isError ? (
        <p className="rounded-lg border p-6 text-sm text-red-600">
          Could not read SAP&apos;s approved drafts. Try again in a moment.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          No approved draft matches that search.
        </p>
      ) : (
        <RecordList>
          {rows.map((row) => (
            <DraftRow
              key={row.draft_entry}
              row={row}
              open={toggled[row.draft_entry] ?? searching}
              onToggle={() =>
                setToggled((prev) => ({
                  ...prev,
                  [row.draft_entry]: !(prev[row.draft_entry] ?? searching),
                }))
              }
            />
          ))}
        </RecordList>
      )}
    </div>
  );
}
