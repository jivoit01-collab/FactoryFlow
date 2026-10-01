import { Button } from '@/shared/components/ui';
import { formatCurrency, formatDate } from '@/shared/utils';

import type { LineDefaults, PastSale } from '../types';

/** A bill older than this is flagged as old rather than read as the going rate. */
const OLD_BILL_DAYS = 90;

function daysSince(isoDate: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(isoDate).getTime()) / 86_400_000);
}

function age(days: number): string {
  if (days < 60) return `${days} days old`;
  return `${Math.round(days / 30)} months old`;
}

function saleDate(sale: PastSale): string {
  return sale.doc_date ? formatDate(sale.doc_date) : '—';
}

function inclTax(sale: PastSale): string {
  return sale.price_incl_tax == null ? '—' : formatCurrency(sale.price_incl_tax);
}

/**
 * Where a direct-sale line's price came from, and the item's latest bills to
 * anyone. The customer's own last bill can be long out of date — a ₹140 pouch
 * from July 2025 was prefilling counter sales that now go at ₹160 — so the
 * going rate sits beside it, each bill one click from the price box.
 */
export function LinePriceGuide({
  guide,
  customerCode,
  onUsePrice,
  now = new Date(),
}: {
  guide: LineDefaults;
  customerCode: string;
  onUsePrice: (price: number) => void;
  now?: Date;
}) {
  const recent = guide.recent ?? [];
  const lastSale = guide.last_sale ?? null;
  const priceList = guide.price_list ?? null;
  const lastSaleDays = lastSale?.doc_date ? daysSince(lastSale.doc_date, now) : null;
  const lastSaleIsOld = lastSaleDays != null && lastSaleDays > OLD_BILL_DAYS;

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
      {guide.source === 'price_list' && priceList ? (
        <p>
          Price from the <span className="font-medium">{priceList.list_name}</span> price list:{' '}
          {priceList.includes_tax
            ? `${formatCurrency(priceList.price)} incl. tax, ${formatCurrency(priceList.net_price ?? 0)} before tax.`
            : `${formatCurrency(priceList.price)} before tax.`}
        </p>
      ) : guide.source === 'last_sale' && lastSale ? (
        <p
          className={
            lastSaleIsOld
              ? 'rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
              : undefined
          }
        >
          Price from this customer&apos;s last bill: {inclTax(lastSale)} incl. tax on{' '}
          {saleDate(lastSale)} (bill {lastSale.doc_num ?? '—'}).
          {lastSaleIsOld && lastSaleDays != null
            ? ` That bill is ${age(lastSaleDays)} — check the recent bills below before using it.`
            : null}
        </p>
      ) : (
        <p className="text-muted-foreground">
          No price list or past bill for this customer. Use a recent bill below or type the price.
        </p>
      )}

      {priceList && guide.source !== 'price_list' ? (
        // A tax-inclusive list with no tax code to take off: shown, not prefilled.
        <p className="text-muted-foreground">
          The {priceList.list_name} price list has {formatCurrency(priceList.price)} incl. tax.
        </p>
      ) : null}

      {guide.source === 'price_list' && lastSale ? (
        <p className="text-muted-foreground">
          Last billed to this customer at {inclTax(lastSale)} incl. tax on {saleDate(lastSale)}.
        </p>
      ) : null}

      <div>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent bills for this item (all customers)
        </h4>
        {recent.length === 0 ? (
          <p className="text-muted-foreground">No bills for this item yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3 font-medium">Date</th>
                  <th className="py-1 pr-3 font-medium">Customer</th>
                  <th className="hidden py-1 pr-3 text-right font-medium sm:table-cell">Qty</th>
                  <th className="hidden py-1 pr-3 text-right font-medium sm:table-cell">
                    Before tax
                  </th>
                  <th className="py-1 pr-3 text-right font-medium">Incl. tax</th>
                  <th className="py-1" aria-label="Use this price" />
                </tr>
              </thead>
              <tbody>
                {recent.map((sale) => {
                  const price = sale.price;
                  return (
                    <tr key={`${sale.doc_entry}-${sale.customer_code}`} className="border-t">
                      <td className="whitespace-nowrap py-1 pr-3 tabular-nums">{saleDate(sale)}</td>
                      <td
                        className="max-w-[6rem] truncate py-1 pr-3 sm:max-w-[16rem]"
                        title={sale.customer_name}
                      >
                        {sale.customer_name}
                        {sale.customer_code === customerCode ? (
                          <span className="text-muted-foreground"> · this customer</span>
                        ) : null}
                      </td>
                      <td className="hidden py-1 pr-3 text-right tabular-nums sm:table-cell">
                        {sale.quantity}
                      </td>
                      <td className="hidden py-1 pr-3 text-right tabular-nums sm:table-cell">
                        {price == null ? '—' : formatCurrency(price)}
                      </td>
                      <td className="py-1 pr-3 text-right font-medium tabular-nums">
                        {inclTax(sale)}
                      </td>
                      <td className="py-1 text-right">
                        {price == null ? null : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            aria-label={`Use ${inclTax(sale)} incl. tax from bill ${sale.doc_num ?? ''}`}
                            onClick={() => onUsePrice(price)}
                          >
                            Use
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
