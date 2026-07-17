import { CalendarClock, Eye, PackageOpen, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ReturnableStatusBadge,
  ReturnableTypeBadge,
} from '@/modules/maintenance/components/returnable';
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
 * Everything the gate has ever handled on the way out, not just the queue.
 *
 * Drafts and passes still awaiting approval are deliberately excluded — those
 * belong to the department and the gate should never see them.
 */
const GATE_VISIBLE_STATUSES =
  'PENDING_GATE_OUT,OUT,PARTIALLY_RETURNED,RETURNED,CLOSED,CANCELLED';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING_GATE_OUT', label: 'Awaiting Gate Out' },
  { value: 'OUT', label: 'Out' },
  { value: 'PARTIALLY_RETURNED', label: 'Partially Returned' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

type TypeFilter = 'ALL' | 'RETURNABLE' | 'NON_RETURNABLE';

export default function ReturnOutListPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const filters = useMemo(
    () => ({
      q: search || undefined,
      // 'ALL' still means "all the gate is allowed to see", not literally all.
      status: status === 'ALL' ? GATE_VISIBLE_STATUSES : status,
      is_returnable: typeFilter === 'ALL' ? undefined : typeFilter === 'RETURNABLE',
    }),
    [search, status, typeFilter],
  );

  const { data: passes, isLoading } = useReturnableGatePasses(filters);
  const awaitingCount = passes?.filter((pass) => pass.status === 'PENDING_GATE_OUT').length ?? 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <DashboardHeader
        title="Material Out"
        description="Every gate pass that has reached the gate. Verify the items physically, record the vehicle, then gate out."
      />

      {awaitingCount > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Truck className="h-4 w-4 shrink-0" />
          {awaitingCount} gate pass{awaitingCount === 1 ? ' is' : 'es are'} waiting to leave.
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

          <NativeSelect
            className="sm:w-56"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
          >
            <SelectOption value="ALL">Returnable &amp; Non-returnable</SelectOption>
            <SelectOption value="RETURNABLE">Returnable only</SelectOption>
            <SelectOption value="NON_RETURNABLE">Non-returnable only</SelectOption>
          </NativeSelect>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1150px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Pass No</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Purpose</th>
              <th className="px-3 py-2 text-left font-medium">Going To</th>
              <th className="px-3 py-2 text-left font-medium">Items</th>
              <th className="px-3 py-2 text-left font-medium">Gated Out</th>
              <th className="px-3 py-2 text-left font-medium">Expected Back</th>
              <th className="px-3 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  Loading gate passes…
                </td>
              </tr>
            ) : !passes?.length ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  <PackageOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  No gate passes match these filters.
                </td>
              </tr>
            ) : (
              passes.map((pass) => {
                const isAwaiting = pass.status === 'PENDING_GATE_OUT';
                return (
                  <tr
                    key={pass.id}
                    className={cn('border-t hover:bg-muted/30', isAwaiting && 'bg-amber-50/40')}
                  >
                    <td className="px-3 py-2 font-medium">{pass.pass_no}</td>
                    <td className="px-3 py-2">
                      <ReturnableStatusBadge
                        status={pass.status}
                        isOverdue={pass.is_overdue}
                        daysOverdue={pass.days_overdue}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {pass.material_indent_no ? (
                        <span
                          className="inline-flex items-center whitespace-nowrap rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
                          title={`Material Indent ${pass.material_indent_no}`}
                        >
                          Material Indent
                        </span>
                      ) : (
                        <ReturnableTypeBadge isReturnable={pass.is_returnable} />
                      )}
                    </td>
                    <td className="px-3 py-2">{pass.purpose_display}</td>
                    <td className="px-3 py-2">{pass.destination}</td>
                    <td className="max-w-[220px] px-3 py-2">
                      <span className="block truncate" title={pass.item_names}>
                        {pass.item_names || '—'}
                      </span>
                      {pass.item_count > 1 ? (
                        <span className="text-xs text-muted-foreground">
                          {pass.item_count} items
                        </span>
                      ) : null}
                    </td>
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
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant={isAwaiting ? 'default' : 'outline'}
                        onClick={() => navigate(`/gate/return-out/${pass.id}`)}
                      >
                        {isAwaiting ? (
                          <>
                            <Truck className="mr-2 h-4 w-4" />
                            Gate Out
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
