import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePermission } from '@/core/auth';
import { ACCENTS } from '@/shared/components/dashboard';
import { cn } from '@/shared/utils';

import { DISPATCH_SECTIONS } from './dispatchDashboard.constants';

/**
 * The dispatch module's sub-areas as small, light nav cards — the bottom row of
 * the dashboard. Each is permission-filtered and lifts on hover.
 */
export function DispatchSectionCards() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();

  const sections = useMemo(
    () => DISPATCH_SECTIONS.filter((s) => hasAnyPermission([...s.permissions])),
    [hasAnyPermission],
  );

  if (sections.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {sections.map((section, i) => {
        const accent = ACCENTS[section.accent];
        const Icon = section.icon;

        return (
          <button
            key={section.route}
            type="button"
            onClick={() => navigate(section.route)}
            style={{ animationDelay: `${i * 45}ms` }}
            className={cn(
              'group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm',
              'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500',
              'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              accent.glow,
            )}
          >
            {/* wash blooms on hover */}
            <div
              className={cn(
                'pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-70',
                accent.wash,
              )}
            />
            <div className="relative z-10 flex items-center justify-between">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                  accent.iconBg,
                )}
              >
                <Icon className={cn('h-5 w-5', accent.icon)} />
              </div>
              <ArrowRight
                className={cn(
                  'h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100',
                  accent.icon,
                )}
              />
            </div>
            <h4 className="relative z-10 mt-3 truncate text-sm font-semibold">{section.title}</h4>
            <p className="relative z-10 mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {section.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
