import { AlertTriangle, CalendarClock, Eye, PackageOpen, Search, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ReturnableStatusBadge } from '@/modules/maintenance/components/returnable';
import { DashboardHeader } from '@/shared/components/dashboard';
import {
  Button,
  Card,
  CardContent,
  Input,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useReturnableGatePasses } from '../../api/returnable';

/**
 * Everything that has left the gate against a returnable pass — still outside,
 * or already back.
 *
 * A non-returnable pass closes the moment it is gated out, so it can never
 * appear here. Drafts and unapproved passes never reached the gate at all.
 */
const GATE_IN_VISIBLE_STATUSES = 'OUT,PARTIALLY_RETURNED,RETURNED,CLOSED';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OUT', label: 'Out with Party' },
  { value: 'PARTIALLY_RETURNED', label: 'Partially Returned' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CLOSED', label: 'Closed' },
];

/** The two statuses where material is still outside and can be received back. */
const OUTSTANDING: string[] = ['OUT', 'PARTIALLY_RETURNED'];

export default function ReturnInListPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filters = useMemo(
    () => ({
      q: search || undefined,
      // 'ALL' means every status the gate-in screen is concerned with.
      status: status === 'ALL' ? GATE_IN_VISIBLE_STATUSES : status,
      is_returnable: true,
      overdue: overdueOnly ? true : undefined,
    }),
    [search, status, overdueOnly],
  );

  const { data: passes, isLoading } = useReturnableGatePasses(filters);

  const outstandingCount = passes?.filter((pass) => OUTSTANDING.includes(pass.status)).length ?? 0;
  const overdueCount = passes?.filter((pass) => pass.is_overdue).length ?? 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <DashboardHeader
        title="Material In"
        description="Material sent out against a returnable gate pass. Record what comes back, in what quantity and what condition."
      />

      {overdueCount > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {overdueCount} gate pass{overdueCount === 1 ? ' is' : 'es are'} past their expected return
          date.
        </div>
      ) : outstandingCount > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <Undo2 className="h-4 w-4 shrink-0" />
          {outstandingCount} gate pass{outstandingCount === 1 ? '' : 'es'} still outside the gate.
        </div>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search pass no, party, item or serial number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <NativeSelect
            className="sm:w-52"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </NativeSelect>

          <Button
            type="button"
            variant={overdueOnly ? 'default' : 'outline'}
            onClick={() => setOverdueOnly((previous) => !previous)}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Overdue only
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Pass No</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
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
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Loading gate passes…
                </td>
              </tr>
            ) : !passes?.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  <PackageOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  No gate passes match these filters.
                </td>
              </tr>
            ) : (
              passes.map((pass) => {
                const isOutstanding = OUTSTANDING.includes(pass.status);
                return (
                  <tr
                    key={pass.id}
                    className={cn('border-t hover:bg-muted/30', pass.is_overdue && 'bg-rose-50/60')}
                  >
                    <td className="px-3 py-2 font-medium">{pass.pass_no}</td>
                    <td className="px-3 py-2">
                      <ReturnableStatusBadge
                        status={pass.status}
                        isOverdue={pass.is_overdue}
                        daysOverdue={pass.days_overdue}
                      />
                    </td>
                    <td className="px-3 py-2">{pass.party_name}</td>
                    <td className="px-3 py-2">{pass.purpose_display}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {pass.gate_out_at ? new Date(pass.gate_out_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {pass.expected_return_date ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date(pass.expected_return_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{pass.pending_return_qty}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant={isOutstanding ? 'default' : 'outline'}
                        onClick={() => navigate(`/gate/return-in/${pass.id}`)}
                      >
                        {isOutstanding ? (
                          <>
                            <Undo2 className="mr-2 h-4 w-4" />
                            Record Return
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
