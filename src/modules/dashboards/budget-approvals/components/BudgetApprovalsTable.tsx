import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { BudgetApprovalFilters, BudgetApprovalLine, ReportMeta } from '../types';
import { BudgetApprovalsEmptyHint } from './BudgetApprovalsMetaCards';
import { ColumnFilterHeader } from './ColumnFilterHeader';

interface BudgetApprovalsTableProps {
  lines: BudgetApprovalLine[];
  meta?: ReportMeta;
  isLoading: boolean;
  filters: BudgetApprovalFilters;
  onFiltersChange: (filters: BudgetApprovalFilters) => void;
  onPageChange: (page: number) => void;
}

function formatAmount(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'W':
      return (
        <Badge className="border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          Pending
        </Badge>
      );
    case 'Y':
      return (
        <Badge className="border-green-200 bg-green-100 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300">
          Approved
        </Badge>
      );
    case 'N':
      return (
        <Badge className="border-red-200 bg-red-100 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="outline">{status || '—'}</Badge>;
  }
}

export function BudgetApprovalsTable({
  lines,
  meta,
  isLoading,
  filters,
  onFiltersChange,
  onPageChange,
}: BudgetApprovalsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b p-4">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const page = meta?.page ?? 1;
  const totalPages = meta?.total_pages ?? 1;
  const hasColumnFilters = Object.keys(filters.column_filters).length > 0;
  const headerProps = { filters, onFiltersChange };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="p-3 font-medium">
                  <ColumnFilterHeader label="Status" sortField="status" filterable={false} {...headerProps} />
                </th>
                <th className="p-3 font-medium">
                  <ColumnFilterHeader label="Branch" field="branch" {...headerProps} />
                </th>
                <th className="p-3 font-medium">
                  <ColumnFilterHeader label="Document" field="obj_type_label" sortField="doc_entry" {...headerProps} />
                </th>
                <th className="p-3 font-medium">
                  <ColumnFilterHeader label="Vendor / Customer" field="card_name" {...headerProps} />
                </th>
                <th className="p-3 font-medium">
                  <ColumnFilterHeader label="Account" field="acct_name" {...headerProps} />
                </th>
                <th className="p-3 font-medium">
                  <ColumnFilterHeader label="Sub Budget" field="sub_budget" {...headerProps} />
                </th>
                <th className="p-3 font-medium">
                  <ColumnFilterHeader label="Current Month" field="current_month" {...headerProps} />
                </th>
                <th className="p-3 font-medium">
                  <ColumnFilterHeader label="Doc Date" sortField="doc_date" filterable={false} {...headerProps} />
                </th>
                <th className="p-3 text-right font-medium">
                  <ColumnFilterHeader label="Amount" sortField="amount" filterable={false} align="right" {...headerProps} />
                </th>
                <th className="p-3 text-right font-medium">
                  <ColumnFilterHeader label="Posted This Month" sortField="current_month_posted_amount" filterable={false} align="right" {...headerProps} />
                </th>
                <th className="p-3 font-medium">
                  <ColumnFilterHeader label="Raised By" field="owner" {...headerProps} />
                </th>
                <th className="p-3 font-medium">
                  <ColumnFilterHeader label="Approver" field="approver" {...headerProps} />
                </th>
                <th className="p-3 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr
                  key={`${line.branch}-${line.obj_type}-${line.doc_entry}-${line.line_num ?? idx}-${line.status}`}
                  className={cn('border-b last:border-b-0 hover:bg-muted/30')}
                >
                  <td className="p-3">
                    <StatusBadge status={line.status} />
                  </td>
                  <td className="p-3">{line.branch}</td>
                  <td className="p-3">
                    <div className="font-medium">#{line.doc_entry}</div>
                    <div className="text-xs text-muted-foreground">{line.obj_type_label}</div>
                  </td>
                  <td className="p-3">
                    <div className="max-w-56 truncate" title={line.card_name}>
                      {line.card_name || '—'}
                    </div>
                    {line.card_code && (
                      <div className="text-xs text-muted-foreground">{line.card_code}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="max-w-56 truncate" title={line.acct_name}>
                      {line.acct_name || '—'}
                    </div>
                    {line.acct_code && (
                      <div className="text-xs text-muted-foreground">{line.acct_code}</div>
                    )}
                  </td>
                  <td className="p-3">{line.sub_budget || '—'}</td>
                  <td className="p-3">{line.current_month || '—'}</td>
                  <td className="p-3 whitespace-nowrap">{line.doc_date ?? '—'}</td>
                  <td className="p-3 text-right font-medium tabular-nums">
                    {formatAmount(line.amount)}
                  </td>
                  <td className="p-3 text-right tabular-nums text-muted-foreground">
                    {formatAmount(line.current_month_posted_amount)}
                  </td>
                  <td className="p-3">{line.owner || '—'}</td>
                  <td className="p-3">
                    <div className="max-w-40 truncate" title={line.approver}>
                      {line.approver || '—'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div
                      className="max-w-64 truncate text-muted-foreground"
                      title={[line.line_remarks, line.comments].filter(Boolean).join(' · ')}
                    >
                      {line.line_remarks || line.comments || '—'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!lines.length && (
          <div className="p-4">
            <BudgetApprovalsEmptyHint />
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t p-3 text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
            {meta && <> · {meta.total_rows.toLocaleString('en-IN')} lines</>}
            {hasColumnFilters && (
              <>
                {' · '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() =>
                    onFiltersChange({ ...filters, column_filters: {}, page: 1 })
                  }
                >
                  Clear column filters ({Object.keys(filters.column_filters).length})
                </button>
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
