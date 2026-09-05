import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  ScrollText,
  Search,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { formatDateTimeFull } from '@/shared/utils';

import {
  qcDocumentFileAuditApi,
  useQCDocumentFileAuditFilterOptions,
  useQCDocumentFileAuditLog,
} from '../../api/qcDocumentFileAudit';
import type {
  QCDocumentFileAuditAction,
  QCDocumentFileAuditFilters,
} from '../../types/qcDocumentFileAudit.types';
import { AuditActionBadge, AuditChanges } from './AuditEventDisplay';

const PAGE_SIZE = 50;

const EMPTY_FILTERS: QCDocumentFileAuditFilters = {
  search: '',
  action: '',
  user: null,
  document: null,
  date_from: '',
  date_to: '',
};

/**
 * QC → QA Procedure Log.
 *
 * The manager's answer to "who changed our controlled procedures". Every
 * upload, edit and retire in the PDF library, filterable by person, document,
 * action and date, and exportable as the CSV an auditor will ask for.
 *
 * Reads are deliberately absent: the library exists to be read, so a row per
 * open would bury the handful of events that actually matter.
 */
export default function QAProcedureLogPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<QCDocumentFileAuditFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const query = { ...filters, page, page_size: PAGE_SIZE };
  const { data, isLoading, isFetching, error } = useQCDocumentFileAuditLog(query);
  const { data: options } = useQCDocumentFileAuditFilterOptions();

  const entries = data?.results ?? [];
  const counts = data?.action_counts;

  /** Any filter change resets to page 1 — page 7 of a new filter is nonsense. */
  const setFilter = <K extends keyof QCDocumentFileAuditFilters>(
    key: K,
    value: QCDocumentFileAuditFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const hasFilters = Object.entries(EMPTY_FILTERS).some(
    ([key]) =>
      filters[key as keyof QCDocumentFileAuditFilters] !==
      EMPTY_FILTERS[key as keyof QCDocumentFileAuditFilters],
  );

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Exported through the authenticated client, then handed to the browser
      // as an object URL: the endpoint is permission-checked, so a plain link
      // carrying no auth header would come back 403.
      const blob = await qcDocumentFileAuditApi.exportCsv(filters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `qa-procedures-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Audit log exported.');
    } catch (exportError) {
      toast.error((exportError as ApiError).message || 'Could not export the audit log.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/qc/qa-procedures')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <h2 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <ScrollText className="h-8 w-8" />
            QA Procedure Log
          </h2>
          <p className="text-sm text-muted-foreground">
            Every change made to a controlled procedure — who, what and when. Opening a document to
            read it is not a change and is not recorded.
          </p>
        </div>
        <Button
          variant="outline"
          className="ml-auto"
          onClick={handleExport}
          disabled={isExporting || entries.length === 0}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>

      {/* ---- filters ---- */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="audit-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="audit-search"
                value={filters.search ?? ''}
                onChange={(event) => setFilter('search', event.target.value)}
                placeholder="Document code, title, or person…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-action">Action</Label>
            <NativeSelect
              id="audit-action"
              value={filters.action ?? ''}
              onChange={(event) =>
                setFilter('action', event.target.value as QCDocumentFileAuditAction | '')
              }
            >
              <SelectOption value="">All actions</SelectOption>
              {(options?.actions ?? []).map((action) => (
                <SelectOption key={action.value} value={action.value}>
                  {action.label}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-user">Person</Label>
            <NativeSelect
              id="audit-user"
              value={filters.user ?? ''}
              onChange={(event) =>
                setFilter('user', event.target.value ? Number(event.target.value) : null)
              }
            >
              <SelectOption value="">Everyone</SelectOption>
              {(options?.users ?? []).map((user) => (
                <SelectOption key={user.id} value={user.id}>
                  {user.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-document">Document</Label>
            <NativeSelect
              id="audit-document"
              value={filters.document ?? ''}
              onChange={(event) =>
                setFilter('document', event.target.value ? Number(event.target.value) : null)
              }
            >
              <SelectOption value="">All documents</SelectOption>
              {(options?.documents ?? []).map((document) => (
                <SelectOption key={document.id} value={document.id}>
                  {document.document_code || document.title}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="audit-from">From</Label>
              <Input
                id="audit-from"
                type="date"
                value={filters.date_from ?? ''}
                onChange={(event) => setFilter('date_from', event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audit-to">To</Label>
              <Input
                id="audit-to"
                type="date"
                value={filters.date_to ?? ''}
                onChange={(event) => setFilter('date_to', event.target.value)}
              />
            </div>
          </div>

          {hasFilters && (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1.5 h-4 w-4" />
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- the trail ---- */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <CardTitle className="text-lg">
            {data ? `${data.count} event${data.count === 1 ? '' : 's'}` : 'Events'}
          </CardTitle>
          {counts && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="success">{counts.UPLOADED} uploaded</Badge>
              <Badge variant="warning">{counts.EDITED} edited</Badge>
              <Badge variant="destructive">{counts.RETIRED} retired</Badge>
              {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 py-10 text-center text-sm text-destructive">
              {error.message || 'Could not load the audit log.'}
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <ScrollText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {hasFilters
                  ? 'No event matches these filters.'
                  : 'Nothing recorded yet. Documents filed before the log was switched on have no entries.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">When</th>
                      <th className="px-3 py-2 font-medium">Who</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                      <th className="px-3 py-2 font-medium">Document</th>
                      <th className="px-3 py-2 font-medium">What changed</th>
                      <th className="px-3 py-2 font-medium">From</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b align-top last:border-0">
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                          {formatDateTimeFull(entry.created_at)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{entry.user_name || 'Unknown user'}</div>
                          {entry.user_email && (
                            <div className="text-xs text-muted-foreground">{entry.user_email}</div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <AuditActionBadge entry={entry} />
                        </td>
                        <td className="px-3 py-2">
                          {/* The code and title as they read at the time, so a
                              later rename cannot rewrite the trail. */}
                          <div className="font-mono text-xs">{entry.document_code || '—'}</div>
                          <div className="text-xs text-muted-foreground">{entry.title}</div>
                          {entry.document_missing && (
                            <Badge variant="outline" className="mt-1">
                              Record erased
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <AuditChanges entry={entry} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                          {entry.ip_address || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data && data.total_pages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Page {data.page} of {data.total_pages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.previous || isFetching}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.next || isFetching}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
