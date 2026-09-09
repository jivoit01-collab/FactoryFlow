import { AlertTriangle, Snowflake } from 'lucide-react';

import { Badge, Card, CardContent } from '@/shared/components/ui';
import { cn, formatCurrency } from '@/shared/utils';

import { useCustomerCredit } from '../api/ar-invoice.queries';

/**
 * The customer's credit position, shown while their invoice is being raised.
 *
 * The four numbers are SAP's own Account Balance panel — limit, what is owed,
 * what is ordered but undelivered, what is delivered but uninvoiced — plus the
 * exposure they add up to and what is left of the limit. `invoiceAmount` (the
 * value being raised right now) is projected on top, so the question the
 * operator is actually asking — "does this one fit?" — is answered before the
 * post rather than by SAP's refusal afterwards.
 *
 * **It does not block anything.** Nothing here disables the submit: the limit
 * is a fact the biller weighs, most customers have no limit set at all, and SAP
 * runs its own check at posting. A panel that quietly refused to let a sale
 * through would be a policy this screen has no business inventing.
 *
 * It also renders nothing at all when the read fails — a customer's invoice must
 * not be held up because one informational query could not reach HANA.
 */
export function CustomerCreditPanel({
  customerCode,
  invoiceAmount = 0,
  className,
}: {
  customerCode: string;
  /** Pre-tax value of what is being invoiced now, projected onto the exposure. */
  invoiceAmount?: number;
  className?: string;
}) {
  const { data: credit, isLoading, isError } = useCustomerCredit(customerCode);

  if (!customerCode || isError) return null;

  if (isLoading || !credit) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Reading credit position from SAP…</p>
        </CardContent>
      </Card>
    );
  }

  const projected = credit.exposure + invoiceAmount;
  // Null, not 0, when SAP holds no limit — see `CustomerCredit`.
  const projectedAvailable = credit.has_credit_limit ? credit.credit_limit - projected : null;
  const projectedOver = projectedAvailable != null && projectedAvailable < 0;
  // Only worth calling out when this invoice is what tips it over.
  const tippedByThisInvoice = projectedOver && !credit.over_limit;

  return (
    <Card
      className={cn(
        credit.over_limit || projectedOver ? 'border-destructive/50' : undefined,
        className,
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Credit position</h3>
          <div className="flex flex-wrap items-center gap-2">
            {credit.is_frozen ? (
              <Badge variant="destructive" className="gap-1">
                <Snowflake className="h-3 w-3" />
                Frozen in SAP
              </Badge>
            ) : null}
            {!credit.is_active ? <Badge variant="warning">Inactive</Badge> : null}
            {credit.over_limit ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Over credit limit
              </Badge>
            ) : tippedByThisInvoice ? (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                This invoice exceeds the limit
              </Badge>
            ) : null}
            {!credit.has_credit_limit ? <Badge variant="outline">No limit set</Badge> : null}
          </div>
        </div>

        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Figure
            label="Credit limit"
            // A currency-formatted 0 would read as "blocked"; it means unset.
            value={credit.has_credit_limit ? formatCurrency(credit.credit_limit) : 'Not set'}
            muted={!credit.has_credit_limit}
            emphasis
          />
          <Figure label="Balance due" value={formatCurrency(credit.balance)} />
          <Figure label="Open orders" value={formatCurrency(credit.open_orders)} />
          <Figure label="Open deliveries" value={formatCurrency(credit.open_deliveries)} />
        </dl>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3">
          <Figure label="Total exposure" value={formatCurrency(credit.exposure)} emphasis />
          {credit.has_credit_limit ? (
            <Figure
              label="Available credit"
              value={formatCurrency(credit.available ?? 0)}
              emphasis
              tone={credit.over_limit ? 'bad' : 'good'}
            />
          ) : null}
          {invoiceAmount > 0 ? (
            <Figure
              label="After this invoice"
              value={
                projectedAvailable == null
                  ? formatCurrency(projected)
                  : `${formatCurrency(projectedAvailable)} left`
              }
              emphasis
              tone={projectedOver ? 'bad' : undefined}
            />
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          Live from SAP. Exposure is balance + open orders + open deliveries — the total SAP
          weighs against the limit. Shown to inform; SAP still runs its own check at posting.
        </p>
      </CardContent>
    </Card>
  );
}

function Figure({
  label,
  value,
  emphasis = false,
  muted = false,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  muted?: boolean;
  tone?: 'good' | 'bad';
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'tabular-nums',
          emphasis ? 'text-sm font-semibold' : 'text-sm',
          muted ? 'text-muted-foreground' : undefined,
          tone === 'bad' ? 'text-destructive' : undefined,
          tone === 'good' ? 'text-green-600 dark:text-green-500' : undefined,
        )}
      >
        {value}
      </dd>
    </div>
  );
}
