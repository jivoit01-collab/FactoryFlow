import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, FileCheck2, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { OMS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils';

import { INVOICE_APPROVAL_QUERY_KEYS, useInvoiceList } from '../api/invoice-approval.queries';
import { InvoiceDetailSheet } from '../components/InvoiceDetailSheet';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import { INVOICE_TABS, type InvoiceLog, type InvoiceTab } from '../types';

const TAB_LABELS: Record<InvoiceTab, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  EDITED: 'Edited',
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
          <p className="truncate font-medium">{invoice.party_name}</p>
          <p className="text-sm text-muted-foreground">
            SO {invoice.so_number} · {invoice.warehouse || '—'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-semibold tabular-nums">{amount(invoice.total_amount)}</span>
          <InvoiceStatusBadge status={invoice.status} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceList({
  status,
  search,
  onSelect,
}: {
  status: InvoiceTab;
  search: string;
  onSelect: (invoice: InvoiceLog) => void;
}) {
  const { data, isLoading, isError } = useInvoiceList(status);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.so_number, row.party_name, row.warehouse, row.branch].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [data, search]);

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading invoices…</p>;
  }
  if (isError) {
    return (
      <p className="py-8 text-center text-sm text-red-600">
        Could not load invoices. Please try again.
      </p>
    );
  }
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <FileCheck2 className="h-8 w-8" />
        <p className="text-sm">No {TAB_LABELS[status].toLowerCase()} invoices.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((invoice) => (
        <InvoiceRow key={invoice.id} invoice={invoice} onSelect={onSelect} />
      ))}
    </div>
  );
}

/**
 * Factory Invoice Approval — the approver reviews invoices raised in OMS, checks them
 * against physical stock at the warehouse, and approves or rejects each one. Four tabs
 * mirror the OMS invoice-log statuses; Pending/Edited are actionable, Approved/Rejected
 * are read-only.
 */
export default function InvoiceApprovalPage() {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(OMS_PERMISSIONS.APPROVE_INVOICE);
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<InvoiceTab>('PENDING');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InvoiceLog | null>(null);

  return (
    <div className="space-y-4">
      <DashboardHeader
        title="Invoice Approval"
        description="Verify invoices raised in OMS against physical stock, then approve or reject."
      >
        <Button
          variant="outline"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: INVOICE_APPROVAL_QUERY_KEYS.all })
          }
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </DashboardHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search SO number or party…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

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
            <InvoiceList status={value} search={search} onSelect={setSelected} />
          </TabsContent>
        ))}
      </Tabs>

      <InvoiceDetailSheet
        invoice={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        canApprove={canApprove}
      />
    </div>
  );
}
