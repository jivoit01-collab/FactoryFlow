import { ExternalLink, PackageCheck, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/shared/utils';

import { BACKLOG_OPEN_STATUSES } from '../constants/dispatch-day.constants';
import type { BacklogBill } from '../hooks';
import { count, kilos, litres, money, rupees } from '../utils/format';
import { WallOverlay } from './WallOverlay';

/** "05 Sep 2026" — long enough to be unambiguous on a card nobody is rushing. */
function longDay(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "05 Sep 2026, 14:32" for a timestamp. */
function stamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${longDay(iso)}, ${d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">{children}</dd>
    </div>
  );
}

/**
 * One open bill, in full.
 *
 * Every field here was already on the response the panel drew its rows from, so
 * opening a bill fires no request: the card cannot spin, fail, or disagree with
 * the row behind it.
 *
 * It is resolved from the LIVE row list rather than from a snapshot taken on
 * click. The board reloads every thirty seconds, and a bill can ship while
 * somebody is reading it — in which case it drops out of the backlog and the
 * card says so, instead of quietly showing a bill that is no longer owed.
 */
export function BacklogBillDetail({
  bill,
  onClose,
}: {
  /** Null once the bill has left the backlog while the card was open. */
  bill: BacklogBill | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const titleId = 'backlog-bill-detail-title';

  if (!bill) {
    return (
      <WallOverlay onClose={onClose} labelledBy={titleId}>
        <div className="rounded-2xl border border-black/[0.09] bg-background p-6 text-center shadow-2xl dark:border-white/10">
          <PackageCheck className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          <h2 id={titleId} className="mt-3 text-base font-bold text-foreground">
            This bill has just shipped
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            It left the open backlog while the card was open, so there is nothing left to chase.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg border border-black/[0.12] bg-black/[0.04] px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-black/[0.08] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </WallOverlay>
    );
  }

  const isBooked = bill.status === BACKLOG_OPEN_STATUSES.BOOKED;
  const partly = bill.dispatchedAmount > 0;
  const remaining = Math.max(0, bill.amount - bill.dispatchedAmount);

  return (
    <WallOverlay onClose={onClose} labelledBy={titleId}>
      <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-black/[0.09] bg-background shadow-2xl dark:border-white/10">
        {/* header */}
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-black/[0.06] px-5 py-4 dark:border-white/5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              Open bill · #{bill.invoiceNo}
            </p>
            <h2 id={titleId} className="mt-1 truncate text-xl font-bold text-foreground">
              {bill.customer || `Bill #${bill.invoiceNo}`}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  isBooked
                    ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300'
                    : 'border-black/[0.09] bg-black/[0.035] text-foreground/70 dark:border-white/10 dark:bg-white/5',
                )}
              >
                {isBooked ? 'booked' : 'pending'}
              </span>
              <span className="tabular-nums">
                due {longDay(bill.dispatchDate)}
                {bill.ageDays > 0 && (
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    {' '}
                    · {count(bill.ageDays)}d late
                  </span>
                )}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg border border-black/[0.09] bg-black/[0.035] p-1.5 text-muted-foreground transition-colors hover:bg-black/[0.08] hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="wall-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {bill.isStub && (
            <p className="mb-4 rounded-xl border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              This bill was picked onto the plan page and never filled in — no value, quantity or
              customer was entered against it. It is a real SAP document, but not freight anyone is
              waiting on.
            </p>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
            <Field label="Value">{bill.isStub ? '—' : rupees(bill.amount)}</Field>
            <Field label="Planned volume">{bill.litres > 0 ? litres(bill.litres) : '—'}</Field>
            <Field label="Planned weight">{bill.weightKg > 0 ? kilos(bill.weightKg) : '—'}</Field>

            <Field label="Customer code">{bill.customerCode || '—'}</Field>
            <Field label="Place of supply">{bill.place || '—'}</Field>
            <Field label="Variety">{bill.productVariety || '—'}</Field>

            <Field label="SAP DocEntry">{bill.docEntry || '—'}</Field>
            <Field label="Priority">{bill.priority || '—'}</Field>
            <Field label="E-way bill">{bill.ewayBill || '—'}</Field>
          </dl>

          {/* Who is carrying it. Only meaningful once a plan is booked — a
              pending bill has no transporter by definition, and printing three
              dashes would look like missing data rather than "not yet". */}
          <section className="mt-5 border-t border-black/[0.06] pt-4 dark:border-white/5">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              Transport
            </h3>
            {isBooked ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
                <Field label="Transporter">{bill.transporter || '—'}</Field>
                <Field label="Vehicle">{bill.vehicleNo || '—'}</Field>
                <Field label="Stage">{bill.dispatchStage || 'not docked yet'}</Field>
                <Field label="Gatepass">{bill.gatepassNo || '—'}</Field>
                <Field label="Gate-outs">{count(bill.gateOutCount)}</Field>
                <Field label="Last dispatch">{stamp(bill.lastDispatchedAt)}</Field>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                No transporter allotted yet — the bill is still pending on the plan page.
              </p>
            )}
          </section>

          {/* A part-shipped bill is open for the REMAINDER, not the whole value.
              Without this the row's amount reads as the outstanding figure when
              most of it may already have gone. */}
          {partly && (
            <section className="mt-5 border-t border-black/[0.06] pt-4 dark:border-white/5">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                Already shipped against this bill
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-4">
                <Field label="Shipped">{money(bill.dispatchedAmount)}</Field>
                <Field label="Still owed">{money(remaining)}</Field>
                <Field label="Boxes out">{count(bill.dispatchedBoxes)}</Field>
                <Field label="Fulfilled">
                  {bill.fulfillmentRate == null
                    ? '—'
                    : `${Math.round(bill.fulfillmentRate * 100)}%`}
                </Field>
              </dl>

              {bill.dispatches.length > 0 && (
                <ul className="mt-3 divide-y divide-black/[0.06] rounded-xl border border-black/[0.09] dark:divide-white/5 dark:border-white/10">
                  {bill.dispatches.map((d, index) => (
                    <li
                      key={`${d.gatepassNo || d.docNum}-${index}`}
                      className="flex items-center gap-3 px-3 py-2 text-xs"
                    >
                      <span className="w-24 shrink-0 font-semibold tabular-nums text-foreground">
                        {d.vehicleNo || '—'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {d.gatepassNo ? `${d.gatepassNo} · ` : ''}
                        {d.status}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground/80">
                        {longDay(d.gateOutDate)}
                      </span>
                      <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-foreground">
                        {money(d.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-black/[0.06] px-5 py-3 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-black/[0.12] bg-black/[0.04] px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-black/[0.08] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Close
          </button>
          {/* Leaving the board is now a deliberate act rather than what happens
              when you touch a row — on a wall display, navigating away is the
              one thing a stray click must not do. */}
          <button
            type="button"
            onClick={() => navigate(`/dispatch/plans?search=${encodeURIComponent(bill.invoiceNo)}`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-600/40 bg-violet-500/10 px-3 py-1.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-500/20 dark:border-violet-400/40 dark:text-violet-300"
          >
            Open in Dispatch Plans
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </footer>
      </div>
    </WallOverlay>
  );
}
