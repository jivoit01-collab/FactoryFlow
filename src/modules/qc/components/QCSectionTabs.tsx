import { useLocation, useNavigate } from 'react-router-dom';

import { usePermission } from '@/core/auth';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui';

export interface QCSectionTab {
  /** The tab's own route; the tab is active on exactly this path. */
  path: string;
  label: string;
  /** Any one of these shows the tab — the same list that gates its route. */
  permissions: readonly string[];
  /** Shown as a pill after the label when above zero. */
  count?: number;
}

/**
 * One sidebar item standing for several pages: each page keeps its own route
 * (so bookmarks, notifications and in-page URL filters are untouched) and this
 * bar moves between them. Renders nothing when the user can open only one —
 * unless `showSingle`, for a section that is meant to grow more tabs.
 */
export function QCSectionTabs({
  tabs,
  showSingle = false,
}: {
  tabs: readonly QCSectionTab[];
  showSingle?: boolean;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { hasAnyPermission } = usePermission();

  const visible = tabs.filter((tab) => hasAnyPermission(tab.permissions));
  if (visible.length < (showSingle ? 1 : 2)) return null;

  const active = visible.find((tab) => tab.path === pathname)?.path ?? '';

  return (
    <Tabs value={active} onValueChange={(path) => navigate(path)}>
      <TabsList className="h-auto flex-wrap justify-start">
        {visible.map((tab) => (
          <TabsTrigger key={tab.path} value={tab.path} className="gap-2">
            {tab.label}
            {!!tab.count && tab.count > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white">
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
