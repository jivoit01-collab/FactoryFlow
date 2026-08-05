import { Badge, Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { DailyBoardRow } from '../types';

export interface TeamBoardTableProps {
  rows: DailyBoardRow[];
  isLoading: boolean;
}

function timeOnly(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * The all-users board.
 *
 * Nothing here is colour-coded by how little someone did. `not_yet` renders as plain
 * muted text and rows with no activity get a neutral tint at most — with no attendance
 * data we cannot tell an idle day from a day off, so a red row would assert something
 * we do not know.
 */
export function TeamBoardTable({ rows, isLoading }: TeamBoardTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">No users match this search.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">User</th>
                <th className="px-4 py-2 text-right font-medium">Tracked jobs</th>
                <th className="px-4 py-2 text-right font-medium">Recorded</th>
                <th className="px-4 py-2 text-right font-medium">Not yet</th>
                <th className="px-4 py-2 text-right font-medium">First</th>
                <th className="px-4 py-2 text-right font-medium">Last</th>
                <th className="px-4 py-2 text-left font-medium">Modules</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const idle = row.records_done === 0;
                const extraModules = row.modules_touched.length - 2;

                return (
                  <tr
                    key={row.user_id}
                    className={cn(
                      'border-b border-border/60 last:border-0',
                      idle && 'bg-muted/20',
                      row.is_superuser && 'text-muted-foreground',
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.full_name}</span>
                        {row.is_superuser && (
                          <Badge
                            variant="outline"
                            title="Admins hold every permission, so their expected count is inflated."
                          >
                            admin
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.employee_code}</div>
                    </td>

                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.expected_counted}
                      {row.expected_uncounted > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          +{row.expected_uncounted} untracked
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <div className="font-medium">{row.jobs_done}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.records_done.toLocaleString('en-IN')} records
                      </div>
                    </td>

                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {row.not_yet}
                    </td>

                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {timeOnly(row.first_activity_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {timeOnly(row.last_activity_at)}
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {row.modules_touched.slice(0, 2).map((module) => (
                          <Badge key={module} variant="secondary" className="font-normal">
                            {module}
                          </Badge>
                        ))}
                        {extraModules > 0 && (
                          <span
                            className="text-xs text-muted-foreground"
                            title={row.modules_touched.slice(2).join(', ')}
                          >
                            +{extraModules}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
