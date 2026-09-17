import { Check, ClipboardList, Loader2, RotateCcw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CASH_BOOK_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { BunchStatus, CashBunch } from '@/modules/accounts/api';
import {
  useApproveCashBunch,
  useCashBunch,
  useCashBunches,
  useRejectCashBunch,
  useResendCashBunch,
} from '@/modules/accounts/api';
import { confirmDialog, promptDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { formatDateTimeShort, formatNumber, getErrorMessage } from '@/shared/utils';

const ALL = 'ALL';

const money = (value: string | number) => formatNumber(Number(value ?? 0));

const STATUS_TONE: Record<BunchStatus, string> = {
  PENDING: 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-400',
  REJECTED: 'bg-rose-100 dark:bg-rose-500/15 text-rose-900 dark:text-rose-400',
};

/**
 * Cash approvals — the other half of the sheet's Bunch column.
 *
 * A custodian ticks a day or two of vouchers on the register and sends them as
 * one bunch. This is where that bunch is read and decided on: approve it, or
 * send it back with a reason.
 *
 * Approving stamps who and when, which is what the paper sheet's "Sign Date"
 * becomes — the app has no signature. Rejecting unfreezes the entries so the
 * custodian can put them right and send the same bunch, under its own number,
 * back up. A bunch is decided as a whole; there is no approving half of one,
 * because half a bundle of vouchers is not a thing anybody walks anywhere.
 */
export default function CashApprovalsPage() {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(CASH_BOOK_PERMISSIONS.APPROVE);
  const canManage = hasPermission(CASH_BOOK_PERMISSIONS.MANAGE);

  const [status, setStatus] = useState<BunchStatus | typeof ALL>('PENDING');
  const [openId, setOpenId] = useState<number | null>(null);

  const { data: bunches = [], isLoading } = useCashBunches(
    status === ALL ? undefined : status,
  );
  const { data: detail, isLoading: detailLoading } = useCashBunch(openId);

  const approve = useApproveCashBunch();
  const reject = useRejectCashBunch();
  const resend = useResendCashBunch();
  const busy = approve.isPending || reject.isPending || resend.isPending;

  const pendingCount = useMemo(
    () => bunches.filter((bunch) => bunch.status === 'PENDING').length,
    [bunches],
  );

  async function handleApprove(bunch: CashBunch) {
    const ok = await confirmDialog({
      title: `Approve bunch ${bunch.number}?`,
      description: `${bunch.entry_count} ${bunch.entry_count === 1 ? 'entry' : 'entries'}, ${money(bunch.total_out)} out and ${money(bunch.total_in)} in. Approving stamps your name and the time against every one of them, and they can no longer be corrected.`,
      confirmLabel: 'Approve',
    });
    if (!ok) return;
    try {
      await approve.mutateAsync({ id: bunch.id });
      toast.success(`Bunch ${bunch.number} approved`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That bunch could not be approved.'));
    }
  }

  async function handleReject(bunch: CashBunch) {
    const note = await promptDialog({
      title: `Send bunch ${bunch.number} back?`,
      description:
        'Its entries unfreeze so the custodian can correct them and send the same bunch again.',
      label: 'What is wrong with it?',
      placeholder: 'Bill number missing on the freight voucher',
      confirmLabel: 'Reject',
      destructive: true,
      required: true,
    });
    if (note === null) return;
    try {
      await reject.mutateAsync({ id: bunch.id, note });
      toast.success(`Bunch ${bunch.number} sent back`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That bunch could not be rejected.'));
    }
  }

  async function handleResend(bunch: CashBunch) {
    const ok = await confirmDialog({
      title: `Send bunch ${bunch.number} up again?`,
      description: `It goes back for approval under the same number. Make sure "${bunch.decision_note}" has been dealt with first.`,
      confirmLabel: 'Send again',
    });
    if (!ok) return;
    try {
      await resend.mutateAsync({ id: bunch.id });
      toast.success(`Bunch ${bunch.number} sent for approval`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That bunch could not be sent again.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Cash Approvals"
        description="Bunches of vouchers sent up from the cash book"
      >
        <div className="space-y-1">
          <NativeSelect
            aria-label="Filter bunches by state"
            className="w-[200px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as BunchStatus | typeof ALL);
              setOpenId(null);
            }}
          >
            <SelectOption value="PENDING">Awaiting approval</SelectOption>
            <SelectOption value="APPROVED">Approved</SelectOption>
            <SelectOption value="REJECTED">Rejected</SelectOption>
            <SelectOption value={ALL}>Every bunch</SelectOption>
          </NativeSelect>
        </div>
      </DashboardHeader>

      {status !== 'PENDING' && pendingCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {pendingCount} {pendingCount === 1 ? 'bunch is' : 'bunches are'} still waiting to be
          decided.
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the bunches…
        </div>
      ) : bunches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {status === 'PENDING'
                ? 'Nothing is waiting for a decision.'
                : 'No bunch in that state.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bunches.map((bunch) => {
            const isOpen = openId === bunch.id;
            return (
              <Card key={bunch.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold">Bunch {bunch.number}</p>
                        <Badge variant="outline" className={`text-xs ${STATUS_TONE[bunch.status]}`}>
                          {bunch.status_label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {bunch.entry_count} {bunch.entry_count === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sent {formatDateTimeShort(bunch.sent_at)}
                        {bunch.sent_by_name ? ` by ${bunch.sent_by_name}` : ''}
                        {bunch.decided_at && (
                          <>
                            {' · '}
                            {bunch.status === 'APPROVED' ? 'Approved' : 'Rejected'}{' '}
                            {formatDateTimeShort(bunch.decided_at)}
                            {bunch.decided_by_name ? ` by ${bunch.decided_by_name}` : ''}
                          </>
                        )}
                      </p>
                      {bunch.remarks && <p className="mt-1 text-sm">{bunch.remarks}</p>}
                      {bunch.decision_note && (
                        <p className="mt-1 text-sm text-rose-700 dark:text-rose-400">{bunch.decision_note}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold tabular-nums text-rose-700 dark:text-rose-400">
                        {money(bunch.total_out)}
                      </p>
                      <p className="text-xs text-muted-foreground">out of the box</p>
                      {Number(bunch.total_in) > 0 && (
                        <p className="text-sm tabular-nums text-emerald-700 dark:text-emerald-400">
                          {money(bunch.total_in)} in
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenId(isOpen ? null : bunch.id)}
                    >
                      {isOpen ? 'Hide entries' : 'Show entries'}
                    </Button>

                    {canApprove && bunch.status === 'PENDING' && (
                      <>
                        <Button size="sm" onClick={() => handleApprove(bunch)} disabled={busy}>
                          <Check className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(bunch)}
                          disabled={busy}
                        >
                          <X className="mr-2 h-4 w-4" /> Reject
                        </Button>
                      </>
                    )}

                    {canManage && bunch.status === 'REJECTED' && (
                      <Button size="sm" onClick={() => handleResend(bunch)} disabled={busy}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Send again
                      </Button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="overflow-x-auto rounded-md border">
                      {detailLoading || detail?.id !== bunch.id ? (
                        <div className="flex items-center justify-center py-6 text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading the entries…
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/40 text-left">
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Branch</th>
                              <th className="px-3 py-2">G/L head</th>
                              <th className="px-3 py-2">Item</th>
                              <th className="px-3 py-2">Detail</th>
                              <th className="px-3 py-2 text-right">Out</th>
                              <th className="px-3 py-2 text-right">In</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.entries.map((row) => (
                              <tr
                                key={row.id}
                                className={`border-b align-top ${
                                  row.is_active ? '' : 'text-muted-foreground line-through'
                                }`}
                              >
                                <td className="whitespace-nowrap px-3 py-2">{row.entry_date}</td>
                                <td className="px-3 py-2">{row.branch_name ?? '—'}</td>
                                <td className="px-3 py-2">
                                  {row.gl_account_code ? (
                                    <>
                                      <p className="font-mono text-xs">{row.gl_account_code}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {row.gl_account_name}
                                      </p>
                                    </>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="px-3 py-2">{row.item || '—'}</td>
                                <td className="max-w-[340px] px-3 py-2">{row.detail}</td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {row.direction === 'OUT' ? money(row.amount) : ''}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {row.direction === 'IN' ? money(row.amount) : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
