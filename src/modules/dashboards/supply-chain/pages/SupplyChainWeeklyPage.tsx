/** The Monday step — is the system getting more trustworthy, or less?
 *
 * The share of REAL verdicts is the only measure that matters here. Rising means
 * the alarms are worth acting on; flat or falling means the inputs are still
 * wrong, and more software will not fix that.
 */
import { useState } from 'react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useWeeklyReview } from '../api/supply-chain.queries';

export default function SupplyChainWeeklyPage() {
  const [weeks, setWeeks] = useState(4);
  const query = useWeeklyReview(weeks);

  if (query.isLoading) {
    return (
      <div className="p-6">
        <DashboardHeader title="Weekly review" description="Loading…" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="p-6">
        <DashboardHeader title="Weekly review" />
        <p className="mt-4 text-sm text-destructive">
          {getErrorMessage(query.error, 'Could not load the weekly review.')}
        </p>
      </div>
    );
  }

  const data = query.data;
  const t = data.totals;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title="Weekly review"
        description="Were the alarms worth raising? The verdict log answers it."
      >
        <div className="flex gap-1">
          {[2, 4, 8].map((w) => (
            <Button
              key={w}
              size="sm"
              variant={weeks === w ? 'default' : 'outline'}
              onClick={() => setWeeks(w)}
            >
              {w}w
            </Button>
          ))}
        </div>
      </DashboardHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Verdicts recorded', value: t.verdicts },
          { label: 'Real shortages', value: t.real },
          { label: 'Wrong data', value: t.wrong_data },
          { label: 'Real share', value: `${t.real_share_percent}%` },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold">{tile.value}</p>
              <p className="text-sm text-muted-foreground">{tile.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* The decision, stated rather than left to interpretation. */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <p className="text-sm font-medium">What to do next</p>
          <p className="mt-1 text-sm text-muted-foreground">{data.recommendation}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {data.weeks.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No verdicts recorded in this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Week starting</th>
                    <th className="px-3 py-2 text-right font-medium">Judged</th>
                    <th className="px-3 py-2 text-right font-medium">Real</th>
                    <th className="px-3 py-2 text-right font-medium">Wrong data</th>
                    <th className="px-3 py-2 text-right font-medium">Handled</th>
                    <th className="px-3 py-2 text-right font-medium">Real share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weeks.map((w) => (
                    <tr key={w.week_starting} className="border-b last:border-0">
                      <td className="px-3 py-2">{w.week_starting}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{w.total}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{w.real}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{w.wrong_data}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {w.already_handled}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {w.real_share_percent}%
                      </td>
                    </tr>
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
