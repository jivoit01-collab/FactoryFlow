import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RotateCw,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { SAP_POSTINGS_PERMISSIONS } from '@/config/permissions/sap-postings.permissions';
import { usePermission } from '@/core/auth';
import {
  type SapPosting,
  type SapPostingAttempt,
  type SapPostingListParams,
  type SapPostingOutcome,
  type SapPostingStatus,
  useCancelSapPosting,
  useRetrySapPosting,
  useSapPosting,
  useSapPostingCounts,
  useSapPostings,
} from '@/modules/admin/api';
import { promptDialog } from '@/shared/components';
import { StatusPill, type StatusTone } from '@/shared/components/page';
import { PaginationControls } from '@/shared/components/PaginationControls';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

type Tab = 'QUEUED' | 'REJECTED' | 'POSTED' | 'ALL';

const TABS: { value: Tab; label: string }[] = [
  { value: 'QUEUED', label: 'Waiting for SAP' },
  { value: 'REJECTED', label: 'Refused' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'ALL', label: 'All' },
];

/** How far back the history tabs look. The to-do tabs always show everything. */
type Range = '7' | '30' | '90' | 'all';

const RANGES: { value: Range; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'Any time' },
];

/** The to-do tabs: small, and every row in them is something to do. */
function isTodo(tab: Tab) {
  return tab === 'QUEUED' || tab === 'REJECTED';
}

/** `YYYY-MM-DD` for `days` ago, by the local calendar. */
function daysAgo(days: number): string {
  const day = new Date();
  day.setDate(day.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

const STATUS_TONE: Record<SapPostingStatus, StatusTone> = {
  SENDING: 'progress',
  QUEUED: 'warn',
  POSTED: 'done',
  REJECTED: 'blocked',
  CANCELLED: 'neutral',
};

const OUTCOME_TONE: Record<Exclude<SapPostingOutcome, ''>, StatusTone> = {
  POSTED: 'done',
  WAITING: 'warn',
  REJECTED: 'blocked',
};

/** Whether a person can still do something with it: send it again, or stop it. */
function isOpen(status: SapPostingStatus) {
  return status === 'QUEUED' || status === 'REJECTED';
}

/** The one line that says where a posting stands, for the list. */
function latest(posting: SapPosting): string {
  if (posting.status === 'POSTED') {
    const nums = posting.result?.doc_nums ?? [];
    return nums.length ? `SAP ${nums.join(', ')}` : 'Posted';
  }
  if (posting.status === 'CANCELLED') return posting.cancel_reason || 'Cancelled';
  if (posting.status === 'QUEUED' && posting.next_attempt_at) {
    return `Next try ${formatDateTimeShort(posting.next_attempt_at)} — ${posting.last_error}`;
  }
  return posting.last_error || '—';
}

export default function SapPostingsPage() {
  const { hasPermission } = usePermission();
  const canAct = hasPermission(SAP_POSTINGS_PERMISSIONS.CHANGE);

  const [tab, setTab] = useState<Tab>('QUEUED');
  const [search, setSearch] = useState('');
  const query = useDebounce(search.trim());
  const [kind, setKind] = useState('');
  const [range, setRange] = useState<Range>('7');
  const [pageSize, setPageSize] = useState(25);
  // The page belongs to the filters it was chosen under: change any of them and
  // it is page 1 again, with no effect to reset it a render late.
  const filters = JSON.stringify([tab, query, kind, range, pageSize]);
  const [paging, setPaging] = useState({ filters, page: 1 });
  const page = paging.filters === filters ? paging.page : 1;
  const setPage = (next: number) => setPaging({ filters, page: next });

  // History is bounded by date so a page never has to count a year of postings;
  // a search looks at every date, since whoever searches knows what they want.
  const bounded = !isTodo(tab) && !query && range !== 'all';
  const params: SapPostingListParams = {
    ...(tab === 'ALL' ? {} : { status: tab }),
    ...(query ? { q: query } : {}),
    ...(kind ? { kind } : {}),
    ...(bounded ? { date_from: daysAgo(Number(range)) } : {}),
    page,
    page_size: pageSize,
  };
  const { data, isLoading, isFetching } = useSapPostings(params, { live: isTodo(tab) });
  const postings = data?.results ?? [];
  const { data: summary } = useSapPostingCounts();
  const counts = summary?.counts;
  const kinds = summary?.kinds ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-primary" /> SAP Postings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Every document the app posts to SAP, and every try at it. One waiting for SAP posts
            by itself once SAP answers again. One SAP refused stays here until its reason is
            fixed and it is sent again.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => {
              const count =
                item.value === 'QUEUED' || item.value === 'REJECTED'
                  ? counts?.[item.value]
                  : undefined;
              return (
                <Button
                  key={item.value}
                  size="sm"
                  variant={tab === item.value ? 'default' : 'outline'}
                  onClick={() => setTab(item.value)}
                >
                  {item.label}
                  {count ? <span className="ml-1.5 tabular-nums">({count})</span> : null}
                </Button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Document, invoice or SAP number…"
                aria-label="Search SAP postings"
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
              />
            </div>
            {kinds.length > 1 && (
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value)}
                aria-label="Document type"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Every document type</option>
                {kinds.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {!isTodo(tab) && (
              <select
                value={range}
                onChange={(event) => setRange(event.target.value as Range)}
                disabled={Boolean(query)}
                aria-label="How far back"
                title={query ? 'A search looks at every date' : undefined}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
              >
                {RANGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : postings.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {tab === 'QUEUED'
                ? query
                  ? 'Nothing waiting for SAP matches that.'
                  : 'Nothing is waiting for SAP.'
                : tab === 'REJECTED'
                  ? query
                    ? 'Nothing SAP refused matches that.'
                    : 'Nothing SAP refused needs attention.'
                  : query
                    ? 'No posting matches that.'
                    : bounded
                      ? 'No postings in this period.'
                      : 'No postings here yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Posting</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Tries</th>
                    <th className="px-3 py-2 font-medium">Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {postings.map((posting) => (
                    <tr
                      key={posting.id}
                      onClick={() => setSelectedId(posting.id)}
                      className="cursor-pointer border-t hover:bg-muted/40"
                    >
                      <td className="px-3 py-2">
                        <p className="font-medium">{posting.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTimeShort(posting.created_at)}
                          {posting.created_by_name ? ` · ${posting.created_by_name}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill tone={STATUS_TONE[posting.status] ?? 'neutral'} dot>
                          {posting.status_label}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{posting.attempts}</td>
                      <td className="max-w-md px-3 py-2 text-xs text-muted-foreground">
                        <span className="line-clamp-2">{latest(posting)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.count > 0 && (
            <PaginationControls
              page={data.page}
              pageSize={data.page_size}
              total={data.count}
              totalPages={data.total_pages}
              isLoading={isFetching}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>

      <SapPostingSheet
        id={selectedId}
        canAct={canAct}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}

function SapPostingSheet({
  id,
  canAct,
  onOpenChange,
}: {
  id: number | null;
  canAct: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: posting, isLoading } = useSapPosting(id);
  const retry = useRetrySapPosting();
  const cancel = useCancelSapPosting();

  async function handleRetry() {
    if (!posting) return;
    try {
      const updated = await retry.mutateAsync(posting.id);
      if (updated.status === 'POSTED') toast.success(`Posted to SAP: ${updated.title}`);
      else if (updated.status === 'QUEUED') toast.info('SAP is still not answering; it will try again.');
      else toast.error(updated.last_error || 'SAP refused it again.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not send it to SAP.'));
    }
  }

  async function handleCancel() {
    if (!posting) return;
    const reason = await promptDialog({
      title: 'Stop sending this to SAP?',
      description:
        'The app stops trying. The record itself is left as it is, so say why — for example, that it was posted by hand in SAP.',
      label: 'Reason',
      placeholder: 'Posted by hand in SAP as …',
      confirmLabel: 'Stop sending',
      destructive: true,
      required: true,
      multiline: true,
    });
    if (reason === null) return;
    try {
      await cancel.mutateAsync({ id: posting.id, reason });
      toast.success('It will not be sent again.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not cancel it.'));
    }
  }

  return (
    <Sheet open={id !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-xl">
        {isLoading || !posting ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{posting.title}</SheetTitle>
              <SheetDescription>
                {posting.company_code} · made {formatDateTimeShort(posting.created_at)}
                {posting.created_by_name ? ` by ${posting.created_by_name}` : ''}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={STATUS_TONE[posting.status] ?? 'neutral'} dot>
                {posting.status_label}
              </StatusPill>
              {posting.link && (
                <Link
                  to={posting.link}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Open the record <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {posting.status === 'POSTED' && (posting.result?.doc_nums?.length ?? 0) > 0 && (
              <p className="text-sm">
                SAP document{(posting.result.doc_nums?.length ?? 0) > 1 ? 's' : ''}:{' '}
                <span className="font-medium">{posting.result.doc_nums?.join(', ')}</span>
              </p>
            )}
            {posting.status === 'QUEUED' && posting.next_attempt_at && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Next try {formatDateTimeShort(posting.next_attempt_at)}, or
                as soon as SAP answers again.
              </p>
            )}
            {posting.status === 'CANCELLED' && (
              <p className="text-sm text-muted-foreground">
                Cancelled{posting.cancelled_by_name ? ` by ${posting.cancelled_by_name}` : ''}:{' '}
                {posting.cancel_reason}
              </p>
            )}

            {canAct && isOpen(posting.status) && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleRetry} disabled={retry.isPending}>
                  {retry.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="mr-2 h-4 w-4" />
                  )}
                  Send now
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={cancel.isPending}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-semibold">Tries</p>
              {[...posting.attempts_log].reverse().map((attempt) => (
                <AttemptCard key={attempt.number} attempt={attempt} />
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AttemptCard({ attempt }: { attempt: SapPostingAttempt }) {
  const documents = attempt.detail?.documents ?? [];
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          #{attempt.number} · {formatDateTimeShort(attempt.started_at)} ·{' '}
          {attempt.by_worker ? 'sent by the worker' : 'sent by a person'}
        </span>
        {attempt.outcome ? (
          <StatusPill tone={OUTCOME_TONE[attempt.outcome] ?? 'neutral'} dot>
            {attempt.outcome_label}
          </StatusPill>
        ) : (
          <StatusPill tone="progress" dot>
            In flight
          </StatusPill>
        )}
      </div>
      {attempt.message && <p className="text-muted-foreground">{attempt.message}</p>}
      {documents.map((doc, index) => (
        <div key={`${doc.reference}-${index}`} className="rounded bg-muted/40 p-2 text-xs">
          <p className="flex items-center gap-1.5 font-medium">
            {doc.outcome === 'failed' ? (
              <XCircle className="h-3.5 w-3.5 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            )}
            {doc.reference || 'Document'}
            {doc.invoices ? ` · invoice ${doc.invoices}` : ''}
            {doc.doc_num ? ` · SAP ${doc.doc_num}` : ''}
            {doc.outcome && doc.outcome !== 'posted' && doc.outcome !== 'failed'
              ? ` · ${doc.outcome}`
              : ''}
          </p>
          {doc.error && <p className="mt-1 text-rose-700 dark:text-rose-400">{doc.error}</p>}
          {doc.payload !== undefined && (
            <details className="mt-1">
              <summary className="cursor-pointer text-muted-foreground">What was sent</summary>
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all">
                {JSON.stringify(doc.payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
