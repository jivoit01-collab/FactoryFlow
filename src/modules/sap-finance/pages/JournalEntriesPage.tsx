/**
 * Journal Entries — SAP's journal (OJDT) with the lines behind each entry.
 *
 * Ported from SAP Portal's journal-entries page. Every posting SAP makes lands
 * here as an entry — invoices, payments, goods movements, manual entries — so
 * the filters narrow by what an accountant knows: the entry number, a
 * reference (base, Ref1–3), the SAP document type and the posting date. An
 * entry opens to its lines: account, debit, credit, memo and cost centres.
 */
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';

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
import { Input, NativeSelect, SelectOption } from '@/shared/components/ui';

import { type JournalEntry, type JournalEntryFilters, useJournalEntries } from '../api';
import { money, sapDate } from '../utils/format';

/** The document types an accountant filters by most; the list shows every type. */
const TYPES = [
  { value: '', label: 'All types' },
  { value: '30', label: 'Journal Entry' },
  { value: '13', label: 'A/R Invoice' },
  { value: '14', label: 'A/R Credit Memo' },
  { value: '18', label: 'A/P Invoice' },
  { value: '19', label: 'A/P Credit Memo' },
  { value: '24', label: 'Incoming Payment' },
  { value: '46', label: 'Outgoing Payment' },
  { value: '20', label: 'Goods Receipt PO' },
  { value: '15', label: 'Delivery' },
  { value: '59', label: 'Goods Receipt' },
  { value: '60', label: 'Goods Issue' },
  { value: '67', label: 'Inventory Transfer' },
];

const EMPTY: JournalEntryFilters = { number: '', reference: '', trans_type: '', date_from: '', date_to: '', limit: 20 };

function activeCount(filters: JournalEntryFilters): number {
  return (['number', 'reference', 'trans_type', 'date_from', 'date_to'] as const).filter(
    (key) => !!filters[key],
  ).length;
}

function EntryLines({ entry }: { entry: JournalEntry }) {
  return (
    <tr className="bg-muted/30">
      <td colSpan={8} className="px-4 py-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 text-left font-medium">#</th>
              <th className="py-1 text-left font-medium">Account</th>
              <th className="py-1 text-right font-medium">Debit</th>
              <th className="py-1 text-right font-medium">Credit</th>
              <th className="py-1 text-left font-medium">Line memo</th>
              <th className="py-1 text-left font-medium">Cost centres</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((line) => (
              <tr key={line.line_id ?? `${line.account}-${line.debit}-${line.credit}`} className="border-t">
                <td className="py-1 tabular-nums">{line.line_id}</td>
                <td className="py-1">
                  <span className="font-medium">{line.account}</span>
                  {line.account_name && <span className="text-muted-foreground"> — {line.account_name}</span>}
                  {line.short_name && line.short_name !== line.account && (
                    <span className="ml-1 text-muted-foreground">({line.short_name})</span>
                  )}
                </td>
                <td className="py-1 text-right tabular-nums">{money(line.debit, true)}</td>
                <td className="py-1 text-right tabular-nums">{money(line.credit, true)}</td>
                <td className="py-1">{line.line_memo}</td>
                <td className="py-1 text-muted-foreground">{line.cost_centers.filter(Boolean).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

export default function JournalEntriesPage() {
  const [filters, setFilters] = useState<JournalEntryFilters>(EMPTY);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const query = useJournalEntries(filters);
  const entries = query.data ?? [];

  const set = (key: keyof JournalEntryFilters, value: string | number) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const toggle = (id: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Entries"
      />

      <FilterBar
        isFetching={query.isFetching}
        activeCount={activeCount(filters)}
        onReset={() => setFilters(EMPTY)}
      >
        <FilterField label="Entry no." htmlFor="je-number">
          <Input
            id="je-number"
            inputMode="numeric"
            value={filters.number}
            onChange={(e) => set('number', e.target.value.replace(/\D/g, ''))}
            className="h-9 w-32"
          />
        </FilterField>
        <FilterField label="Reference" htmlFor="je-reference">
          <Input
            id="je-reference"
            value={filters.reference}
            onChange={(e) => set('reference', e.target.value)}
            placeholder="Base ref, Ref1–3"
            className="h-9 w-48"
          />
        </FilterField>
        <FilterField label="SAP type" htmlFor="je-type">
          <NativeSelect
            id="je-type"
            value={filters.trans_type}
            onChange={(e) => set('trans_type', e.target.value)}
            className="h-9 w-48"
          >
            {TYPES.map((type) => (
              <SelectOption key={type.value} value={type.value}>
                {type.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="From" htmlFor="je-from">
          <Input id="je-from" type="date" value={filters.date_from} onChange={(e) => set('date_from', e.target.value)} className="h-9" />
        </FilterField>
        <FilterField label="To" htmlFor="je-to">
          <Input id="je-to" type="date" value={filters.date_to} onChange={(e) => set('date_to', e.target.value)} className="h-9" />
        </FilterField>
        <FilterField label="Show" htmlFor="je-limit">
          <NativeSelect
            id="je-limit"
            value={String(filters.limit)}
            onChange={(e) => set('limit', Number(e.target.value))}
            className="h-9 w-28"
          >
            {[20, 50, 100].map((n) => (
              <SelectOption key={n} value={String(n)}>
                {n} newest
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
      </FilterBar>

      <TableCard summary={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}>
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th className="w-8" />
              <Th>Entry</Th>
              <Th>Posted</Th>
              <Th>Type</Th>
              <Th>Reference</Th>
              <Th>Memo</Th>
              <Th align="right">Debit</Th>
              <Th align="right">Credit</Th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <TableLoading colSpan={8} />
            ) : entries.length === 0 ? (
              <TableEmpty colSpan={8} message={query.isError ? 'SAP could not be read' : 'No journal entries match'} />
            ) : (
              entries.map((entry) => {
                const isOpen = open.has(entry.trans_id);
                return (
                  <Fragment key={entry.trans_id}>
                    <tr className={`${ROW_CLASSES} cursor-pointer`} onClick={() => toggle(entry.trans_id)}>
                      <Td>
                        <button
                          type="button"
                          aria-label={isOpen ? 'Hide the lines' : 'Show the lines'}
                          aria-expanded={isOpen}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </Td>
                      <Td className="font-medium tabular-nums">
                        {entry.number ?? '-'}
                        <span className="ml-1 text-xs text-muted-foreground">#{entry.trans_id}</span>
                      </Td>
                      <Td>{sapDate(entry.ref_date)}</Td>
                      <Td>{entry.trans_type_label}</Td>
                      <Td>{entry.base_ref || '-'}</Td>
                      <Td className="max-w-xs truncate" title={entry.memo}>
                        {entry.memo || '-'}
                      </Td>
                      <Td numeric>{money(entry.total_debit)}</Td>
                      <Td numeric>{money(entry.total_credit)}</Td>
                    </tr>
                    {isOpen && <EntryLines entry={entry} />}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
