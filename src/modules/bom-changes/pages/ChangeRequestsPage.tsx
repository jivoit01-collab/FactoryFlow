/**
 * Change Requests — every BOM change raised in this company, by status.
 *
 * SAP Portal kept these in two places: "My Requests" on the BOM page and the
 * BOM section of its approvals page (a "My turn" filter first, then one filter
 * per status). Both are this list. "My turn" is the server's own reading —
 * the requests at a level the caller signs and has not signed yet — so it
 * follows the configured number of levels without the page knowing them.
 */
import { ClipboardList, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { BOM_CHANGES_APPROVER_ACCESS, BOM_CHANGES_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  PageHeader,
  ROW_CLASSES,
  StatusPill,
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
import { cn, formatDateTimeShort } from '@/shared/utils';

import { type BomKind, useBomWorkflow, useChangeRequests } from '../api';
import { REQUEST_TABS, STATUS_TONE, tabCount } from '../utils/status';

export default function ChangeRequestsPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const isApprover = hasAnyPermission(BOM_CHANGES_APPROVER_ACCESS);
  const canAsk = hasAnyPermission([
    BOM_CHANGES_PERMISSIONS.REQUEST,
    BOM_CHANGES_PERMISSIONS.PUSH_DIRECTLY,
  ]);
  const tabs = useMemo(
    () => REQUEST_TABS.filter((tab) => !tab.approversOnly || isApprover),
    [isApprover],
  );

  const [params, setParams] = useSearchParams();
  const tabId = tabs.some((tab) => tab.id === params.get('tab')) ? params.get('tab') : tabs[0]?.id;
  const tab = tabs.find((candidate) => candidate.id === tabId) ?? tabs[0];
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<BomKind | ''>('');
  const debounced = useDebounce(search.trim(), 300);

  const workflow = useBomWorkflow();
  const list = useChangeRequests({
    ...tab.filters,
    kind: kind || undefined,
    search: debounced || undefined,
  });
  const rows = list.data?.results ?? [];

  const chooseTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="BOM change requests"
        description={
          workflow.data
            ? `A new BOM or a change to one, approved in ${workflow.data.levels} levels — the last writes it to SAP`
            : 'A new BOM or a change to one, approved level by level, then written to SAP'
        }
        icon={ClipboardList}
        accent="indigo"
      >
        {canAsk && (
          <Button onClick={() => navigate('/bom-changes/requests/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New request
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Request status">
        {tabs.map((candidate) => {
          const count = tabCount(candidate, list.data?.counts);
          const active = candidate.id === tab.id;
          return (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => chooseTab(candidate.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card hover:bg-muted',
              )}
            >
              {candidate.label}
              {count !== null && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs tabular-nums',
                    active ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                    candidate.id === 'my-turn' &&
                      count > 0 &&
                      !active &&
                      'bg-emerald-100 text-emerald-700',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <TableCard
        summary={
          list.isFetching && !list.isLoading
            ? 'Loading…'
            : `${rows.length} ${rows.length === 1 ? 'request' : 'requests'}`
        }
        actions={
          <>
            <NativeSelect
              aria-label="Kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as BomKind | '')}
              className="h-9 w-44"
            >
              <SelectOption value="">New BOMs and changes</SelectOption>
              <SelectOption value="CREATE">New BOMs</SelectOption>
              <SelectOption value="UPDATE">Changes</SelectOption>
            </NativeSelect>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Item code or name"
                aria-label="Search requests"
                className="h-9 w-56 pl-8"
              />
            </div>
          </>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>No.</Th>
              <Th>Kind</Th>
              <Th>BOM</Th>
              <Th>Status</Th>
              <Th align="right">Lines</Th>
              <Th>Raised by</Th>
              <Th>Raised</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <TableLoading colSpan={8} />
            ) : rows.length === 0 ? (
              <TableEmpty
                colSpan={8}
                message={tab.id === 'my-turn' ? 'Nothing waiting for you' : 'No requests here'}
              />
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(ROW_CLASSES, 'cursor-pointer')}
                  onClick={() => navigate(`/bom-changes/requests/${row.id}`)}
                >
                  <Td numeric className="text-muted-foreground">
                    {row.id}
                  </Td>
                  <Td>
                    <StatusPill tone={row.kind === 'CREATE' ? 'done' : 'info'}>
                      {row.kind_label}
                    </StatusPill>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs font-semibold">{row.item_code}</span>
                    <span className="block text-muted-foreground">{row.item_name || '—'}</span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusPill tone={STATUS_TONE[row.status]} dot>
                        {row.status_label}
                      </StatusPill>
                      {(row.can_approve || row.can_reject) && (
                        <StatusPill tone={row.can_push ? 'warn' : 'done'}>
                          {row.can_push ? 'Your turn — writes SAP' : 'Your turn'}
                        </StatusPill>
                      )}
                    </div>
                    {row.awaiting && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {row.awaiting}
                      </span>
                    )}
                    {row.push_error && row.status !== 'SAP_PUSHED' && (
                      <span className="mt-0.5 block text-xs text-destructive">
                        Last push failed
                      </span>
                    )}
                  </Td>
                  <Td numeric>{row.line_count}</Td>
                  <Td>
                    {row.submitted_by || '—'}
                    {row.legacy_portal_id && (
                      <span className="block text-xs text-muted-foreground">
                        SAP Portal #{row.legacy_portal_id}
                      </span>
                    )}
                  </Td>
                  <Td>{formatDateTimeShort(row.submitted_at)}</Td>
                  <Td align="right">
                    <Link
                      to={`/bom-changes/requests/${row.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Open
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
