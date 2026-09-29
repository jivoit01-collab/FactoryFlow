import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, FileCheck2, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { INVOICE_APPROVAL_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { useWarehouseScope } from '@/modules/warehouse/api';
import { WarehouseSelect } from '@/modules/warehouse/grpo/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Input,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';
import { formatCurrency, getErrorMessage } from '@/shared/utils';

import {
  INVOICE_APPROVAL_QUERY_KEYS,
  useInvoiceList,
  usePendingCount,
} from '../api/invoice-approval.queries';
import { InvoiceDetailSheet } from '../components/InvoiceDetailSheet';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import {
  INVOICE_TABS,
  invoiceLabel,
  type InvoiceLog,
  type InvoiceTab,
  type ToggleSource,
} from '../types';
import { useSelectedSource } from '../useSelectedSource';
import { useSelectedWarehouse } from '../useSelectedWarehouse';

const TAB_LABELS: Record<InvoiceTab, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

function amount(value?: string | null) {
  if (value == null || value === '') return '-';
  const n = Number(value);
  return Number.isNaN(n) ? value : formatCurrency(n);
}

function InvoiceRow({
  invoice,
  onSelect,
}: {
  invoice: InvoiceLog;
  onSelect: (invoice: InvoiceLog) => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(invoice)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(invoice);
        }
      }}
      className="cursor-pointer transition-colors hover:bg-muted/50"
    >
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{invoice.party_name}</span>
            {invoice.source === 'APP' ? (
              <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-500/15 dark:text-sky-300">
                Factory app
              </span>
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">
            {invoice.source === 'APP'
              ? `${invoiceLabel(invoice)} · ${invoice.warehouse || '—'}${
                  invoice.created_by ? ` · by ${invoice.created_by}` : ''
                }`
              : `SO ${invoice.so_number} · ${invoice.warehouse || '—'}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-right text-sm font-semibold tabular-nums">
            {amount(invoice.total_amount)}
            {invoice.amount_is_pre_tax ? (
              <span className="block text-[10px] font-normal text-muted-foreground">
                before tax
              </span>
            ) : null}
          </span>
          <InvoiceStatusBadge status={invoice.status} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * One tab's rows: the factory app's held bills for this warehouse first — they
 * have a customer waiting at the counter — then whichever of OMS / SAP the
 * toggle shows. Each row carries its source, because the ids are unrelated.
 */
function InvoiceList({
  source,
  warehouse,
  status,
  search,
  onSelect,
}: {
  source: ToggleSource;
  warehouse: string;
  status: InvoiceTab;
  search: string;
  onSelect: (invoice: InvoiceLog) => void;
}) {
  const main = useInvoiceList(source, warehouse, status);
  const held = useInvoiceList('APP', warehouse, status);

  const filtered = useMemo(() => {
    const rows: InvoiceLog[] = [
      ...(held.data ?? []).map((row) => ({ ...row, source: 'APP' as const })),
      ...(main.data ?? []).map((row) => ({ ...row, source })),
    ];
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [
        row.so_number,
        row.party_name,
        row.warehouse,
        row.branch,
        row.created_by,
        row.posting_id,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [held.data, main.data, source, search]);

  if (main.isLoading || held.isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading invoices…</p>;
  }

  // Show what the backend said — "the OMS module is not enabled" is a config
  // problem an admin can fix, and reads nothing like a transient outage. One
  // source failing never hides the other's rows.
  const errors = [
    main.isError
      ? getErrorMessage(main.error, `Could not load invoices from ${source}. Please try again.`)
      : null,
    held.isError
      ? getErrorMessage(held.error, 'Could not load the factory app bills. Please try again.')
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-2">
      {errors.map((message) => (
        <p key={message} className="py-2 text-center text-sm text-red-600">
          {message}
        </p>
      ))}
      {filtered.length === 0 && errors.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <FileCheck2 className="h-8 w-8" />
          <p className="text-sm">
            No {TAB_LABELS[status].toLowerCase()} invoices in {source} or the factory app.
          </p>
        </div>
      ) : null}
      {filtered.map((invoice) => (
        <InvoiceRow key={`${invoice.source}:${invoice.id}`} invoice={invoice} onSelect={onSelect} />
      ))}
    </div>
  );
}

/**
 * Factory bills waiting in the approver's OTHER warehouses. A manager of four
 * warehouses has one selected at a time, and a counter bill held for another
 * of them would otherwise sit unseen while the customer waits.
 */
function HeldElsewhere({
  warehouse,
  onPick,
}: {
  warehouse: string;
  onPick: (code: string) => void;
}) {
  const { data } = usePendingCount('APP', warehouse);
  const elsewhere = Object.entries(data?.by_warehouse ?? {})
    .filter(([code, count]) => count > 0 && code !== warehouse.toUpperCase())
    .sort(([a], [b]) => a.localeCompare(b));
  if (elsewhere.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <span>Factory app bills waiting for you in:</span>
      {elsewhere.map(([code, count]) => (
        <Button key={code} size="sm" variant="outline" className="h-7" onClick={() => onPick(code)}>
          {code} ({count})
        </Button>
      ))}
    </div>
  );
}

/**
 * Factory Invoice Approval — the approver reviews A/R invoices awaiting approval,
 * checks them against physical stock at the warehouse, and approves or rejects
 * each one in the system it came from. Two toggled sources: OMS invoice logs
 * (the default view) and, behind the "Show SAP approvals" toggle, the drafts
 * held by SAP's own approval procedure. Under either, the factory app's own
 * bills raised from this warehouse by someone who does not manage it are
 * listed first; approving the last warehouse on one creates it in SAP. Three
 * tabs mirror the approval states; Pending is actionable, Approved/Rejected are
 * read-only.
 */
export default function InvoiceApprovalPage() {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(INVOICE_APPROVAL_PERMISSIONS.APPROVE_INVOICE);
  const queryClient = useQueryClient();

  const [warehouse, setWarehouse] = useSelectedWarehouse();
  const [source, setSource] = useSelectedSource();
  const [tab, setTab] = useState<InvoiceTab>('PENDING');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InvoiceLog | null>(null);

  // Scope the page to the warehouses this user manages (warehouse.UserWarehouse).
  // Superusers (and any user whose scope can't be determined) see the full list.
  const scope = useWarehouseScope();
  const restrictToCodes = scope.unrestricted ? null : scope.codes;

  // Drop a remembered selection the user no longer manages, so we never query —
  // and the backend never 403s on — an out-of-scope warehouse.
  useEffect(() => {
    if (
      scope.scopeKnown &&
      !scope.unrestricted &&
      warehouse &&
      !scope.codes.has(warehouse.toUpperCase())
    ) {
      setWarehouse('');
    }
  }, [scope.scopeKnown, scope.unrestricted, scope.codes, warehouse, setWarehouse]);

  return (
    <div className="space-y-4">
      <DashboardHeader
        title="Invoice Approval"
        description={
          source === 'OMS'
            ? 'Verify invoices awaiting approval in OMS and the factory app against physical stock, then approve or reject.'
            : 'Verify invoices awaiting approval in SAP and the factory app against physical stock, then approve or reject.'
        }
      >
        <Button
          variant="outline"
          disabled={!warehouse}
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: INVOICE_APPROVAL_QUERY_KEYS.all })
          }
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </DashboardHeader>

      {scope.managesNothing ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <FileCheck2 className="h-8 w-8" />
          <p className="max-w-md text-sm">
            You are not set as the manager of any warehouse in this company, so there are no
            invoices for you to approve. An administrator assigns this on Admin → Warehouse
            Managers.
          </p>
        </div>
      ) : (
        <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-72">
          <WarehouseSelect
            value={warehouse}
            onChange={setWarehouse}
            label="Warehouse"
            placeholder="Select warehouse"
            required
            restrictToCodes={restrictToCodes}
          />
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search SO number or party…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={!warehouse}
          />
        </div>
        <div className="flex items-center gap-2 pb-1 sm:ml-auto">
          <Switch
            id="invoice-source"
            checked={source === 'SAP'}
            onChange={(checked) => {
              // The two sources have unrelated ids, so never carry a selected
              // invoice across the switch.
              setSelected(null);
              setSource(checked ? 'SAP' : 'OMS');
            }}
          />
          <label htmlFor="invoice-source" className="cursor-pointer text-sm">
            Show SAP approvals
          </label>
        </div>
      </div>

      <HeldElsewhere
        warehouse={warehouse}
        onPick={(code) => {
          setSelected(null);
          setTab('PENDING');
          setWarehouse(code);
        }}
      />

      {!warehouse ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <FileCheck2 className="h-8 w-8" />
          <p className="text-sm">Select a warehouse to load invoices for approval.</p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(value) => setTab(value as InvoiceTab)}>
          <TabsList>
            {INVOICE_TABS.map((value) => (
              <TabsTrigger key={value} value={value}>
                {TAB_LABELS[value]}
              </TabsTrigger>
            ))}
          </TabsList>
          {INVOICE_TABS.map((value) => (
            <TabsContent key={value} value={value} className="mt-4">
              <InvoiceList
                source={source}
                warehouse={warehouse}
                status={value}
                search={search}
                onSelect={setSelected}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
        </>
      )}

      <InvoiceDetailSheet
        invoice={selected}
        source={selected?.source ?? source}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        canApprove={canApprove}
      />
    </div>
  );
}
