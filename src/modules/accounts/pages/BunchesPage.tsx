import { Download, Loader2, Mail, Package, Undo2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { CASH_BOOK_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { CashBunch } from '@/modules/accounts/api';
import {
  cashBookApi,
  useCashBunch,
  useCashBunches,
  useMarkBunchSent,
  useRemoveFromBunch,
} from '@/modules/accounts/api';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  ColumnFilter,
  TOTALS_ROW_CLASS,
  useLocalColumns,
} from '@/shared/components/sheetGrid';
import {
  Badge,
  Button,
  Card,
  CardContent,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { formatDateTimeShort, formatDay,formatNumber, getErrorMessage } from '@/shared/utils';

const money = (value: string | number) => formatNumber(Number(value ?? 0));

/**
 * Bunches — the batches of approved vouchers sent to head office.
 *
 * A bunch is paperwork, not a decision. Everything in it was approved one by
 * one on the register first; bundling only says which vouchers went in the
 * same envelope. So there is nothing to approve or reject here — only to
 * download and to record that it has gone.
 *
 * The spreadsheet is built on demand rather than saved at bundling time. A
 * batch can still be corrected right up to the moment it is sent, and a file
 * frozen earlier would quietly disagree with the register it came from.
 */
export default function BunchesPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(CASH_BOOK_PERMISSIONS.MANAGE);

  const [state, setState] = useState<'ALL' | 'SENT' | 'UNSENT'>('ALL');
  const [openId, setOpenId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  const { data: all = [], isLoading } = useCashBunches(
    state === 'ALL' ? undefined : state,
  );
  const { data: detail, isLoading: detailLoading } = useCashBunch(openId);
  const markSent = useMarkBunchSent();
  const removeEntry = useRemoveFromBunch();

  const { rows, totals, column, filteredColumns, clearFilters } = useLocalColumns(
    all,
    {
      number: {
        value: (bunch) => `Bunch ${bunch.number}`,
        sortValue: (bunch) => bunch.number,
      },
      created: { value: (bunch) => formatDay(bunch.created_at) },
      by: { value: (bunch) => bunch.created_by_name },
      vouchers: {
        value: (bunch) => String(bunch.entry_count),
        sortValue: (bunch) => bunch.entry_count,
        total: (bunch) => bunch.entry_count,
      },
      total: {
        value: (bunch) => money(bunch.total),
        sortValue: (bunch) => Number(bunch.total),
        total: (bunch) => Number(bunch.total),
      },
      sent: { value: (bunch) => (bunch.is_sent ? formatDay(bunch.sent_at) : null) },
    },
    { key: 'number', direction: 'desc' },
  );

  async function download(bunch: CashBunch) {
    setDownloading(bunch.id);
    try {
      const blob = await cashBookApi.exportBunch(bunch.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bunch-${bunch.number}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Bunch ${bunch.number} downloaded`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That batch could not be downloaded.'));
    } finally {
      setDownloading(null);
    }
  }

  /**
   * Record that a batch has gone, or take that back.
   *
   * Both directions ask first. Sending is not a big red button, but it is the
   * thing that fixes the contents -- and the only clue that it happened is a
   * badge in another column, which is no help to somebody who clicked it not
   * knowing what it was for.
   */
  async function toggleSent(bunch: CashBunch) {
    const ok = bunch.is_sent
      ? await confirmDialog({
          title: `Mark bunch ${bunch.number} as not sent?`,
          description:
            'Its vouchers become changeable again, so one can be taken out. Use this when the batch was ticked by mistake -- not when a real one comes back from head office.',
          confirmLabel: 'Mark unsent',
          destructive: true,
        })
      : await confirmDialog({
          title: `Mark bunch ${bunch.number} as sent to head office?`,
          description: `This records that its ${bunch.entry_count} vouchers, ${money(bunch.total)} in all, have been mailed. The contents are fixed once it is sent -- no voucher can be taken out of it after that, though you can mark it unsent again if you tick this by mistake.`,
          confirmLabel: 'Mark sent',
        });
    if (!ok) return;
    try {
      await markSent.mutateAsync({ id: bunch.id, sent: !bunch.is_sent });
      toast.success(
        bunch.is_sent ? `Bunch ${bunch.number} marked unsent` : `Bunch ${bunch.number} marked sent`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be recorded.'));
    }
  }

  /**
   * Take one voucher back out of a batch that has not gone yet.
   *
   * The voucher is not undone by this — it stays approved and in the book, it
   * is simply no longer in this envelope, so it can go in the next one.
   */
  async function pullOut(entryId: number, amount: string) {
    const ok = await confirmDialog({
      title: `Take this ${money(amount)} voucher out of the batch?`,
      description:
        'It stays approved and in the book. It just goes back to being unbundled, so it can be put in another batch.',
      confirmLabel: 'Take it out',
    });
    if (!ok) return;
    try {
      await removeEntry.mutateAsync(entryId);
      toast.success('Voucher taken out of the batch');
    } catch (err) {
      toast.error(getErrorMessage(err, 'That voucher could not be taken out.'));
    }
  }

  const unsent = all.filter((bunch) => !bunch.is_sent);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Bunches"
        description="Batches of approved vouchers downloaded and mailed to head office"
      >
        <div className="flex flex-wrap items-center gap-2">
          {filteredColumns.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          <NativeSelect
            aria-label="Which batches to show"
            className="w-[170px]"
            value={state}
            onChange={(e) => setState(e.target.value as 'ALL' | 'SENT' | 'UNSENT')}
          >
            <SelectOption value="ALL">Every batch</SelectOption>
            <SelectOption value="UNSENT">Not sent yet</SelectOption>
            <SelectOption value="SENT">Sent</SelectOption>
          </NativeSelect>
        </div>
      </DashboardHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" /> Batches
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{all.length}</p>
            <p className="text-xs text-muted-foreground">{unsent.length} not sent yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Value shown</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {money(rows.reduce((sum, bunch) => sum + Number(bunch.total), 0))}
            </p>
            <p className="text-xs text-muted-foreground">
              across {rows.length} {rows.length === 1 ? 'batch' : 'batches'}
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the batches…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filteredColumns.length > 0 || state !== 'ALL'
                ? 'No batch matches that.'
                : 'No batches yet. Approve some payments on the cash book, then tick them and bundle.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <ColumnFilter {...column('number', 'Bunch')} />
                  <ColumnFilter {...column('created', 'Made')} />
                  <ColumnFilter {...column('by', 'By')} />
                  <ColumnFilter {...column('vouchers', 'Vouchers', 'right')} />
                  <ColumnFilter {...column('total', 'Total', 'right')} />
                  <ColumnFilter {...column('sent', 'Sent')} />
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className={TOTALS_ROW_CLASS}>
                  <td colSpan={3}>
                    Total of {rows.length} {rows.length === 1 ? 'batch' : 'batches'}
                  </td>
                  <td className="text-right tabular-nums">{totals.vouchers ?? 0}</td>
                  <td className="text-right tabular-nums">{money(totals.total ?? 0)}</td>
                  <td />
                  <td />
                </tr>
                {rows.map((bunch) => (
                  <tr key={bunch.id} className="border-b align-top hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="font-medium hover:underline"
                        onClick={() => setOpenId(openId === bunch.id ? null : bunch.id)}
                      >
                        Bunch {bunch.number}
                      </button>
                      {bunch.remarks && (
                        <p className="text-xs text-muted-foreground">{bunch.remarks}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatDateTimeShort(bunch.created_at)}
                    </td>
                    <td className="px-3 py-2">{bunch.created_by_name ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {bunch.entry_count}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {money(bunch.total)}
                    </td>
                    <td className="px-3 py-2">
                      {bunch.is_sent ? (
                        <>
                          <Badge
                            variant="outline"
                            className="bg-emerald-100 text-[10px] text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-400"
                          >
                            Sent
                          </Badge>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {formatDateTimeShort(bunch.sent_at!)}
                            {bunch.sent_by_name ? ` · ${bunch.sent_by_name}` : ''}
                          </p>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Not sent
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {/* Spelled out rather than left as icons. An envelope
                          and a tick look like they might explain themselves;
                          they do not, and one of them changes the batch. */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => download(bunch)}
                          disabled={downloading === bunch.id}
                        >
                          {downloading === bunch.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Download
                        </Button>
                        {canManage &&
                          (bunch.is_sent ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSent(bunch)}
                              disabled={markSent.isPending}
                            >
                              <Undo2 className="mr-2 h-4 w-4" />
                              Mark unsent
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleSent(bunch)}
                              disabled={markSent.isPending}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Mark sent
                            </Button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {openId != null && (
        <div className="rounded-md border">
          <p className="border-b bg-muted/40 px-3 py-2 font-medium">
            What is in bunch {detail?.number ?? ''}
          </p>
          {detailLoading || detail?.id !== openId ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading the vouchers…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-2">Voucher</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Branch</th>
                    <th className="px-3 py-2">G/L head</th>
                    <th className="px-3 py-2">Detail</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    {canManage && !detail.is_sent && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {detail.entries.map((entry) => (
                    <tr key={entry.id} className="border-b align-top">
                      <td className="px-3 py-2 font-mono text-xs">{entry.id}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatDay(entry.entry_date)}</td>
                      <td className="px-3 py-2">{entry.branch_name ?? '—'}</td>
                      <td className="px-3 py-2 text-xs">{entry.gl_account_name}</td>
                      <td className="max-w-[420px] px-3 py-2">{entry.detail}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(entry.amount)}
                      </td>
                      {canManage && !detail.is_sent && (
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => pullOut(entry.id, entry.amount)}
                            disabled={removeEntry.isPending}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Take out
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
