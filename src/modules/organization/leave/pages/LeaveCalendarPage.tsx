/**
 * Who is away, over a window.
 *
 * The question this answers is not "what did each person take?" but "how many
 * of my people are out on the same day?" — which is what a supervisor is
 * actually deciding against when they approve the next request. So the rows are
 * people, the columns are dates, and a per-day headcount runs along the bottom.
 *
 * Pending requests are shown alongside approved ones, in a lighter shade.
 * Leaving them out would mean approving a fourth person for a Friday that
 * already has three requests in flight.
 */
import { useMemo, useState } from 'react';

import { Card, CardContent, Input, Label } from '@/shared/components/ui';

import { useLeaveCalendar } from '../api';
import { formatDate, todayLocal } from '../components/statusBits';

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = from;
  // Bounded so a mistyped year cannot render ten thousand columns.
  while (cursor <= to && out.length < 62) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

export default function LeaveCalendarPage() {
  const [from, setFrom] = useState(todayLocal());
  const [to, setTo] = useState(addDays(todayLocal(), 13));

  const { data: requests = [], isLoading } = useLeaveCalendar(from, to);
  const dates = useMemo(() => datesBetween(from, to), [from, to]);

  /** employee → date → 'APPROVED' | 'PENDING' */
  const grid = useMemo(() => {
    const byEmployee = new Map<string, { name: string; code: string; days: Map<string, string> }>();

    for (const request of requests) {
      const key = String(request.employee);
      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          name: request.employee_name,
          code: request.employee_code,
          days: new Map(),
        });
      }
      const entry = byEmployee.get(key)!;
      for (const day of request.days) {
        if (day.status === 'REJECTED' || day.status === 'CANCELLED') continue;
        // An approved day always wins over a pending one on the same date.
        const existing = entry.days.get(day.date);
        if (existing === 'APPROVED') continue;
        entry.days.set(day.date, request.status === 'APPROVED' ? 'APPROVED' : 'PENDING');
      }
    }
    return [...byEmployee.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [requests]);

  const perDay = useMemo(
    () => dates.map((date) => grid.filter((row) => row.days.get(date) === 'APPROVED').length),
    [dates, grid],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Leave calendar</h1>
          <p className="text-sm text-muted-foreground">
            Who is out, and how many at once. Pending requests are shown faintly.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="cal-from">From</Label>
            <Input
              id="cal-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cal-to">To</Label>
            <Input
              id="cal-to"
              type="date"
              min={from}
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/40 px-4 py-2 text-left font-medium">
                    Employee
                  </th>
                  {dates.map((date) => (
                    <th
                      key={date}
                      className="px-1 py-2 text-center text-xs font-medium whitespace-nowrap"
                      title={formatDate(date)}
                    >
                      {date.slice(8)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={dates.length + 1}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : grid.length === 0 ? (
                  <tr>
                    <td
                      colSpan={dates.length + 1}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Nobody is booked off in this window.
                    </td>
                  </tr>
                ) : (
                  grid.map((row) => (
                    <tr key={row.code} className="border-b last:border-0">
                      <td className="sticky left-0 z-10 bg-background px-4 py-2 whitespace-nowrap">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.code}</div>
                      </td>
                      {dates.map((date) => {
                        const state = row.days.get(date);
                        return (
                          <td key={date} className="px-1 py-2 text-center">
                            {state === 'APPROVED' ? (
                              <span className="inline-block h-4 w-4 rounded bg-emerald-500" />
                            ) : state === 'PENDING' ? (
                              <span className="inline-block h-4 w-4 rounded bg-amber-200" />
                            ) : (
                              <span className="inline-block h-4 w-4 rounded bg-muted/50" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
              {grid.length > 0 ? (
                <tfoot className="border-t bg-muted/20">
                  <tr>
                    <td className="sticky left-0 z-10 bg-muted/20 px-4 py-2 text-xs font-medium">
                      Out that day
                    </td>
                    {perDay.map((count, index) => (
                      <td key={dates[index]} className="px-1 py-2 text-center text-xs tabular-nums">
                        {count || ''}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
