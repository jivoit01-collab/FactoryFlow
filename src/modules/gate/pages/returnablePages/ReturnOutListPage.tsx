import { CalendarClock, PackageOpen, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ReturnableTypeBadge } from '@/modules/maintenance/components/returnable';
import { DashboardHeader } from '@/shared/components/dashboard';
import { Button } from '@/shared/components/ui';

import { useReturnablePendingGateOut } from '../../api/returnable';

/**
 * The gate's outbound queue: passes a department has submitted and that are
 * waiting for the gate to record vehicle details and let the material out.
 */
export default function ReturnOutListPage() {
  const navigate = useNavigate();
  const { data: passes, isLoading } = useReturnablePendingGateOut();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <DashboardHeader
        title="Material Out"
        description="Approved gate passes waiting to leave. Verify the items physically, record the vehicle, then gate out."
      />

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Pass No</th>
              <th className="px-3 py-2 text-left font-medium">Purpose</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Going To</th>
              <th className="px-3 py-2 text-left font-medium">Department</th>
              <th className="px-3 py-2 text-left font-medium">Items</th>
              <th className="px-3 py-2 text-left font-medium">Expected Back</th>
              <th className="px-3 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Loading queue…
                </td>
              </tr>
            ) : !passes?.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  <PackageOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Nothing is waiting to go out.
                </td>
              </tr>
            ) : (
              passes.map((pass) => (
                <tr key={pass.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{pass.pass_no}</td>
                  <td className="px-3 py-2">{pass.purpose_display}</td>
                  <td className="px-3 py-2">
                    <ReturnableTypeBadge isReturnable={pass.is_returnable} />
                  </td>
                  <td className="px-3 py-2">{pass.destination}</td>
                  <td className="px-3 py-2">{pass.department_name || '—'}</td>
                  <td className="px-3 py-2">{pass.item_count}</td>
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
                    <Button size="sm" onClick={() => navigate(`/gate/return-out/${pass.id}`)}>
                      <Truck className="mr-2 h-4 w-4" />
                      Gate Out
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
