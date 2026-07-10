import { AlertTriangle, CalendarClock, PackageOpen, Undo2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard';
import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useReturnablePendingGateIn } from '../../api/returnable';

/**
 * The gate's inbound queue: everything currently outside the gate, soonest
 * expected return first. Overdue rows are called out — that is the whole point
 * of the register.
 */
export default function ReturnInListPage() {
  const navigate = useNavigate();
  const { data: passes, isLoading } = useReturnablePendingGateIn();

  const overdueCount = passes?.filter((pass) => pass.is_overdue).length ?? 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <DashboardHeader
        title="Material In"
        description="Material currently outside the gate. Record what comes back, in what quantity and what condition."
      />

      {overdueCount > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <AlertTriangle className="h-4 w-4" />
          {overdueCount} gate pass(es) are past their expected return date.
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[950px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Pass No</th>
              <th className="px-3 py-2 text-left font-medium">Party</th>
              <th className="px-3 py-2 text-left font-medium">Purpose</th>
              <th className="px-3 py-2 text-left font-medium">Gated Out</th>
              <th className="px-3 py-2 text-left font-medium">Expected Back</th>
              <th className="px-3 py-2 text-right font-medium">Pending Qty</th>
              <th className="px-3 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Loading queue…
                </td>
              </tr>
            ) : !passes?.length ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  <PackageOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Nothing is outside the gate.
                </td>
              </tr>
            ) : (
              passes.map((pass) => (
                <tr
                  key={pass.id}
                  className={cn('border-t hover:bg-muted/30', pass.is_overdue && 'bg-rose-50/60')}
                >
                  <td className="px-3 py-2 font-medium">{pass.pass_no}</td>
                  <td className="px-3 py-2">{pass.party_name}</td>
                  <td className="px-3 py-2">{pass.purpose_display}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {pass.gate_out_at ? new Date(pass.gate_out_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(pass.expected_return_date).toLocaleDateString()}
                      {pass.is_overdue ? (
                        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-800">
                          {pass.days_overdue}d late
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{pass.pending_return_qty}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" onClick={() => navigate(`/gate/return-in/${pass.id}`)}>
                      <Undo2 className="mr-2 h-4 w-4" />
                      Record Return
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
