/**
 * SAP Approvals — every SAP approval request that involves you, any document
 * type. Ported from SAP Portal's approvals screen.
 *
 * Three views of the same data: **Waiting on me** (pending at a stage of your
 * own SAP user — the work), **Raised by me** (what you submitted in SAP, to
 * follow up or withdraw) and **All** (both, in every status). "You" is the SAP
 * user an administrator mapped your account to for this company (Admin → SAP
 * Identities); without that mapping the page says so and lists nothing.
 *
 * Decisions are signed in SAP as your own SAP user. Buttons appear only where
 * the server says you may act (`can_decide` / `can_withdraw`). The status
 * shown is the one SAP acts on: a request SAP still lists as pending whose
 * draft's approval has ended is shown with the draft's outcome, never as work.
 */
import { AlertTriangle, Layers, RefreshCw, Search, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import { useSapApprovalRequests } from '../api/sap-approvals.queries';
import { ApprovalDetailSheet } from '../components/ApprovalDetailSheet';
import { SapActionDialog, type SapActionMode } from '../components/SapActionDialog';
import { StatusChip } from '../components/StatusChip';
import type {
  SapApprovalFilters,
  SapApprovalRequest,
  SapApprovalScope,
  SapApprovalStatus,
} from '../types';
import { money, person, shortDate, STATUS_LABELS } from '../utils/format';

const SCOPES: { key: SapApprovalScope; label: string; hint: string }[] = [
  { key: 'waiting_on_me', label: 'Waiting on me', hint: 'Pending at a stage of your SAP user' },
  { key: 'raised_by_me', label: 'Raised by me', hint: 'Requests you submitted in SAP' },
  { key: 'all', label: 'All', hint: 'Everything that involves you' },
];

const STATUSES: (SapApprovalStatus | 'ALL')[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'GENERATED',
  'CANCELLED',
  'ALL',
];

/** One character matches nearly everything; below two it is not a search. */
const MIN_SEARCH = 2;

interface Draft {
  scope: SapApprovalScope;
  status: SapApprovalStatus | 'ALL';
  object_type: string;
  date_from: string;
  date_to: string;
}

const EMPTY: Draft = {
  scope: 'waiting_on_me',
  status: 'PENDING',
  object_type: '',
  date_from: '',
  date_to: '',
};

export default function SapApprovalsPage() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim(), 400);
  const [openCode, setOpenCode] = useState<number | null>(null);
  const [action, setAction] = useState<{ mode: SapActionMode; request: SapApprovalRequest } | null>(
    null,
  );
  const [done, setDone] = useState('');

  const filters: SapApprovalFilters = useMemo(
    () => ({
      scope: draft.scope,
      // "Waiting on me" is pending by definition; the server ignores the status there.
      status: draft.scope === 'waiting_on_me' ? 'PENDING' : draft.status,
      object_type: draft.object_type,
      date_from: draft.date_from,
      date_to: draft.date_to,
      search: debounced.length >= MIN_SEARCH ? debounced : '',
    }),
    [draft, debounced],
  );
  const query = useSapApprovalRequests(filters);
  const data = query.data;
  const rows = data?.results ?? [];
  const objectTypes = data?.object_types ?? [];

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const activeCount =
    [draft.object_type, draft.date_from, draft.date_to].filter(Boolean).length +
    (search.trim() ? 1 : 0) +
    (draft.scope !== 'waiting_on_me' && draft.status !== 'PENDING' ? 1 : 0);

  const openAction = (mode: SapActionMode, request: SapApprovalRequest) => {
    setDone('');
    setAction({ mode, request });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SAP Approvals"
        description="SAP approval requests of every kind that involve you — decided as your own SAP user"
      >
        <Button
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          aria-label="Reload from SAP"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      {data && !data.identity && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{data.message}</span>
        </div>
      )}
      {data?.identity && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <UserCheck className="h-4 w-4" />
          You act as{' '}
          <span className="font-medium text-foreground">{data.identity.sap_user_code}</span> in SAP.{' '}
          {data.identity.credentials_configured
            ? 'Your SAP password is stored, so typing it is optional.'
            : 'No SAP password is stored for you — you will type it for each decision; it is never saved.'}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {SCOPES.map((scope) => (
          <button
            key={scope.key}
            type="button"
            title={scope.hint}
            onClick={() => set('scope', scope.key)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              draft.scope === scope.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {scope.label}
            {draft.scope === scope.key && !query.isLoading && (
              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">
                {rows.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <FilterBar
        isFetching={query.isFetching}
        activeCount={activeCount}
        onReset={() => {
          setDraft((current) => ({ ...EMPTY, scope: current.scope }));
          setSearch('');
        }}
      >
        <FilterField label="Search" htmlFor="sap-approvals-search">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="sap-approvals-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Request, draft, party, reference, item, person"
              className="h-9 w-72 pl-8"
            />
          </div>
        </FilterField>
        <FilterField label="Status" htmlFor="sap-approvals-status">
          <NativeSelect
            id="sap-approvals-status"
            value={draft.scope === 'waiting_on_me' ? 'PENDING' : draft.status}
            disabled={draft.scope === 'waiting_on_me'}
            onChange={(e) => set('status', e.target.value as Draft['status'])}
            className="h-9 w-36"
          >
            {STATUSES.map((status) => (
              <SelectOption key={status} value={status}>
                {status === 'ALL' ? 'Every status' : STATUS_LABELS[status]}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Document" htmlFor="sap-approvals-type">
          <NativeSelect
            id="sap-approvals-type"
            value={draft.object_type}
            onChange={(e) => set('object_type', e.target.value)}
            className="h-9 w-48"
          >
            <SelectOption value="">Every document type</SelectOption>
            {objectTypes.map((type) => (
              <SelectOption key={type.code} value={type.code}>
                {type.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Raised from" htmlFor="sap-approvals-from">
          <Input
            id="sap-approvals-from"
            type="date"
            value={draft.date_from}
            onChange={(e) => set('date_from', e.target.value)}
            className="h-9"
          />
        </FilterField>
        <FilterField label="to" htmlFor="sap-approvals-to">
          <Input
            id="sap-approvals-to"
            type="date"
            value={draft.date_to}
            onChange={(e) => set('date_to', e.target.value)}
            className="h-9"
          />
        </FilterField>
      </FilterBar>

      {done && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400">
          {done}
        </div>
      )}
      {data?.truncated && (
        <p className="text-sm text-muted-foreground">
          Showing the newest {data.limit}. Narrow the filters to see older requests.
        </p>
      )}

      <TableCard summary={`${rows.length} ${rows.length === 1 ? 'request' : 'requests'}`}>
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Request</Th>
              <Th>Party</Th>
              <Th align="right">Amount</Th>
              <Th>Status</Th>
              <Th>{draft.scope === 'waiting_on_me' ? 'Stage' : 'Waiting on / decided by'}</Th>
              <Th>Raised</Th>
              <Th align="right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <TableLoading colSpan={7} />
            ) : rows.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message={
                  query.isError
                    ? 'SAP could not be read. Try again in a moment.'
                    : !data?.identity
                      ? 'Nothing to show until your account is mapped to a SAP user.'
                      : draft.scope === 'waiting_on_me'
                        ? 'Nothing in SAP is waiting on you.'
                        : 'No approval requests match.'
                }
              />
            ) : (
              rows.map((row) => (
                <tr
                  key={row.wdd_code}
                  className={`${ROW_CLASSES} cursor-pointer align-top`}
                  onClick={() => setOpenCode(row.wdd_code)}
                >
                  <Td>
                    <div className="font-medium">{row.object_type_label}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      #{row.wdd_code}
                      {row.draft_entry ? ` · draft ${row.draft_entry}` : ''}
                    </div>
                  </Td>
                  <Td className="max-w-[16rem]">
                    <div className="truncate" title={row.document.party_name ?? undefined}>
                      {row.document.party_name ?? '—'}
                    </div>
                    {row.document.reference && (
                      <div className="truncate text-xs text-muted-foreground">
                        ref {row.document.reference}
                      </div>
                    )}
                  </Td>
                  <Td numeric>{money(row.document.total_amount, row.document.currency)}</Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <StatusChip status={row.status} stale={row.stale_pending} />
                      {row.request_count > 1 && (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-400"
                          title="SAP opened one request per matching approval template; the document is released only when all are approved"
                        >
                          <Layers className="h-3 w-3" />
                          {row.request_count} requests
                          {row.pending_request_count > 0 && ` · ${row.pending_request_count} open`}
                        </span>
                      )}
                      {row.is_duplicate && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3" />
                          Already posted
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td className="max-w-[12rem]">
                    {row.status === 'PENDING' ? (
                      <div className="truncate">
                        {person(row.approver_code, row.approver_name)}
                        {row.is_mine && (
                          <span className="ml-1 rounded-full bg-blue-100 px-1.5 text-xs text-blue-800 dark:bg-blue-500/15 dark:text-blue-400">
                            you
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="truncate">{person(row.decided_by, row.decided_by_name)}</div>
                    )}
                    {row.template_name && (
                      <div className="truncate text-xs text-muted-foreground">
                        {row.template_name}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div>{shortDate(row.created_at)}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {row.is_originator ? 'you' : person(row.originator_code, row.originator_name)}
                    </div>
                  </Td>
                  <Td align="right" onClick={(e) => e.stopPropagation()}>
                    {row.can_decide || row.can_withdraw ? (
                      <div className="flex justify-end gap-2">
                        {row.can_decide && (
                          <>
                            <Button size="sm" onClick={() => openAction('approve', row)}>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAction('reject', row)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {row.can_withdraw && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAction('withdraw', row)}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <ApprovalDetailSheet
        wddCode={openCode}
        onOpenChange={(open) => !open && setOpenCode(null)}
        onAction={openAction}
      />
      <SapActionDialog
        request={action?.request ?? null}
        mode={action?.mode ?? null}
        onClose={() => setAction(null)}
        onDone={(message) => {
          setAction(null);
          setOpenCode(null);
          setDone(message);
        }}
      />
    </div>
  );
}
