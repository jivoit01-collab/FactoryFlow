/**
 * Chart of Accounts — SAP's G/L tree, as SAP's own window lays it out.
 *
 * Ported from SAP Portal's chart-of-accounts page. Accounts sit in ten drawers
 * (Assets, Liabilities, …) and nest under title accounts. Titles carry no
 * balance of their own; the figure shown for one is the sum of every postable
 * account beneath it, which is what makes a collapsed tree readable. A search
 * keeps the path down to every hit and opens it.
 */
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

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
import { Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { type ChartAccount, useChartOfAccounts } from '../api';
import { money } from '../utils/format';

export default function ChartOfAccountsPage() {
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<number | undefined>(undefined);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const needle = search.trim().length >= 2 ? search.trim() : '';
  const query = useChartOfAccounts(needle, drawer);
  const accounts = useMemo(() => query.data?.accounts ?? [], [query.data]);

  /** Parent code -> its children, in SAP's code order. */
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, ChartAccount[]>();
    const codes = new Set(accounts.map((a) => a.code));
    for (const account of accounts) {
      // A parent outside the current slice (another drawer) roots the account.
      const key = account.parent && codes.has(account.parent) ? account.parent : null;
      map.set(key, [...(map.get(key) ?? []), account]);
    }
    return map;
  }, [accounts]);

  const toggle = (code: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  // Walk the tree depth-first; a search shows every path it kept, open.
  const rows: { account: ChartAccount; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const account of childrenOf.get(parent) ?? []) {
      rows.push({ account, depth });
      if (needle || !collapsed.has(account.code)) walk(account.code, depth + 1);
    }
  };
  walk(null, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
      />

      <div className="space-y-3">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search accounts"
            placeholder="Search by account code or name"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDrawer(undefined)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              drawer === undefined ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            All drawers
          </button>
          {(query.data?.drawers ?? []).map((d) => (
            <button
              key={d.id}
              type="button"
              title={`${d.postable} postable of ${d.count} · total ${money(d.total)}`}
              onClick={() => setDrawer(d.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                drawer === d.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {d.label}
              <span className="ml-1.5 tabular-nums opacity-70">{d.count}</span>
            </button>
          ))}
        </div>
      </div>

      <TableCard
        summary={
          query.data
            ? `${accounts.length} shown · ${query.data.postable} postable of ${query.data.total} accounts`
            : undefined
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Account</Th>
              <Th>Type</Th>
              <Th align="right">Balance</Th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <TableLoading colSpan={3} />
            ) : rows.length === 0 ? (
              <TableEmpty colSpan={3} message={query.isError ? 'SAP could not be read' : 'No account matches'} />
            ) : (
              rows.map(({ account, depth }) => {
                const hasChildren = (childrenOf.get(account.code) ?? []).length > 0;
                const open = needle || !collapsed.has(account.code);
                return (
                  <tr key={account.code} className={cn(ROW_CLASSES, account.match && 'bg-amber-50 dark:bg-amber-500/10')}>
                    <Td>
                      <div className="flex items-center gap-1" style={{ paddingLeft: depth * 18 }}>
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggle(account.code)}
                            aria-label={open ? `Collapse ${account.name}` : `Expand ${account.name}`}
                            aria-expanded={!!open}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                          >
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        ) : (
                          <span className="inline-block w-5" />
                        )}
                        <span className={cn('tabular-nums', !account.postable && 'font-semibold')}>{account.code}</span>
                        <span className={cn(!account.postable && 'font-semibold')}>— {account.name}</span>
                        {!account.postable && account.children > 0 && (
                          <span className="text-xs text-muted-foreground">({account.children})</span>
                        )}
                        {account.frozen && <StatusPill tone="warn">Frozen</StatusPill>}
                      </div>
                    </Td>
                    <Td className="text-muted-foreground">{account.postable ? account.type_label : 'Title'}</Td>
                    <Td numeric className={cn(!account.postable && 'font-semibold')}>
                      {money(account.postable ? account.balance : account.rollup)}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
