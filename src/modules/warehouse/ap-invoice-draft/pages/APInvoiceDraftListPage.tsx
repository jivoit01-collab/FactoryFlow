import { FileCheck2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AP_INVOICE_DRAFT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { formatDateTimeShort, formatDay } from '@/shared/utils';

import { useAPInvoiceDrafts } from '../api';
import { NewAPInvoiceDraftDialog } from '../components/NewAPInvoiceDraftDialog';
import { SapDraftPill } from '../components/SapDraftPill';
import type { APInvoiceDraftListItem } from '../types';

function rupees(value: string | null) {
  return value == null
    ? '—'
    : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** Vendor bills put into SAP as A/P invoice drafts against their GRPOs. */
export default function APInvoiceDraftListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(AP_INVOICE_DRAFT_PERMISSIONS.CREATE);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const debounced = useDebounce(search, 300);
  const { data: entries = [], isFetching } = useAPInvoiceDrafts(
    debounced ? { search: debounced } : undefined,
  );

  const open = (entry: APInvoiceDraftListItem) =>
    navigate(`/warehouse/ap-invoice-drafts/${entry.id}`);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="A/P Invoice Drafts"
        description="Vendor bills put into SAP as A/P invoice drafts against their GRPO."
        icon={FileCheck2}
        accent="teal"
        backTo="/warehouse"
        backLabel="Warehouse"
      >
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add new entry
          </Button>
        )}
      </PageHeader>

      <FilterBar isFetching={isFetching} onReset={() => setSearch('')}>
        <FilterField label="Search" htmlFor="ap-invoice-draft-search">
          <Input
            id="ap-invoice-draft-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Entry, GRPO, bill no. or vendor"
          />
        </FilterField>
      </FilterBar>

      <TableCard summary={`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`}>
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Entry</Th>
              <Th>GRPO</Th>
              <Th>Vendor</Th>
              <Th>Bill no.</Th>
              <Th align="right">GRPO total</Th>
              <Th>SAP draft</Th>
            </tr>
          </thead>
          <tbody>
            {!entries.length ? (
              <TableEmpty
                colSpan={6}
                message={isFetching ? 'Loading…' : 'No A/P invoice drafts yet'}
                icon={FileCheck2}
              />
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={`${ROW_CLASSES} cursor-pointer`}
                  tabIndex={0}
                  onClick={() => open(entry)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      open(entry);
                    }
                  }}
                >
                  <Td>
                    <span className="font-medium">{entry.entry_no}</span>
                    <p className="text-xs text-muted-foreground">
                      {entry.created_by_name} · {formatDateTimeShort(entry.created_at)}
                    </p>
                  </Td>
                  <Td>
                    {entry.grpo_doc_num}
                    <p className="text-xs text-muted-foreground">{formatDay(entry.grpo_date)}</p>
                  </Td>
                  <Td className="max-w-[220px] truncate">{entry.vendor_name}</Td>
                  <Td>{entry.grpo_reference || '—'}</Td>
                  <Td numeric>{rupees(entry.grpo_total)}</Td>
                  <Td>
                    <SapDraftPill entry={entry} />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <NewAPInvoiceDraftDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
