import { Badge, Card, CardContent, CardHeader } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { CADENCE_META } from '../constants';
import type { DailyGroup } from '../types';
import { DailyJobRow } from './DailyJobRow';

export interface CadenceSectionProps {
  group: DailyGroup;
}

/**
 * One cadence bucket as a card. Counted groups (DAILY, SHIFT) get an accent colour
 * and a "6 / 9 done" badge; uncounted ones (EVENT, PERIODIC) are slate and say so.
 */
export function CadenceSection({ group }: CadenceSectionProps) {
  const meta = CADENCE_META[group.cadence];
  const Icon = meta.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex min-w-0 gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              meta.accent.iconBg,
            )}
          >
            <Icon className={cn('h-4 w-4', meta.accent.icon)} />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold leading-tight">{meta.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{meta.blurb}</p>
          </div>
        </div>

        {meta.counted ? (
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {group.done} / {group.counted_jobs} done
          </Badge>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">Not counted</span>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Job</th>
                <th className="px-4 py-2 text-left font-medium">Today</th>
                <th className="px-4 py-2 text-right font-medium">Open now</th>
                <th className="px-4 py-2 text-right font-medium">Oldest</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {group.jobs.map((job) => (
                <DailyJobRow key={job.source_key} job={job} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
