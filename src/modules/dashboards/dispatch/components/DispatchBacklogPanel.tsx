import { ClipboardList } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { cn, getErrorMessage } from '@/shared/utils';

import {
  BACKLOG_DEFAULT_DAYS_BACK,
  BACKLOG_MAX_DAYS_BACK,
  BACKLOG_OPEN_STATUSES,
  shiftFromISO,
} from '../constants/dispatch-day.constants';
import { useWallPalette } from '../constants/wall.palette';
import type { BacklogBill } from '../hooks';
import { useAutoScroll, useBoardDay, useDispatchBacklogBills } from '../hooks';
import { count, kilos, litres, money, rupees } from '../utils/format';
import { BacklogBillDetail } from './BacklogBillDetail';
import { BoardPanel, PanelBadge, PanelEmpty } from './BoardPanel';

/** Below this many rows the list fits, and creeping it would just be motion. */
const AUTO_SCROLL_FROM = 7;

/** Past this many days overdue a bill stops being late and starts being stuck. */
const STUCK_DAYS = 90;
const LATE_DAYS = 31;

/**
 * Below this many rupees per kilo the recorded weight is not believable.
 *
 * `invoice_weight` is normally sound: across 1,383 shipped bills it matches the
 * weighbridge at a median ratio of 1.00x. But one subset -- 69 of the 278 open
 * bills that carry a weight, all Jivo Beverages -- is inflated roughly 24x. The
 * worst reads 146,304 kg against a Rs 48,021 invoice: 146 tonnes of beverage,
 * where the heaviest truck ever weighed at this gate is 25,001 kg.
 *
 * Bills with the same signature that DID ship pin the factor down. Their invoice
 * weight over their weighed weight lands on 24.0x again and again (76,200 kg
 * invoiced, 3,175 kg on the bridge), which is a case pack: the weight is being
 * taken per bottle and multiplied by the piece count instead of by cases. The
 * two loose ratios in that sample, 21.6x and 19.3x, are mixed pack sizes on one
 * invoice.
 *
 * The panel flags rather than divides. 24 is inferred from sibling bills, not
 * read off the SAP lines, and a silent correction would turn an inherited fault
 * into one of ours. Fixing it properly means correcting what SAP sends.
 */
const SUSPECT_RUPEES_PER_KG = 5;

/** "05 Sep" — the left rail's date stamp. Short enough to read at 4 m. */
function dayStamp(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/** "2026" — carried under the stamp only when the bill is not from this year. */
function yearOf(iso: string): string {
  return iso.slice(0, 4);
}

function ageTone(days: number): { text: string; rail: string } {
  if (days >= STUCK_DAYS) {
    return {
      text: 'text-rose-700 dark:text-rose-300',
      rail: 'bg-rose-500/70 dark:bg-rose-400/70',
    };
  }
  if (days >= LATE_DAYS) {
    return {
      text: 'text-amber-700 dark:text-amber-300',
      rail: 'bg-amber-500/70 dark:bg-amber-400/70',
    };
  }
  return {
    text: 'text-muted-foreground/70',
    rail: 'bg-emerald-500/60 dark:bg-emerald-400/60',
  };
}

/**
 * What is still owed, bill by bill.
 *
 * Replaces the transporter breakdown in this slot because backlog cannot be told
 * as a vendor story: a transporter is only allotted once a plan is BOOKED, so on
 * the current data roughly nine in ten open bills carry no vendor at all, and
 * the ones that do are invisible on any day their carrier sends no truck. Keyed
 * on the scheduled date instead, every open bill has a row.
 *
 * The window runs from a date the viewer picks to today, and only the start is
 * adjustable — a backlog that ended last Tuesday is not a backlog. Rows lead
 * with that scheduled date and how far past it the bill now sits, because the
 * age is the thing that decides whether anybody has to act.
 */
export function DispatchBacklogPanel({ enabled = true }: { enabled?: boolean }) {
  const day = useBoardDay();
  const palette = useWallPalette();
  const listRef = useRef<HTMLUListElement>(null);

  const earliest = shiftFromISO(day.today, -BACKLOG_MAX_DAYS_BACK);
  const [from, setFrom] = useState(() => shiftFromISO(day.today, -BACKLOG_DEFAULT_DAYS_BACK));
  /** Hide the abandoned plan stubs. Off by default: the stubs are a real problem
   *  and hiding them by default would hide the problem too. */
  const [filledOnly, setFilledOnly] = useState(false);

  const backlog = useDispatchBacklogBills(from, filledOnly, enabled);
  const rows = backlog.rows;

  /** The open bill's id, not the bill. The list reloads every thirty seconds,
   *  so the card re-resolves from the live rows and can tell the reader when the
   *  bill they are looking at has shipped out from under them. */
  const [openId, setOpenId] = useState<number | null>(null);
  const openBill = openId == null ? undefined : rows.find((row) => row.id === openId);

  // Freeze the creep while a card is open: the list moving behind the overlay
  // is both distracting and means a dismissed card returns to a different row
  // than the one that was clicked.
  useAutoScroll(listRef, rows.length >= AUTO_SCROLL_FROM && openId == null);

  const maxAmount = useMemo(() => Math.max(...rows.map((row) => row.amount), 1), [rows]);

  /** Keep the picker inside the window the endpoint will actually accept — a
   *  wider range comes back 400, which would read as "no backlog". */
  const onPickFrom = (value: string) => {
    if (!value) return;
    if (value > day.today) return setFrom(day.today);
    if (value < earliest) return setFrom(earliest);
    setFrom(value);
  };

  return (
    <BoardPanel
      title="Open backlog"
      icon={ClipboardList}
      hex={palette.hue('backlog')}
      flush
      aside={
        <>
          <PanelBadge>{count(backlog.totalCount)} bills</PanelBadge>
          <PanelBadge tone={backlog.isTruncated ? 'warn' : 'neutral'}>
            {backlog.isTruncated ? `top ${count(rows.length)}` : money(backlog.loadedAmount)}
          </PanelBadge>
        </>
      }
    >
      {/* Window picker. Only the start moves: the end of a backlog is always now,
          so it is shown as a fixed label rather than a second input nobody
          should be able to set wrong. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-black/[0.06] dark:border-white/5 px-4 pb-2.5">
        <label className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            From
          </span>
          <input
            type="date"
            value={from}
            min={earliest}
            max={day.today}
            onChange={(event) => onPickFrom(event.target.value)}
            className="rounded-lg border border-black/[0.12] dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.06] px-2 py-1 text-xs font-semibold tabular-nums text-foreground outline-none transition-colors hover:border-black/25 dark:hover:border-white/25 focus-visible:border-emerald-600/60 dark:focus-visible:border-emerald-400/60 dark:[color-scheme:dark]"
          />
        </label>

        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <span aria-hidden>&rarr;</span>
          <span className="font-semibold tabular-nums text-foreground/75">today</span>
          <span className="tabular-nums">({dayStamp(day.today)})</span>
        </span>

        <span className="ml-auto flex items-center gap-2">
          {backlog.stubCount > 0 && (
            <button
              type="button"
              onClick={() => setFilledOnly((on) => !on)}
              aria-pressed={filledOnly}
              title={
                filledOnly
                  ? 'Show the bills that were picked onto the plan page and never filled in'
                  : 'Hide the bills that carry no value and no quantity'
              }
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider tabular-nums transition-colors',
                filledOnly
                  ? 'border-amber-600/40 dark:border-amber-400/40 bg-amber-500/15 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300'
                  : 'border-black/[0.09] dark:border-white/10 bg-black/[0.035] dark:bg-white/5 text-muted-foreground/75 hover:border-black/25 dark:hover:border-white/25',
              )}
            >
              {filledOnly
                ? `${count(backlog.stubCount)} unfilled hidden`
                : `hide ${count(backlog.stubCount)} unfilled`}
            </button>
          )}
          {backlog.pendingCount > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {count(backlog.pendingCount)} pending
            </span>
          )}
          {backlog.bookedCount > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              {count(backlog.bookedCount)} booked
            </span>
          )}
        </span>
      </div>

      {!enabled ? (
        <PanelEmpty>Open backlog needs the Dispatch Plans permission.</PanelEmpty>
      ) : backlog.isError ? (
        <PanelEmpty>
          {getErrorMessage(backlog.error, 'The open backlog could not be read.')}
        </PanelEmpty>
      ) : rows.length === 0 ? (
        <PanelEmpty>
          {backlog.isLoading
            ? 'Reading the dispatch plans...'
            : 'Nothing open in this window — every bill scheduled since then has shipped.'}
        </PanelEmpty>
      ) : (
        <ul
          ref={listRef}
          className="wall-scroll min-h-0 flex-1 divide-y divide-black/[0.06] dark:divide-white/5 overflow-y-auto"
        >
          {rows.map((row) => (
            <BacklogRow
              key={row.id}
              row={row}
              maxAmount={maxAmount}
              onOpen={() => setOpenId(row.id)}
            />
          ))}
        </ul>
      )}

      {openId != null && (
        <BacklogBillDetail bill={openBill ?? null} onClose={() => setOpenId(null)} />
      )}
    </BoardPanel>
  );
}

function BacklogRow({
  row,
  maxAmount,
  onOpen,
}: {
  row: BacklogBill;
  maxAmount: number;
  onOpen: () => void;
}) {
  const tone = ageTone(row.ageDays);
  const isBooked = row.status === BACKLOG_OPEN_STATUSES.BOOKED;
  const thisYear = yearOf(row.dispatchDate) === new Date().getFullYear().toString();

  // The doc number is the headline only when there is no customer to use, and
  // then it must not appear a second time in the detail line. On this data both
  // the customer and the litres are usually missing, and the earlier version
  // printed the same number twice with three zeroes between them.
  const named = Boolean(row.customer);

  // Quantity has exactly one home, the detail line. Litres are preferred and
  // weight only stands in when there are none -- and it used to ALSO print in
  // the right-hand column, so a litre-less row showed "146.3 T" twice.
  const hasLitres = row.litres > 0;
  const showWeight = !hasLitres && row.weightKg > 0;
  const weightSuspect =
    showWeight && row.amount > 0 && row.amount / row.weightKg < SUSPECT_RUPEES_PER_KG;

  const rest = [row.place || null, named ? `#${row.invoiceNo}` : null].filter(Boolean).join(' · ');
  const hasQuantity = hasLitres || showWeight;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        title={`Open bill #${row.invoiceNo}`}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.035] dark:hover:bg-white/[0.05] focus:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]"
      >
        {/* Left rail — the scheduled dispatch date, and how far past it we are. */}
        <span className="flex shrink-0 items-stretch gap-2">
          <span className={cn('w-0.5 shrink-0 rounded-full', tone.rail)} aria-hidden />
          <span className="flex w-[52px] shrink-0 flex-col items-start leading-tight">
            <span className="text-xs font-bold tabular-nums text-foreground">
              {dayStamp(row.dispatchDate)}
            </span>
            {!thisYear && (
              <span className="text-[9px] font-semibold tabular-nums text-muted-foreground/60">
                {yearOf(row.dispatchDate)}
              </span>
            )}
            <span className={cn('text-[10px] font-semibold tabular-nums', tone.text)}>
              {row.ageDays === 0 ? 'today' : `${count(row.ageDays)}d late`}
            </span>
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                'truncate text-sm font-bold',
                row.isStub ? 'text-foreground/55' : 'text-foreground',
              )}
            >
              {named ? row.customer : `#${row.invoiceNo}`}
            </span>
            {/* A stub has no value to print. "₹0" claimed it was a shipment
                worth nothing, which is a different and wrong statement. */}
            {row.isStub ? (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-amber-700/90 dark:text-amber-300/90">
                not filled in
              </span>
            ) : (
              <span className="shrink-0 text-sm font-bold tabular-nums text-violet-700 dark:text-violet-300">
                {money(row.amount)}
              </span>
            )}
          </span>

          <span className="mt-1 flex items-center gap-2">
            {row.isStub ? (
              <span className="flex-1 truncate text-[11px] text-muted-foreground/60">
                Picked onto the plan page &mdash; no value, quantity or customer entered
              </span>
            ) : (
              <>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300 transition-[width] duration-700"
                    style={{
                      width: `${Math.max((row.amount / maxAmount) * 100, row.amount > 0 ? 4 : 0)}%`,
                    }}
                  />
                </span>
                {/* Litres, for the same reason the vendor panel led with them:
                    SAP's weight on this data is unreliable and one bad row would
                    dominate. Weight only stands in when there are no litres. */}
                {(hasQuantity || rest) && (
                  <span
                    title={
                      weightSuspect
                        ? `SAP records ${kilos(row.weightKg)} against ${rupees(row.amount)} — about ₹${(
                            row.amount / row.weightKg
                          ).toFixed(
                            2,
                          )}/kg, where these bills run near ₹12/kg. Bills with this fault that shipped weighed 24× less on the bridge, so the real load is nearer ${kilos(
                            row.weightKg / 24,
                          )}.`
                        : row.transporter || undefined
                    }
                    className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80"
                  >
                    {hasLitres && litres(row.litres)}
                    {showWeight && (
                      <span className={cn(weightSuspect && 'text-amber-700 dark:text-amber-300')}>
                        {kilos(row.weightKg)}
                        {weightSuspect && <span aria-hidden> ?</span>}
                      </span>
                    )}
                    {hasQuantity && rest ? ' · ' : ''}
                    {rest}
                  </span>
                )}
              </>
            )}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              isBooked
                ? 'border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300'
                : 'border-black/[0.09] dark:border-white/10 bg-black/[0.035] dark:bg-white/5 text-foreground/70',
            )}
          >
            {isBooked ? 'booked' : 'pending'}
          </span>
          {/* Who is carrying it, and nothing else. Quantity lives in the detail
              line; repeating the weight here was how one row came to read
              "146.3 T · DL" and "146.3 T" side by side. */}
          {isBooked && row.transporter && (
            <span className="max-w-[7rem] truncate text-[10px] font-semibold text-muted-foreground/60">
              {row.transporter}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
