import { Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PageLoading } from '@/shared/components/PageLoading';
import { Badge, Card, CardContent, Input, NativeSelect } from '@/shared/components/ui';

import { useActivityDefinitions } from '../api/activities.queries';

/**
 * Job catalogue — every job the system tracks and the permission that makes someone
 * responsible for it.
 *
 * This is the screen to open before granting access: find the job a person should be
 * doing, read off the permission, then grant that permission in Admin. It is derived
 * from the same registry that produces everyone's pending list, so it can never
 * disagree with what users actually see.
 */
export default function ActivityCatalogPage() {
  const { data, isLoading } = useActivityDefinitions();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const modules = useMemo(
    () => [...new Set((data ?? []).map((row) => row.module))].sort(),
    [data],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      if (moduleFilter && row.module !== moduleFilter) return false;
      if (!term) return true;
      return (
        row.label.toLowerCase().includes(term) ||
        row.permission.toLowerCase().includes(term) ||
        row.module.toLowerCase().includes(term)
      );
    });
  }, [data, search, moduleFilter]);

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <DashboardHeader
        title="Job Catalogue"
        description="Every tracked job and the permission that assigns it — grant that permission in Admin to make it someone's work"
      >
        <NativeSelect
          value={moduleFilter}
          onChange={(event) => setModuleFilter(event.target.value)}
          aria-label="Filter by module"
          className="w-56"
        >
          <option value="">All modules</option>
          {modules.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </NativeSelect>
      </DashboardHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search a job or a permission"
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 font-medium">Job</th>
                  <th className="p-3 font-medium">Module</th>
                  <th className="p-3 font-medium">Grant this permission</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 text-right font-medium">Overdue after</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.source_key} className="border-b last:border-0">
                    <td className="p-3">
                      <span className="font-medium">{row.label}</span>
                      {row.is_mine && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Yours
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{row.module}</td>
                    <td className="p-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {row.permission}
                      </code>
                    </td>
                    <td className="p-3">
                      {row.mode === 'QUEUE' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          Shared queue
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Assigned to one person</span>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                      {row.overdue_after_days === 0
                        ? 'Same day'
                        : `${row.overdue_after_days} day${row.overdue_after_days === 1 ? '' : 's'}`}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No jobs match that search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
