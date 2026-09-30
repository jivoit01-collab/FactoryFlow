/**
 * General Ledger — every posting to one account, with the balance after each.
 *
 * Ported from SAP Portal's GL page. The picker searches G/L accounts and
 * business partners together, because SAP's ledger takes either: a vendor such
 * as "AWL Agri Business Limited" exists only as a partner. Postings come newest
 * first; the balance column is the account's balance *after* that posting,
 * anchored on SAP's live balance less anything posted after the chosen range —
 * the portal anchored on today's balance whatever the range, so an old range
 * showed wrong balances.
 */
import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';
import {
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Input, NativeSelect, SelectOption } from '@/shared/components/ui';

import { type LedgerAccountOption, useGeneralLedger, useLedgerAccountSearch } from '../api';
import { money, sapDate } from '../utils/format';

export default function GeneralLedgerPage() {
  const [search, setSearch] = useState('');
  const [account, setAccount] = useState<LedgerAccountOption | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limit, setLimit] = useState(200);

  const options = useLedgerAccountSearch(search);
  const ledger = useGeneralLedger({
    account: account?.code ?? '',
    date_from: dateFrom,
    date_to: dateTo,
    limit,
  });
  const data = ledger.data;
  const lines = data?.lines ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Ledger"
      />

      <FilterBar
        isFetching={ledger.isFetching}
        activeCount={[account, dateFrom, dateTo].filter(Boolean).length}
        onReset={() => {
          setAccount(null);
          setDateFrom('');
          setDateTo('');
        }}
      >
        <FilterField label="Account or partner" className="sm:w-96">
          <SearchableSelect<LedgerAccountOption>
            inputId="gl-account"
            value={account?.code ?? ''}
            items={options.data ?? []}
            isLoading={options.isFetching}
            isError={options.isError}
            placeholder="Type a code or a name…"
            minSearchLength={2}
            minSearchText="Type at least two characters"
            getItemKey={(item) => item.code}
            getItemLabel={(item) => `${item.code} — ${item.name}`}
            filterFn={() => true}
            renderItem={(item) => (
              <div className="flex w-full items-center justify-between gap-3">
                <span>
                  <span className="font-medium">{item.code}</span>
                  <span className="text-muted-foreground"> — {item.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">{item.kind}</span>
              </div>
            )}
            loadingText="Searching SAP…"
            emptyText="Type to search"
            notFoundText="No account or partner matches"
            onSearchChange={setSearch}
            onItemSelect={setAccount}
            onClear={() => setAccount(null)}
          />
        </FilterField>
        <FilterField label="From" htmlFor="gl-from">
          <Input id="gl-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
        </FilterField>
        <FilterField label="To" htmlFor="gl-to">
          <Input id="gl-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
        </FilterField>
        <FilterField label="Show" htmlFor="gl-limit">
          <NativeSelect id="gl-limit" value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))} className="h-9 w-32">
            {[200, 500, 1000].map((n) => (
              <SelectOption key={n} value={String(n)}>
                {n} newest
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
      </FilterBar>

      {data && (
        <StatTileRow>
          <StatTile label={data.kind === 'BP' ? 'Business partner' : 'G/L account'} value={data.account} sub={data.name} />
          <StatTile label="Balance today" value={money(data.balance)} sub={data.currency} />
          <StatTile label="Balance at end of range" value={money(data.closing_balance)} sub={dateTo ? sapDate(dateTo) : 'Today'} />
          <StatTile
            label="Postings in range"
            value={data.total.toLocaleString('en-IN')}
            sub={data.total > lines.length ? `Newest ${lines.length} shown` : 'All shown'}
          />
        </StatTileRow>
      )}

      <TableCard summary={account ? `${lines.length} postings` : 'Pick an account to see its ledger'}>
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Posted</Th>
              <Th>Entry</Th>
              <Th>Type</Th>
              <Th>Reference</Th>
              <Th>Memo</Th>
              <Th>Offsetting account</Th>
              <Th align="right">Debit</Th>
              <Th align="right">Credit</Th>
              <Th align="right">Balance</Th>
            </tr>
          </thead>
          <tbody>
            {!account ? (
              <TableEmpty colSpan={9} message="No account chosen" hint="Search by G/L code, partner code or name." />
            ) : ledger.isLoading ? (
              <TableLoading colSpan={9} />
            ) : lines.length === 0 ? (
              <TableEmpty colSpan={9} message={ledger.isError ? 'SAP could not be read' : 'No postings in this range'} />
            ) : (
              lines.map((line, index) => (
                <tr key={`${line.trans_id}-${index}`} className={ROW_CLASSES}>
                  <Td>{sapDate(line.date)}</Td>
                  <Td numeric>{line.trans_id}</Td>
                  <Td>{line.trans_type_label}</Td>
                  <Td>
                    {line.reference || '-'}
                    {line.bill_no && <div className="text-xs text-muted-foreground">Bill {line.bill_no}</div>}
                  </Td>
                  <Td className="max-w-xs truncate" title={line.memo}>
                    {line.memo || '-'}
                  </Td>
                  <Td>
                    {line.offset_account ? (
                      <>
                        <span className="font-medium">{line.offset_account}</span>
                        {line.offset_name && <div className="text-xs text-muted-foreground">{line.offset_name}</div>}
                      </>
                    ) : (
                      '-'
                    )}
                  </Td>
                  <Td numeric>{money(line.debit, true)}</Td>
                  <Td numeric>{money(line.credit, true)}</Td>
                  <Td numeric className="font-medium">
                    {money(line.balance)}
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
