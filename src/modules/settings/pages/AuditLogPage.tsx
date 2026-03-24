import { ArrowLeft, ChevronLeft, ChevronRight, History, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useAuditLog } from '../api';
import { AUDIT_ACTION_COLORS, AUDIT_ACTION_LABELS } from '../constants';

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useAuditLog(undefined, page);

  const filteredResults = data?.results?.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.rule_name.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (log.changed_by_name ?? '').toLowerCase().includes(q) ||
      log.reason.toLowerCase().includes(q)
    );
  });

  const totalCount = data?.count ?? 0;
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderChanges = (
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
  ) => {
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
    const changes: { key: string; old: string; new: string }[] = [];

    for (const key of allKeys) {
      const oldStr = JSON.stringify(oldValue[key] ?? '');
      const newStr = JSON.stringify(newValue[key] ?? '');
      if (oldStr !== newStr) {
        changes.push({
          key,
          old: oldValue[key] !== undefined ? String(oldValue[key]) : '-',
          new: newValue[key] !== undefined ? String(newValue[key]) : '-',
        });
      }
    }

    if (changes.length === 0) {
      return <span className="text-xs text-muted-foreground">No field changes</span>;
    }

    return (
      <div className="space-y-1">
        {changes.map((c) => (
          <div key={c.key} className="text-xs">
            <span className="font-medium">{c.key}:</span>{' '}
            <span className="text-red-600 line-through">{c.old}</span>
            {' -> '}
            <span className="text-green-600">{c.new}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Audit Log"
        description="Track all changes to workflow rules"
      >
        <Button variant="outline" onClick={() => navigate('/settings/rules')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rules
        </Button>
      </DashboardHeader>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by rule name, action, user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : !filteredResults || filteredResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <History className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-medium">No audit logs found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Changes to workflow rules will appear here
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Rule</th>
                <th className="px-4 py-3 text-left font-medium">Changed By</th>
                <th className="px-4 py-3 text-left font-medium">Changes</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((log) => (
                <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(log.changed_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        'border-0 text-xs',
                        AUDIT_ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700',
                      )}
                    >
                      {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">{log.rule_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.changed_by_name ?? '-'}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {renderChanges(log.old_value, log.new_value)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} entries)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
