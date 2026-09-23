/**
 * What is left, per leave type.
 *
 * Pending is shown beside available rather than subtracted from it. Somebody
 * with two days left and two awaiting approval has not spent them yet, but
 * cannot spend them twice either — showing one number would have to pick which
 * of those two truths to tell.
 */
import { Card, CardContent } from '@/shared/components/ui';

import { useLeaveBalance } from '../api';

export function BalanceCards({ employee }: { employee?: number }) {
  const { data, isLoading } = useLeaveBalance(employee);

  if (isLoading || !data) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {data.balances.map((row) => (
        <Card key={row.leave_type}>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{row.leave_type_name}</div>
            {row.tracked ? (
              <>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {row.available}
                  <span className="text-sm font-normal text-muted-foreground"> / {row.quota}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.used} used
                  {Number(row.pending) > 0 ? ` · ${row.pending} awaiting approval` : ''}
                </div>
              </>
            ) : (
              <>
                <div className="mt-1 text-2xl font-semibold text-muted-foreground">—</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Not tracked · {row.used} taken
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
