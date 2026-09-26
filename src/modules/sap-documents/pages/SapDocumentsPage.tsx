/**
 * SAP Documents — SAP Portal's document browser (public/documents.html).
 *
 * Pick a type (purchase, sales, inventory, finance, drafts), narrow by document
 * number, partner, posting date and status where the type has one, page through
 * newest first, and open a document for its header, lines, amounts, journal and
 * attachments. Everything is read live from SAP for the company in the switcher.
 */
import { ChevronLeft, ChevronRight, FileSearch, Paperclip } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  StatusPill,
  type StatusTone,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';

import {
  type DocumentFilters,
  type DocumentKind,
  type DocumentRow,
  type DocumentTypeInfo,
  useDocumentList,
  useDocumentTypes,
} from '../api';
import { DocumentDetailDialog } from '../components/DocumentDetailDialog';
import { money, sapDate } from '../utils/format';

const DEFAULT_TYPE = 'PurchaseOrders';
const GROUP_ORDER = ['Purchase', 'Sales', 'Inventory', 'Finance', 'Drafts'];
const STATUS_TONE: Record<string, StatusTone> = { open: 'info', closed: 'done', cancelled: 'blocked' };
const STATUS_LABEL: Record<string, string> = { open: 'Open', closed: 'Closed', cancelled: 'Cancelled' };

type FilterForm = Required<Pick<DocumentFilters, 'number' | 'partner' | 'date_from' | 'date_to' | 'status'>>;
const EMPTY: FilterForm = { number: '', partner: '', date_from: '', date_to: '', status: '' };

function activeCount(filters: FilterForm): number {
  return Object.values(filters).filter(Boolean).length;
}

/** The columns a kind shows, after the number and date. */
function columns(kind: DocumentKind): string[] {
  switch (kind) {
    case 'journal':
      return ['Memo', 'Reference'];
    case 'transfer':
      return ['Route', 'Remarks', 'Status'];
    case 'payment':
    case 'payment_draft':
      return ['Vendor', 'Approval', 'Cash + transfer'];
    case 'draft':
      return ['Partner', 'Draft of', 'Status', 'Total'];
    default:
      return ['Partner', 'Status', 'Total'];
  }
}

function Status({ row }: { row: DocumentRow }) {
  if (!row.status) return <span className="text-muted-foreground">-</span>;
  return (
    <StatusPill tone={STATUS_TONE[row.status]} dot>
      {STATUS_LABEL[row.status]}
    </StatusPill>
  );
}

function Partner({ row }: { row: DocumentRow }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium" title={row.card_name}>
        {row.card_name || row.card_code || '-'}
      </div>
      {row.card_code && <div className="text-xs text-muted-foreground">{row.card_code}</div>}
    </div>
  );
}

function Cells({ kind, row }: { kind: DocumentKind; row: DocumentRow }) {
  switch (kind) {
    case 'journal':
      return (
        <>
          <Td className="max-w-md truncate" title={row.memo}>
            {row.memo || '-'}
          </Td>
          <Td>{row.reference || '-'}</Td>
        </>
      );
    case 'transfer':
      return (
        <>
          <Td className="whitespace-nowrap">
            {row.from_warehouse || '?'} → {row.to_warehouse || '?'}
          </Td>
          <Td className="max-w-xs truncate" title={row.comments}>
            {row.comments || '-'}
          </Td>
          <Td>
            <Status row={row} />
          </Td>
        </>
      );
    case 'payment':
    case 'payment_draft':
      return (
        <>
          <Td>
            <Partner row={row} />
          </Td>
          <Td>{row.approval_status || '-'}</Td>
          <Td numeric title={row.total_note}>
            {money(row.total)}
          </Td>
        </>
      );
    default:
      return (
        <>
          <Td>
            <Partner row={row} />
          </Td>
          {kind === 'draft' && <Td>{row.object_label || '-'}</Td>}
          <Td>
            <Status row={row} />
          </Td>
          <Td numeric>{money(row.total)}</Td>
        </>
      );
  }
}

function TypePicker({
  types,
  value,
  onChange,
}: {
  types: DocumentTypeInfo[];
  value: string;
  onChange: (key: string) => void;
}) {
  const groups = GROUP_ORDER.map((group) => ({ group, items: types.filter((t) => t.group === group) })).filter(
    (g) => g.items.length,
  );
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-xl border bg-card p-4 shadow-sm">
      {groups.map(({ group, items }) => (
        <div key={group} className="space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${group} documents`}>
            {items.map((type) => (
              <Button
                key={type.key}
                size="sm"
                variant={type.key === value ? 'default' : 'outline'}
                role="radio"
                aria-checked={type.key === value}
                onClick={() => onChange(type.key)}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SapDocumentsPage() {
  const types = useDocumentTypes();
  const [typeKey, setTypeKey] = useState(DEFAULT_TYPE);
  const [form, setForm] = useState<FilterForm>(EMPTY);
  const [applied, setApplied] = useState<FilterForm>(EMPTY);
  const [top, setTop] = useState(20);
  const [skip, setSkip] = useState(0);
  const [opened, setOpened] = useState<number | null>(null);

  const typeInfo = useMemo(() => (types.data ?? []).find((t) => t.key === typeKey), [types.data, typeKey]);
  const kind: DocumentKind = typeInfo?.kind ?? 'marketing';
  const filters: DocumentFilters = { ...applied, top, skip };
  const list = useDocumentList(typeInfo ? typeKey : '', filters);
  const rows = list.data?.results ?? [];
  const extra = columns(kind);
  const colSpan = 3 + extra.length;

  const set = (key: keyof FilterForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const search = () => {
    setApplied(form);
    setSkip(0);
  };
  const reset = () => {
    setForm(EMPTY);
    setApplied(EMPTY);
    setSkip(0);
  };
  const chooseType = (key: string) => {
    setTypeKey(key);
    // A number or status means nothing on another type; the partner and dates carry over.
    const next = { ...form, number: '', status: '' };
    setForm(next);
    setApplied({ ...applied, number: '', status: '' });
    setSkip(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SAP Documents"
        description="Purchase and sales documents, transfers, journals, payments and drafts, read live from SAP"
        icon={FileSearch}
      />

      {types.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the document types…</p>
      ) : (
        <TypePicker types={types.data ?? []} value={typeKey} onChange={chooseType} />
      )}

      <FilterBar isFetching={list.isFetching} activeCount={activeCount(applied)} onReset={reset}>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            search();
          }}
        >
          <FilterField label={typeInfo?.filters.number ?? 'Document no.'} htmlFor="doc-number">
            <Input
              id="doc-number"
              inputMode="numeric"
              value={form.number}
              onChange={(e) => set('number', e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 626074136"
              className="h-9 w-40"
            />
          </FilterField>
          {typeInfo?.filters.partner !== false && (
            <FilterField label="Vendor / customer" htmlFor="doc-partner">
              <Input
                id="doc-partner"
                value={form.partner}
                onChange={(e) => set('partner', e.target.value)}
                placeholder="Code or name"
                className="h-9 w-52"
              />
            </FilterField>
          )}
          <FilterField label="From" htmlFor="doc-from">
            <Input
              id="doc-from"
              type="date"
              value={form.date_from}
              onChange={(e) => set('date_from', e.target.value)}
              className="h-9"
            />
          </FilterField>
          <FilterField label="To" htmlFor="doc-to">
            <Input
              id="doc-to"
              type="date"
              value={form.date_to}
              onChange={(e) => set('date_to', e.target.value)}
              className="h-9"
            />
          </FilterField>
          {!!typeInfo?.filters.statuses.length && (
            <FilterField label="Status" htmlFor="doc-status">
              <NativeSelect
                id="doc-status"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="h-9 w-36"
              >
                <SelectOption value="">All</SelectOption>
                {typeInfo.filters.statuses.map((status) => (
                  <SelectOption key={status.value} value={status.value}>
                    {status.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </FilterField>
          )}
          <Button type="submit" size="sm" className="h-9">
            Search
          </Button>
        </form>
      </FilterBar>

      <TableCard
        summary={
          rows.length
            ? `${typeInfo?.label ?? typeKey} · rows ${skip + 1}–${skip + rows.length}`
            : (typeInfo?.label ?? typeKey)
        }
        actions={
          <>
            <NativeSelect
              aria-label="Rows per page"
              value={String(top)}
              onChange={(e) => {
                setTop(Number(e.target.value));
                setSkip(0);
              }}
              className="h-8 w-28"
            >
              {[20, 50, 100].map((n) => (
                <SelectOption key={n} value={String(n)}>
                  {n} a page
                </SelectOption>
              ))}
            </NativeSelect>
            <Button
              size="sm"
              variant="outline"
              disabled={skip === 0 || list.isFetching}
              onClick={() => setSkip(Math.max(0, skip - top))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!list.data?.has_more || list.isFetching}
              onClick={() => setSkip(skip + top)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>{kind === 'journal' ? 'Entry' : 'No.'}</Th>
              <Th>{kind === 'journal' ? 'Posted' : 'Date'}</Th>
              {extra.map((label) => (
                <Th key={label} align={label === 'Total' || label === 'Cash + transfer' ? 'right' : 'left'}>
                  {label}
                </Th>
              ))}
              <Th className="w-8">
                <span className="sr-only">Attachment</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading || types.isLoading ? (
              <TableLoading colSpan={colSpan} message="Reading SAP…" />
            ) : rows.length === 0 ? (
              <TableEmpty
                colSpan={colSpan}
                message={list.isError ? 'SAP could not be read' : 'No documents match'}
                hint={list.isError ? undefined : 'Try a wider date range or clear the filters.'}
              />
            ) : (
              rows.map((row) => (
                <tr
                  key={row.doc_entry}
                  className={`${ROW_CLASSES} cursor-pointer`}
                  onClick={() => setOpened(row.doc_entry)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') setOpened(row.doc_entry);
                  }}
                  tabIndex={0}
                >
                  <Td className="font-medium tabular-nums">{row.doc_num ?? row.doc_entry}</Td>
                  <Td className="whitespace-nowrap">{sapDate(row.doc_date)}</Td>
                  <Cells kind={kind} row={row} />
                  <Td>
                    {row.attachment_entry && (
                      <Paperclip className="h-4 w-4 text-muted-foreground" aria-label="Has an attachment" />
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <DocumentDetailDialog type={typeInfo} docEntry={opened} onClose={() => setOpened(null)} />
    </div>
  );
}
