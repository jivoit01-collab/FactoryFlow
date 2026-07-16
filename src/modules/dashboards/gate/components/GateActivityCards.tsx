import { LayoutGrid } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePermission } from '@/core/auth';
import { ACCENTS } from '@/shared/components/dashboard';
import { cn } from '@/shared/utils';

import {
  GATE_ACTIVITIES,
  type GateRange,
  todayISO,
} from '../constants/gate-dashboard.constants';
import { useGateActivityCounts } from '../hooks/useGateActivityCounts';

const COLLAPSED_COUNT = 6;

/**
 * Every gate activity as a compact card showing its live count up-front. A
 * "View all activities" toggle expands the full set.
 */
export function GateActivityCards({ range }: { range: GateRange }) {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const { counts, isLoading } = useGateActivityCounts(range);
  const [showAll, setShowAll] = useState(false);

  const activities = useMemo(
    () => GATE_ACTIVITIES.filter((a) => hasAnyPermission([...a.permissions])),
    [hasAnyPermission],
  );

  const isToday = range.from === range.to && range.from === todayISO();
  const periodLabel = isToday ? 'TODAY' : 'RANGE';

  if (activities.length === 0) return null;

  const shown = showAll ? activities : activities.slice(0, COLLAPSED_COUNT);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Gate activities</h2>
        </div>
        {activities.length > COLLAPSED_COUNT && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-primary/5"
          >
            {showAll ? 'Show less' : 'View all activities'} →
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {shown.map((activity, i) => {
          const accent = ACCENTS[activity.accent];
          const Icon = activity.icon;
          const count = counts[activity.route];
          const hasCount = count !== undefined;

          return (
            <button
              key={activity.route}
              type="button"
              onClick={() => navigate(activity.route)}
              style={{ animationDelay: `${i * 35}ms` }}
              className={cn(
                'group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm',
                'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500',
                'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                accent.glow,
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-70',
                  accent.wash,
                )}
              />
              <div className="relative z-10 flex items-start justify-between">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                    accent.iconBg,
                  )}
                >
                  <Icon className={cn('h-5 w-5', accent.icon)} />
                </div>
                <div className="text-right">
                  {hasCount ? (
                    <div className={cn('text-2xl font-bold leading-none tabular-nums', accent.icon)}>
                      {count}
                    </div>
                  ) : isLoading ? (
                    <div className="ml-auto h-6 w-8 animate-pulse rounded-md bg-muted/60" />
                  ) : (
                    <div className="text-xl font-bold leading-none text-muted-foreground/40">—</div>
                  )}
                  <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                    {periodLabel}
                  </div>
                </div>
              </div>
              <h4 className="relative z-10 mt-3 truncate text-sm font-semibold">{activity.title}</h4>
              <p className="relative z-10 mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {activity.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
