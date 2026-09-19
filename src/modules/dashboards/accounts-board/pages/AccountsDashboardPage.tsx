import '../styles/accounts-board.css';

import { FileDown, Plus, Wallet, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { CASH_BOOK_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { CashEntryDialog } from '@/modules/accounts/pages/CashEntryDialog';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { formatNumber } from '@/shared/utils';

import { useAccountsBoard } from '../api';
import { BUCKET_COLOUR_FALLBACK, BUCKET_COLOURS } from '../constants';
import type {
  AccountsBoardResponse,
  AccountsBucket,
  AccountsPeriodChoice,
  AccountsSelection,
} from '../types';

/**
 * The accounts dashboard.
 *
 * ONE DISTINCTION HOLDS THE WHOLE SCREEN UP
 * ------------------------------------------
 * Three of the four stat cards are FLOWS and follow the month selector; the
 * fourth, cash in hand, is a BALANCE and ignores it. They sit in one column, so
 * the only thing stopping somebody subtracting one from another is that each
 * card says which kind of number it is — "in September" against "closing
 * balance, all time". Those sub-labels are not decoration and must not be
 * tidied away to make the cards line up.
 *
 * WHAT THIS SCREEN WILL NOT DO
 * -----------------------------
 * **It never hides a negative balance.** A cash book can go below zero — the
 * live one did during development — and it means the register says more has
 * left the box than entered it, which is nearly always a receipt nobody has
 * typed yet. It is rendered in full, in red, with a line saying what it means.
 * A dashboard that clamps that at zero looks healthiest exactly when it is not.
 *
 * **It never invents a person.** Names come from the API already masked when
 * the reader may not see them, so this file has no masking logic of its own to
 * get wrong: it renders `row.name` and `meta.names_visible` only labels the
 * panel.
 *
 * **It never prints a confident zero for something it cannot read.** A bucket
 * with `has_source: false` renders as "not kept in the cash book". A missing
 * band renders as withheld or unavailable, per `meta`. A real zero renders as
 * a zero, with the context that makes it an answer — "nothing waiting, 47
 * already gone".
 *
 * THE ACTIONS ARE THE REGISTER'S, NOT THIS SCREEN'S
 * --------------------------------------------------
 * "Add entry" opens the cash book's own dialog and "View ledger" links into the
 * register in the Accounts module. This page writes nothing itself. The mock's "Record settlement"
 * button is deliberately absent: nothing in the register records a settlement,
 * so the button would either do nothing or need a model invented behind it.
 * See the note in `_pending_ho` — reimbursement is the one thing the cash book
 * genuinely cannot see.
 */

/**
 * Whole rupees, grouped the Indian way.
 *
 * No paise. The register keeps them and the ledger shows them, but this screen
 * answers "how much is out with people" and "what is in the drawer" — questions
 * nobody asks to two decimal places, and ".00" on every one of forty figures is
 * forty pieces of noise between the reader and the digit that changed.
 *
 * Rounded rather than truncated, so a column of these still sums to within a
 * rupee of the ledger rather than drifting down by half a paisa a row.
 */
const money = (value: number | null | undefined) =>
  formatNumber(Math.round(Number(value ?? 0)), 0);

/**
 * Rupees with the sign kept, using a real minus (U+2212) rather than a hyphen.
 *
 * A negative balance is the one figure on this page somebody has to act on, and
 * a hyphen at 26px reads as a stray dash. The sign goes BEFORE the symbol —
 * "−₹22,555", not "₹−22,555" — because that is where the eye looks for it.
 */
function rupees(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `${n < 0 ? '−' : ''}₹${money(Math.abs(n))}`;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * An ISO date as "16 Sep 2026".
 *
 * Parsed by hand rather than through `new Date('2026-09-16')`, which the
 * browser reads as midnight UTC and renders in local time — west of Greenwich
 * that shows the day before, which on a "last cleared" column would be the one
 * error nobody would catch.
 */
function day(iso: string | null | undefined): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!parts) return '—';
  const month = MONTHS[Number(parts[2]) - 1];
  return month ? `${Number(parts[3])} ${month.slice(0, 3)} ${parts[1]}` : '—';
}

/** Why a band is empty, in words that send the reader to the right person. */
function absence(
  key: string,
  meta: AccountsBoardResponse['meta'] | undefined,
  subject: string,
): string | undefined {
  if (meta?.withheld?.includes(key)) {
    return `${subject} needs a permission you do not hold. Ask an administrator.`;
  }
  if (meta?.degraded?.includes(key)) {
    return `${subject} could not be read just now. The page keeps trying on its own.`;
  }
  return undefined;
}

// ───────────────────────────── small pieces ─────────────────────────────

function Panel({
  title,
  total,
  children,
  unavailable,
}: {
  title: string;
  total?: string;
  children: React.ReactNode;
  unavailable?: string;
}) {
  return (
    <Card className="ab-panel">
      <div className="ab-panel-head">
        <h3>{title}</h3>
        {total && !unavailable && (
          <span className="ab-panel-total">
            <span className="ab-panel-total-label">Total</span> {total}
          </span>
        )}
      </div>
      {unavailable ? (
        <p className="ab-absent">{unavailable}</p>
      ) : (
        <div className="ab-panel-body">{children}</div>
      )}
    </Card>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  note,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'filled' | 'alert';
  note?: string;
}) {
  return (
    <Card className={`ab-stat${tone ? ` ab-stat-${tone}` : ''}`}>
      <CardContent className="ab-stat-body">
        <div className="ab-stat-top">
          <span className="ab-stat-label">{label}</span>
          {hint && <span className="ab-stat-hint">{hint}</span>}
        </div>
        <p className="ab-stat-value">{value}</p>
        {note && <p className="ab-stat-note">{note}</p>}
      </CardContent>
    </Card>
  );
}

/** One line of the outstanding breakdown, with its share drawn behind it. */
function BucketRow({
  bucket,
  max,
  selected,
  onSelect,
}: {
  bucket: AccountsBucket;
  max: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const colour = BUCKET_COLOURS[bucket.key] ?? BUCKET_COLOUR_FALLBACK;
  // Share of the LARGEST line, not of the total: four lines summing to a total
  // would each be a sliver, and the question this answers is "which is biggest".
  const width = max > 0 ? Math.max(2, (bucket.amount / max) * 100) : 0;

  return (
    <button
      type="button"
      className={`ab-bucket${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="ab-bucket-top">
        <span className="ab-bucket-label">{bucket.label}</span>
        <span className="ab-bucket-amount">
          {bucket.has_source ? rupees(bucket.amount) : '—'}
        </span>
      </span>
      {bucket.has_source ? (
        <span className="ab-bucket-track">
          <span
            className="ab-bucket-fill"
            style={{ width: `${width}%`, background: colour }}
          />
        </span>
      ) : (
        <span className="ab-bucket-nosource">Not kept in the cash book</span>
      )}
    </button>
  );
}

/** A two- or three-column table of rows the Details panel can select. */
function RowTable<T>({
  head,
  rows,
  empty,
  isSelected,
  onSelect,
  render,
}: {
  head: string[];
  rows: T[];
  empty: string;
  isSelected: (row: T) => boolean;
  onSelect: (row: T) => void;
  render: (row: T) => React.ReactNode[];
}) {
  if (!rows.length) return <p className="ab-empty">{empty}</p>;

  return (
    // The wrapper carries the overflow. Putting it on the table needs
    // `display: block`, which throws the table's layout away and leaves it
    // shrink-wrapped against an empty half-panel.
    <div className="ab-table-scroll">
      <table className="ab-table">
        <thead>
          <tr>
            {head.map((label, index) => (
              <th key={label} className={index === 0 ? '' : 'ab-right'}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className={isSelected(row) ? 'is-selected' : ''}
              onClick={() => onSelect(row)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(row);
                }
              }}
            >
              {render(row).map((cell, cellIndex) => (
                <td key={cellIndex} className={cellIndex === 0 ? '' : 'ab-right'}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────── the details panel ────────────────────────────

/**
 * What one selected row actually is.
 *
 * Every branch shows the fields that row genuinely has rather than a fixed
 * shape padded with dashes — a panel that always shows "Status: —" teaches
 * people to stop reading it.
 */
function Details({
  selection,
  namesVisible,
  onClose,
}: {
  selection: AccountsSelection;
  namesVisible: boolean;
  onClose: () => void;
}) {
  if (!selection) {
    return (
      <p className="ab-details-idle">
        Select any row in the tables to see its full record here.
      </p>
    );
  }

  const field = (label: string, value: React.ReactNode) => (
    <div className="ab-field" key={label}>
      <span className="ab-field-label">{label}</span>
      <span className="ab-field-value">{value}</span>
    </div>
  );

  let heading = '';
  let fields: React.ReactNode[] = [];
  let body: React.ReactNode = null;

  if (selection.kind === 'imprest') {
    heading = `Imprest top-up · ${selection.row.name}`;
    fields = [
      field('Amount', rupees(selection.row.amount)),
      field('Loaded on', day(selection.row.last_updated)),
    ];
    body = (
      <p className="ab-details-note">
        {selection.row.detail ||
          'Money paid onto the imprest card. It becomes cash in the box later, when it is drawn off at a machine — so it is never added to the box total.'}
      </p>
    );
  } else if (selection.kind === 'pending') {
    const row = selection.row;
    heading = row.item;
    fields = [
      field('Amount', rupees(row.amount)),
      field('Dated', day(row.entry_date)),
      field('G/L head', row.gl_account_name || '—'),
      field('Branch', row.branch ?? '—'),
      field(
        'Status',
        row.bunch ? `In bunch ${row.bunch}, not sent` : 'Not yet bundled',
      ),
    ];
    body = row.detail ? <p className="ab-details-note">{row.detail}</p> : null;
  } else if (selection.kind === 'salary') {
    heading = `Salary advance · ${selection.row.name}`;
    fields = [
      field('Amount', rupees(selection.row.amount)),
      field('Vouchers', selection.row.count ?? '—'),
      field('Last dated', day(selection.row.last_updated)),
    ];
    body = (
      <p className="ab-details-note">
        Read from the cash book&apos;s salary heads. No payroll figure is shown
        anywhere on this screen.
      </p>
    );
  } else if (selection.kind === 'holder') {
    heading = `${selection.owed ? 'Owed to' : 'Held by'} ${selection.row.name}`;
    fields = [
      field('Amount', rupees(selection.row.amount)),
      field('Last cleared', day(selection.row.last_updated)),
    ];
    body = (
      <p className="ab-details-note">
        {selection.owed
          ? 'They paid for something themselves and explained what for, so the factory owes them. This is not a small advance — it is the opposite movement.'
          : 'The factory’s cash in their pocket, not yet explained. “Last cleared” is the most recent payment booked against them.'}
      </p>
    );
  } else {
    heading = selection.row.label;
    fields = [
      field(
        'Amount',
        selection.row.has_source ? rupees(selection.row.amount) : 'Not kept',
      ),
      field('Vouchers', selection.row.count),
    ];
    body = (
      <>
        <p className="ab-details-note">{selection.row.note}</p>
        {selection.row.heads.length > 0 && (
          <table className="ab-table ab-table-tight">
            <tbody>
              {selection.row.heads.map((head) => (
                <tr key={head.code}>
                  <td>{head.name}</td>
                  <td className="ab-right">{rupees(head.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  }

  return (
    <>
      <div className="ab-details-selected">
        <span className="ab-field-label">Selected</span>
        <h4>{heading}</h4>
      </div>
      <div className="ab-fields">{fields}</div>
      {body}
      {!namesVisible &&
        (selection.kind === 'salary' || selection.kind === 'holder') && (
          <p className="ab-details-masked">
            Names are hidden for your login. The figures are complete.
          </p>
        )}
      <Button variant="ghost" className="ab-details-close" onClick={onClose}>
        <X className="mr-2 h-4 w-4" /> Clear selection
      </Button>
    </>
  );
}

// ──────────────────────────────── the page ────────────────────────────────

export default function AccountsDashboardPage() {
  // Opens on the newest month the book has, not on a five-month total. The
  // SERVER resolves `latest`, so this costs one round trip rather than
  // fetching everything, reading the month list off it and fetching again.
  const [period, setPeriod] = useState<AccountsPeriodChoice>({ kind: 'latest' });
  const [selection, setSelection] = useState<AccountsSelection>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading, isError } = useAccountsBoard(period);
  const { hasPermission } = usePermission();
  const canRecord = hasPermission(CASH_BOOK_PERMISSIONS.MANAGE);

  const meta = data?.meta;
  const headline = data?.headline;
  const detail = data?.detail;

  /**
   * Default to the newest month the book has, once we know what that is.
   *
   * Not defaulted before the first response: the client cannot know which
   * months were traded, and guessing "this month" would open the screen on a
   * page of zeroes for a book whose last entry was in August.
   */
  const periods = meta?.periods ?? [];
  // Driven by what came BACK, not by what was asked for: with `latest` the
  // client does not know which month it got until the server says so.
  const periodValue = meta?.period
    ? `${meta.period.year}-${meta.period.month}`
    : 'all';

  const bucketMax = useMemo(
    () => Math.max(0, ...(detail?.buckets ?? []).map((b) => b.amount)),
    [detail],
  );

  if (isError && !data) {
    return (
      <div className="ab-page">
        <p className="ab-absent">
          The accounts dashboard could not be read. It keeps trying on its own.
        </p>
      </div>
    );
  }

  const periodLabel = meta?.period
    ? `${MONTHS[meta.period.month - 1]} ${meta.period.year}`
    : 'the whole book';

  return (
    <div className="ab-page">
      {/* ── header ───────────────────────────────────────────────────── */}
      <header className="ab-header">
        <div>
          <h2>Accounts Dashboard</h2>
          <p>
            Imprest, cash and advances
            {meta?.company ? ` · ${meta.company}` : ''}
            {meta?.generated_at
              ? ` · updated ${new Date(meta.generated_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : ''}
          </p>
        </div>

        <div className="ab-header-actions">
          <label className="ab-period">
            <span>Period</span>
            <select
              value={periodValue}
              onChange={(event) => {
                const next = event.target.value;
                if (next === 'all') {
                  setPeriod({ kind: 'all' });
                  return;
                }
                const [year, month] = next.split('-').map(Number);
                setPeriod({ kind: 'month', year, month });
              }}
            >
              <option value="all">Whole book</option>
              {periods.map((option) => (
                <option
                  key={`${option.year}-${option.month}`}
                  value={`${option.year}-${option.month}`}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <Button variant="outline" asChild>
            <a href="/accounts/cash-book">
              <FileDown className="mr-2 h-4 w-4" /> View ledger
            </a>
          </Button>

          {canRecord && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add entry
            </Button>
          )}
        </div>
      </header>

      {meta?.warnings?.map((warning) => (
        <p key={warning} className="ab-warning">
          {warning}
        </p>
      ))}

      {/* ── three columns ────────────────────────────────────────────── */}
      <div className="ab-grid">
        {/* left rail: the four figures, then the breakdown */}
        <div className="ab-rail">
          {(() => {
            const unavailable = absence('headline', meta, 'The cash summary');
            if (unavailable) return <p className="ab-absent">{unavailable}</p>;
            if (!headline)
              return <p className="ab-empty">{isLoading ? 'Loading…' : '—'}</p>;

            return (
              <>
                <StatCard
                  label="Imprest issued"
                  value={rupees(headline.imprest_issued)}
                  hint={`${headline.imprest_count} top-ups`}
                  // The card balance rather than a restatement of the period:
                  // "on minus off" is the subtraction this pair invites, and it
                  // is wrong — the real figure carries the card's opening and
                  // every earlier month. Showing it here means nobody needs to
                  // do the sum.
                  note={`Onto the card, ${periodLabel} · ₹${money(
                    data?.imprest?.card_balance,
                  )} still on it`}
                />
                <StatCard
                  label="Cash issued"
                  value={rupees(headline.cash_issued)}
                  hint={`${headline.cash_issued_count} withdrawals`}
                  // Drawn off the card is the other end of the float above.
                  // What was SPENT is a third figure again, so it is stated
                  // here rather than left to be confused with either.
                  note={`Drawn off the card, ${periodLabel} · ₹${money(
                    headline.paid_out,
                  )} spent out of the box`}
                />
                <StatCard
                  label="Cash pending from HO"
                  value={rupees(headline.pending_ho)}
                  hint={
                    headline.pending_ho_count > 0
                      ? `${headline.pending_ho_count} vouchers`
                      : 'Nothing waiting'
                  }
                  note="Not yet sent · all time"
                />
                <StatCard
                  label="Cash in hand"
                  value={rupees(headline.cash_in_hand)}
                  hint="Closing balance"
                  tone={headline.in_hand_negative ? 'alert' : 'filled'}
                  note={
                    headline.in_hand_negative
                      ? 'Below zero: more has left the box than the register shows arriving. Usually a receipt not yet typed.'
                      : 'As of now, all time — not the period'
                  }
                />
              </>
            );
          })()}

          <Card className="ab-panel">
            <div className="ab-panel-head">
              <h3>Outstanding breakdown</h3>
            </div>
            <div className="ab-panel-body">
              {absence('detail', meta, 'The breakdown') ? (
                <p className="ab-absent">{absence('detail', meta, 'The breakdown')}</p>
              ) : !detail ? (
                <p className="ab-empty">{isLoading ? 'Loading…' : '—'}</p>
              ) : (
                <>
                  {detail.buckets.map((bucket) => (
                    <BucketRow
                      key={bucket.key}
                      bucket={bucket}
                      max={bucketMax}
                      selected={
                        selection?.kind === 'bucket' &&
                        selection.row.key === bucket.key
                      }
                      onSelect={() =>
                        setSelection({ kind: 'bucket', row: bucket })
                      }
                    />
                  ))}
                  {detail.other.count > 0 && (
                    <p className="ab-other">
                      Other heads {rupees(detail.other.amount)} over{' '}
                      {detail.other.count} vouchers
                    </p>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        {/* middle: the details panel */}
        <Card className="ab-panel ab-details">
          <div className="ab-panel-head">
            <h3>Details</h3>
            {selection && (
              <button
                type="button"
                className="ab-icon-button"
                onClick={() => setSelection(null)}
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="ab-panel-body">
            <Details
              selection={selection}
              namesVisible={meta?.names_visible ?? true}
              onClose={() => setSelection(null)}
            />
          </div>
        </Card>

        {/* right: the three tables */}
        <div className="ab-tables">
          <Panel
            title="Imprest issued"
            total={rupees(data?.imprest?.total)}
            unavailable={absence('imprest', meta, 'The imprest cards')}
          >
            <RowTable
              head={['Card', 'Amount', 'Loaded on']}
              rows={data?.imprest?.rows ?? []}
              empty="No imprest card was loaded in this period."
              isSelected={(row) =>
                selection?.kind === 'imprest' && selection.row.id === row.id
              }
              onSelect={(row) => setSelection({ kind: 'imprest', row })}
              render={(row) => [
                row.name,
                rupees(row.amount),
                day(row.last_updated),
              ]}
            />
            {data?.imprest?.truncated && (
              <p className="ab-other">
                Showing the {data.imprest.rows.length} most recent of{' '}
                {data.imprest.count}.
              </p>
            )}
          </Panel>

          <Panel
            title="Pending expenses from HO"
            total={rupees(data?.pending_ho?.total)}
            unavailable={absence('pending_ho', meta, 'The pending list')}
          >
            <RowTable
              head={['Item', 'Dated', 'Amount']}
              rows={data?.pending_ho?.rows ?? []}
              empty={
                data?.pending_ho
                  ? `Nothing waiting. All ${data.pending_ho.sent_bunches} bunches have gone to head office.`
                  : 'Loading…'
              }
              isSelected={(row) =>
                selection?.kind === 'pending' && selection.row.id === row.id
              }
              onSelect={(row) => setSelection({ kind: 'pending', row })}
              render={(row) => [
                row.item,
                day(row.entry_date),
                rupees(row.amount),
              ]}
            />
            {data?.pending_ho?.truncated && (
              <p className="ab-other">
                Showing the {data.pending_ho.rows.length} most recent of{' '}
                {data.pending_ho.count}.
              </p>
            )}
          </Panel>

          <Panel
            title="Salary advance"
            total={rupees(data?.salary?.total)}
            unavailable={absence('salary', meta, 'The salary advances')}
          >
            <RowTable
              head={['Name', 'Amount', 'Last dated']}
              rows={data?.salary?.rows ?? []}
              empty="No salary advance in this period."
              isSelected={(row) =>
                selection?.kind === 'salary' && selection.row.name === row.name
              }
              onSelect={(row) => setSelection({ kind: 'salary', row })}
              render={(row) => [
                row.name,
                rupees(row.amount),
                day(row.last_updated),
              ]}
            />
            {(data?.salary?.unattributed.count ?? 0) > 0 && (
              <p className="ab-other">
                {rupees(data?.salary?.unattributed.amount)} over{' '}
                {data?.salary?.unattributed.count} vouchers names nobody the
                register can resolve. It is in the total above.
              </p>
            )}
          </Panel>

          <Panel
            // No panel-level total: each column states its own, and one figure
            // in the header would silently be the left column's while sitting
            // above both.
            title="Cash out with people"
            unavailable={absence('cash_issued', meta, 'The advance holders')}
          >
            {/* Side by side, never stacked into one running list: the two
                point opposite ways — our cash in their pocket, theirs in our
                till — and a single column invites reading the second block as
                more of the first. They are also never added together. */}
            <div className="ab-people">
              <div className="ab-people-col">
                <p className="ab-subhead">
                  Out with people ·{' '}
                  {rupees(data?.cash_issued?.holders.holding.total)}
                </p>
                <RowTable
                  head={['Name', 'Amount', 'Last cleared']}
                  rows={data?.cash_issued?.holders.holding.rows ?? []}
                  empty="Nobody is holding the factory's cash."
                  isSelected={(row) =>
                    selection?.kind === 'holder' &&
                    !selection.owed &&
                    selection.row.name === row.name
                  }
                  onSelect={(row) =>
                    setSelection({ kind: 'holder', row, owed: false })
                  }
                  render={(row) => [
                    row.name,
                    rupees(row.amount),
                    day(row.last_updated),
                  ]}
                />
              </div>

              {(data?.cash_issued?.holders.owed.people ?? 0) > 0 && (
                <div className="ab-people-col">
                  <p className="ab-subhead">
                    Owed back to people ·{' '}
                    {rupees(data?.cash_issued?.holders.owed.total)}
                  </p>
                  <RowTable
                    head={['Name', 'Amount', 'Last cleared']}
                    rows={data?.cash_issued?.holders.owed.rows ?? []}
                    empty=""
                    isSelected={(row) =>
                      selection?.kind === 'holder' &&
                      selection.owed &&
                      selection.row.name === row.name
                    }
                    onSelect={(row) =>
                      setSelection({ kind: 'holder', row, owed: true })
                    }
                    render={(row) => [
                      row.name,
                      rupees(row.amount),
                      day(row.last_updated),
                    ]}
                  />
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* The book's own check, stated rather than asserted. */}
      {headline && (
        <p className="ab-foot">
          {headline.reconciliation.balances ? (
            <>
              <Wallet className="h-3.5 w-3.5" /> The book balances: cash in less
              spending, advances and what is owed comes to the cash in hand
              exactly.
            </>
          ) : (
            <Badge variant="destructive">
              The book is out by {rupees(headline.reconciliation.difference)}
            </Badge>
          )}
        </p>
      )}

      {addOpen && (
        <CashEntryDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          entry={null}
          presetDirection="OUT"
        />
      )}
    </div>
  );
}
