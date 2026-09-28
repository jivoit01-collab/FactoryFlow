/**
 * The exchange rates customs has notified, and a converter for a landed price.
 *
 * Customs (CBIC) notifies an import and an export rate per currency, usually
 * twice a month; those, not the market's, are what a bill of entry is valued
 * at. The page shows the latest notification for the currencies the oil is
 * bought in, with every other currency a switch away.
 *
 * The converter is EXIM's: a price per tonne in the chosen currency, at its
 * import rate, plus the item's expense percentage, as rupees a kilo and a litre.
 */
import { Calculator, Globe, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  PageHeader,
  ROW_CLASSES,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Switch,
} from '@/shared/components/ui';
import { formatDateTimeShort, formatDay, getErrorMessage } from '@/shared/utils';

import { useCustomsRates, useRefreshCustomsRates } from '../api';
import type { CustomsRate } from '../types';
import { fmtMoney } from '../utils';

/** The currencies the oil is bought in, in the order EXIM listed them. */
const TRADED = [
  'U.S.Dollar',
  'Euro',
  'UAE Dirham',
  'Australian Dollar',
  'Canadian Dollar',
  'Chinese Yuan',
];

const CODES: Record<string, string> = {
  'U.S.Dollar': 'USD',
  Euro: 'EUR',
  'UAE Dirham': 'AED',
  'Australian Dollar': 'AUD',
  'Canadian Dollar': 'CAD',
  'Chinese Yuan': 'CNY',
};

/** EXIM's items, each with the expense it adds on top of the landed price. */
const ITEMS = [
  { label: 'CDRO', value: 'cdro', expense: 22.5 },
  { label: 'Cold Press', value: 'cold press', expense: 22.5 },
  { label: 'Cold Press W/R', value: 'cold press w/r', expense: 19 },
  { label: 'Cold Press W/O/R', value: 'cold press w/o/r', expense: 17 },
  { label: 'Pomace', value: 'pomace', expense: 48.5 },
  { label: 'Extra Virgin', value: 'extravirgin', expense: 52 },
  { label: 'Extra Light', value: 'extra light', expense: 39.5 },
];

/** Litres in a kilo of oil, the figure EXIM converted at. */
const LITRES_PER_KG = 1.0989;

function currencyName(currency: string) {
  return currency.replace('U.S.', 'US ');
}

function Converter({ rates }: { rates: CustomsRate[] }) {
  const [item, setItem] = useState(ITEMS[0].value);
  const [currency, setCurrency] = useState(TRADED[0]);
  const [price, setPrice] = useState('1000');
  const [expense, setExpense] = useState(String(ITEMS[0].expense));

  const rate = Number(rates.find((r) => r.currency === currency)?.import_rate ?? NaN);
  const perKg =
    Number.isFinite(rate) && Number(price) > 0
      ? ((Number(price) * rate) / 1000) * (1 + (Number(expense) || 0) / 100)
      : null;

  return (
    <Card className="h-fit shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          Landed price
        </CardTitle>
        <CardDescription>A price per tonne, at the customs import rate.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="conv-item">Item</Label>
          <NativeSelect
            id="conv-item"
            value={item}
            onChange={(event) => {
              setItem(event.target.value);
              const found = ITEMS.find((i) => i.value === event.target.value);
              if (found) setExpense(String(found.expense));
            }}
          >
            {ITEMS.map((i) => (
              <SelectOption key={i.value} value={i.value}>
                {i.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conv-currency">Currency</Label>
          <NativeSelect
            id="conv-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {TRADED.map((c) => (
              <SelectOption key={c} value={c}>
                {currencyName(c)}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="conv-price">Price / MT ({CODES[currency]})</Label>
            <Input
              id="conv-price"
              type="number"
              inputMode="decimal"
              min="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conv-expense">Expense (%)</Label>
            <Input
              id="conv-expense"
              type="number"
              inputMode="decimal"
              min="0"
              value={expense}
              onChange={(event) => setExpense(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Per kg</span>
            <span className="text-lg font-semibold tabular-nums">
              ₹ {perKg === null ? '—' : fmtMoney(perKg)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Per litre</span>
            <span className="text-lg font-semibold tabular-nums">
              ₹ {perKg === null ? '—' : fmtMoney(perKg / LITRES_PER_KG)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            At {Number.isFinite(rate) ? `₹ ${rate}` : 'no rate'} per {CODES[currency]}; a kilo is{' '}
            {LITRES_PER_KG} litres.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CustomsRatesPage() {
  const { data, isLoading, isError, error } = useCustomsRates();
  const refresh = useRefreshCustomsRates();
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  const rates = useMemo(() => {
    const all = data?.rates ?? [];
    const term = search.trim().toLowerCase();
    const picked = showAll ? all : all.filter((r) => TRADED.includes(r.currency));
    const ordered = [...picked].sort((a, b) => {
      const ai = TRADED.indexOf(a.currency);
      const bi = TRADED.indexOf(b.currency);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.currency.localeCompare(b.currency);
    });
    return term ? ordered.filter((r) => r.currency.toLowerCase().includes(term)) : ordered;
  }, [data, showAll, search]);

  async function onRefresh() {
    try {
      await refresh.mutateAsync();
      toast.success('Rates read again from the notification');
    } catch {
      // The API client has already shown why.
    }
  }

  const notified = data?.notified_on
    ? `Notification ${data.notification_no ?? '—'} of ${formatDay(data.notified_on)}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customs Exchange Rates"
        description={
          notified
            ? `${notified}. The rates a bill of entry or shipping bill is valued at.`
            : 'The rates CBIC notifies for valuing a bill of entry or shipping bill.'
        }
        icon={Globe}
        accent="teal"
      >
        <Button variant="outline" onClick={onRefresh} disabled={refresh.isPending}>
          <RefreshCw
            className={refresh.isPending ? 'mr-1.5 h-4 w-4 animate-spin' : 'mr-1.5 h-4 w-4'}
          />
          {refresh.isPending ? 'Reading…' : 'Read again'}
        </Button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TableCard
          summary={
            <span>
              {rates.length} currenc{rates.length === 1 ? 'y' : 'ies'}
              {data?.fetched_at ? ` · read ${formatDateTimeShort(data.fetched_at)}` : ''}
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={showAll} onChange={setShowAll} id="all-currencies" />
                All currencies
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search currency"
                  className="h-9 w-48 pl-8"
                />
              </div>
            </div>
          }
        >
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th className="w-10">#</Th>
                <Th>Currency</Th>
                <Th align="right">Import (₹)</Th>
                <Th align="right">Export (₹)</Th>
                <Th>Notified</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoading colSpan={5} message="Reading the notification…" />
              ) : isError ? (
                <TableEmpty
                  colSpan={5}
                  message="The rates could not be read"
                  hint={getErrorMessage(error, 'Try Read again in a moment.')}
                />
              ) : rates.length === 0 ? (
                <TableEmpty
                  colSpan={5}
                  message={search ? 'No currency matches' : 'No rates came back'}
                  hint={search ? undefined : 'The service answered with nothing; try Read again.'}
                />
              ) : (
                rates.map((rate, index) => (
                  <tr key={rate.currency} className={ROW_CLASSES}>
                    <Td className="text-muted-foreground tabular-nums">{index + 1}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-2">
                        {CODES[rate.currency] && (
                          <span className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                            {CODES[rate.currency]}
                          </span>
                        )}
                        <span className="font-medium">{currencyName(rate.currency)}</span>
                      </span>
                    </Td>
                    <Td numeric className="font-semibold">
                      {rate.import_rate ?? '—'}
                    </Td>
                    <Td numeric>{rate.export_rate ?? '—'}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatDay(rate.notified_on)}
                      {rate.notification_no ? ` · ${rate.notification_no}` : ''}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>

        <Converter rates={data?.rates ?? []} />
      </div>
    </div>
  );
}
