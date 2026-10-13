import { AlertTriangle, ArrowRight, Loader2, Package, RefreshCw, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, NativeSelect, SelectOption } from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useBunchSapStatuses, useCashSapBunches, useCashSapOptions } from '../api';
import { CashSapSwitchBadges } from '../components/CashSapSwitchBadges';
import { BunchSapStateBadge } from '../components/SapDocStatusBadge';
import { CASH_SAP_READ_ACCESS } from '../constants/permissions';
import type { BunchSapSummary } from '../types';
import { money } from '../utils/status';

/**
 * Cash → SAP: the cash book's bunches, each with where it has got to in SAP.
 *
 * The bunches are the cash book's (`GET /cash-book/bunches/`, read only); the
 * badge beside each is cash_sap's (`GET /cash-sap/bunches/?ids=`). Opening one
 * goes to its SAP page, `/accounts/bunches/:bunchId/sap` -- the same address
 * the posting log links to (`cash_sap/titles.py`).
 */
export default function CashSapBunchesPage() {
  const { hasAnyPermission } = usePermission();
  const canRead = hasAnyPermission(CASH_SAP_READ_ACCESS);
  const [state, setState] = useState<'ALL' | 'SENT' | 'UNSENT'>('ALL');

  const { data: options } = useCashSapOptions();
  const {
    data: bunches = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCashSapBunches(state === 'ALL' ? undefined : state);
  const sorted = useMemo(() => [...bunches].sort((a, b) => b.number - a.number), [bunches]);
  const ids = useMemo(() => sorted.map((b) => b.id), [sorted]);
  const { data: statuses = {}, isLoading: statusLoading } = useBunchSapStatuses(ids);

  return (
    <div className="space-y-6">
      <DashboardHeader title="Cash → SAP">
        <div className="flex flex-wrap items-center gap-2">
          <CashSapSwitchBadges options={options} />
          <NativeSelect
            aria-label="Which bunches to show"
            className="w-[170px]"
            value={state}
            onChange={(e) => setState(e.target.value as 'ALL' | 'SENT' | 'UNSENT')}
          >
            <SelectOption value="ALL">Every bunch</SelectOption>
            <SelectOption value="UNSENT">Not sent yet</SelectOption>
            <SelectOption value="SENT">Sent</SelectOption>
          </NativeSelect>
          <Button variant="outline" size="sm" asChild>
            <Link to="/accounts/cash-sap-settings">
              <Settings2 className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </DashboardHeader>

      {!canRead ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You have no access to the cash book&apos;s SAP posting.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the bunches…
        </div>
      ) : isError ? (
        // The list is the cash book's (`CanViewCashBook`: view, manage or
        // approve). A cash_sap right alone, or the branches right, is refused.
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            <p className="text-muted-foreground">
              {getErrorMessage(error, 'The bunches could not be read.')}
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              The bunch list belongs to the cash book: it needs the right to view, keep or approve
              the cash book. A bunch&apos;s SAP page can still be opened from its link.
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Try again
            </Button>
          </CardContent>
        </Card>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No bunches yet. Bundle approved vouchers on the cash book first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2">Bunch</th>
                  <th className="px-3 py-2">Made</th>
                  <th className="px-3 py-2 text-right">Vouchers</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Sent to HO</th>
                  <th className="px-3 py-2">SAP</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((bunch) => (
                  <tr key={bunch.id} className="border-b align-top hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <Link
                        to={`/accounts/bunches/${bunch.id}/sap`}
                        className="font-medium hover:underline"
                      >
                        Bunch {bunch.number}
                      </Link>
                      {bunch.remarks && (
                        <p className="text-xs text-muted-foreground">{bunch.remarks}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatDateTimeShort(bunch.created_at)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{bunch.entry_count}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {money(bunch.total)}
                    </td>
                    <td className="px-3 py-2">
                      {bunch.is_sent ? (
                        <span className="text-xs">{formatDateTimeShort(bunch.sent_at)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not yet</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <SapCell summary={statuses[bunch.id]} loading={statusLoading} />
                    </td>
                    <td className="px-3 py-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/accounts/bunches/${bunch.id}/sap`}>
                          SAP…
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SapCell({ summary, loading }: { summary?: BunchSapSummary; loading: boolean }) {
  if (!summary) {
    return loading ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    );
  }
  return (
    <div className="space-y-1">
      <BunchSapStateBadge state={summary.state} label={summary.label} />
      <p className="text-[10px] text-muted-foreground">
        {summary.po_doc_nums.length > 0 && `PO ${summary.po_doc_nums.join(', ')} · `}
        {summary.grpo_total > 0 && `GRPO ${summary.grpo_posted}/${summary.grpo_total}`}
        {summary.failed > 0 && ` · ${summary.failed} refused`}
      </p>
    </div>
  );
}
