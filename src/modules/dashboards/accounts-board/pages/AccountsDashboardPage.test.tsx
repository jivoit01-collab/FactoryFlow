import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountsBoardResponse } from '../types';

/**
 * What these pin down.
 *
 * The screen's whole job is to keep four figures from being read as the same
 * kind of number, and to refuse to fake the ones it does not have. Both of
 * those failure modes are INVISIBLE — a clamped negative and a fabricated zero
 * each render as a perfectly plausible dashboard — so they are tested rather
 * than left to review.
 */

const useAccountsBoard = vi.fn();

vi.mock('../api', () => ({
  useAccountsBoard: (...args: unknown[]) => useAccountsBoard(...args),
}));

// The register's own dialog. Not under test here, and importing it for real
// drags the whole SAP G/L picker into a page test.
vi.mock('@/modules/accounts/pages/CashEntryDialog', () => ({
  CashEntryDialog: () => null,
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

import AccountsDashboardPage from './AccountsDashboardPage';

function board(over: Partial<AccountsBoardResponse> = {}): AccountsBoardResponse {
  return {
    headline: {
      imprest_issued: 1165000,
      imprest_count: 12,
      into_box: 993209,
      into_box_count: 31,
      cash_issued: 921662,
      cash_issued_count: 466,
      pending_ho: 0,
      pending_ho_count: 0,
      cash_in_hand: 50414,
      in_hand_negative: false,
      reconciliation: {
        cash_in: 991933,
        cash_out: 896602,
        awaiting_approval: 25060,
        advance_given: 42826,
        owed_to_people: 22969,
        difference: 0,
        balances: true,
      },
    },
    imprest: {
      total: 1165000,
      count: 12,
      holders: 1,
      rows: [
        {
          id: 21,
          name: 'Ginni Vg Imprest Debit Card (Vishal)',
          amount: 150000,
          last_updated: '2026-09-17',
          detail: '',
        },
        {
          id: 20,
          name: 'Ginni Vg Imprest Debit Card (Vishal)',
          amount: 100000,
          last_updated: '2026-09-02',
          detail: '',
        },
      ],
      truncated: false,
      cards: [
        {
          id: 6,
          name: 'Ginni Vg Imprest Debit Card (Vishal)',
          amount: 1165000,
          count: 12,
          last_updated: '2026-09-17',
        },
      ],
      into_box: {
        total: 993209,
        count: 31,
        drawn_off_card: 941933,
        drawn_off_card_count: 29,
        handed_in: 51276,
        handed_in_count: 2,
      },
      span: { from: '2026-06-04', to: '2026-09-17' },
    },
    cash_issued: {
      total: 921662,
      debits: 466,
      states: [],
      by_branch: [],
      handouts: { total: 271707, count: 38, people: 13 },
      holders: {
        holding: {
          rows: [{ name: 'Bunty', amount: 21626, last_updated: '2026-09-24' }],
          people: 1,
          total: 21626,
        },
        owed: {
          rows: [{ name: 'Kamal HR', amount: 3790, last_updated: null }],
          people: 1,
          total: 3790,
        },
      },
      span: { from: '2026-04-01', to: '2026-09-17' },
    },
    pending_ho: {
      total: 0,
      count: 0,
      rows: [],
      truncated: false,
      unsent_bunches: 0,
      sent_bunches: 47,
    },
    detail: {
      buckets: [
        {
          key: 'vendor_ap',
          label: 'Vendor A/P',
          note: 'Cash paid to suppliers out of the box.',
          has_source: true,
          amount: 496064,
          count: 259,
          heads: [],
        },
        {
          key: 'payment_pending',
          label: 'Payment pending',
          note: 'Out of the drawer, not yet agreed.',
          has_source: true,
          amount: 25060,
          count: 11,
          heads: [],
        },
      ],
      other: { amount: 0, count: 0, heads: [] },
      total: 921662,
      debits: 466,
    },
    salary: {
      total: 49617,
      count: 26,
      people: 1,
      rows: [{ name: 'Bunty', amount: 5000, count: 2, last_updated: '2026-06-10' }],
      unattributed: { amount: 42117, count: 24 },
      heads: [],
      span: { from: '2026-04-01', to: '2026-09-17' },
    },
    meta: {
      company: 'Jivo Oil',
      as_of: '2026-09-18',
      generated_at: '2026-09-18T10:42:00Z',
      refresh_seconds: 300,
      period: null,
      periods: [
        { year: 2026, month: 9, label: 'September 2026' },
        { year: 2026, month: 8, label: 'August 2026' },
      ],
      names_visible: true,
      degraded: [],
      withheld: [],
      warnings: [],
    },
    ...over,
  };
}

function show(response: AccountsBoardResponse) {
  useAccountsBoard.mockReturnValue({
    data: response,
    isLoading: false,
    isError: false,
  });
  return render(<AccountsDashboardPage />);
}

beforeEach(() => {
  useAccountsBoard.mockReset();
});

describe('the four headline figures', () => {
  it('labels the flows with the period and the balance without one', () => {
    /**
     * The one distinction the screen rests on. Three cards answer "during the
     * period" and one answers "as of now"; they sit in one column, so only
     * these sub-labels stop somebody subtracting the fourth from the first.
     */
    show(board());

    expect(screen.getByText(/Loaded onto the card, the whole book/i)).toBeInTheDocument();
    expect(screen.getByText(/Out of the box, the whole book/i)).toBeInTheDocument();
    expect(screen.getByText(/not the period/i)).toBeInTheDocument();
  });

  it('names the selected month on the flow cards', () => {
    show(
      board({
        meta: {
          ...board().meta,
          period: { year: 2026, month: 9, from: '2026-09-01', to: '2026-09-30' },
        },
      }),
    );

    expect(screen.getByText(/Loaded onto the card, September 2026/i)).toBeInTheDocument();
    // The balance still refuses the period.
    expect(screen.getByText(/not the period/i)).toBeInTheDocument();
  });

  it('groups rupees the Indian way, and drops the paise', () => {
    // Lakhs, not thousands: 11,65,000 rather than 1,165,000. It appears on the
    // stat card and again as the imprest panel's total, so both are accepted.
    show(board());
    expect(screen.getAllByText('₹11,65,000').length).toBeGreaterThan(0);
    expect(screen.queryByText('₹11,65,000.00')).not.toBeInTheDocument();
  });
});

describe('the imprest figure', () => {
  /**
   * Two populations that look like one. A card is loaded, and later drawn off
   * at a machine — only the second is a receipt into the box. Adding them
   * would double the money, and the numbers are close enough that a wrong one
   * would never look wrong.
   */
  it('is what was loaded onto the card, not what reached the box', () => {
    show(board());

    expect(screen.getAllByText('₹11,65,000').length).toBeGreaterThan(0);
    // 11,65,000 + 9,93,209. If this renders, the two have been summed.
    expect(screen.queryByText('₹21,58,209')).not.toBeInTheDocument();
  });

  it('states the box figure beside it rather than leaving it assumed', () => {
    show(board());
    expect(screen.getByText(/reached the box/i)).toBeInTheDocument();
  });

  it('counts top-ups, not receipts', () => {
    show(board());
    expect(screen.getByText('12 top-ups')).toBeInTheDocument();
  });

  it('lists every top-up, newest first, not one row per card', () => {
    show(board());

    const rows = screen.getAllByText('Ginni Vg Imprest Debit Card (Vishal)');
    expect(rows.length).toBe(2);
    expect(screen.getByText('₹1,50,000')).toBeInTheDocument();
    expect(screen.getByText('₹1,00,000')).toBeInTheDocument();
  });
});

describe('a negative balance', () => {
  /**
   * The invisible failure. A book below zero means more has left the box than
   * the register shows arriving, which is the condition somebody has to act on
   * — and a screen that clamps it at zero looks healthiest exactly then.
   */
  it('is shown in full, with its sign, and explained', () => {
    show(
      board({
        headline: {
          ...board().headline!,
          cash_in_hand: -22555,
          in_hand_negative: true,
        },
      }),
    );

    expect(screen.getByText('−₹22,555')).toBeInTheDocument();
    expect(screen.getByText(/Below zero/i)).toBeInTheDocument();
  });

  it('is never clamped to zero', () => {
    // Scoped to the in-hand card itself: a plain ₹0 is legitimate elsewhere on
    // the page — nothing is pending from head office — and asserting over the
    // whole document would pass for the wrong reason.
    const { container } = show(
      board({
        headline: {
          ...board().headline!,
          cash_in_hand: -22555,
          in_hand_negative: true,
        },
      }),
    );

    const card = container.querySelector('.ab-stat-alert');
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText('−₹22,555')).toBeInTheDocument();
    expect(within(card as HTMLElement).queryByText('₹0')).not.toBeInTheDocument();
  });
});

describe('a line the register has no source for', () => {
  it('says so rather than printing a confident zero', () => {
    /**
     * "Genuinely nil" and "nobody configured a source" look identical as 0.00
     * and mean opposite things.
     */
    const base = board();
    show(
      board({
        detail: {
          ...base.detail!,
          buckets: [
            {
              key: 'payment_penalty',
              label: 'Payment penalty',
              note: 'The cash book keeps no penalty head.',
              has_source: false,
              amount: 0,
              count: 0,
              heads: [],
            },
          ],
        },
      }),
    );

    expect(screen.getByText(/Not kept in the cash book/i)).toBeInTheDocument();
  });
});

describe('a zero that is an answer', () => {
  it('says how many bunches have already gone', () => {
    show(board());

    expect(
      screen.getByText(/All 47 bunches have gone to head office/i),
    ).toBeInTheDocument();
  });
});

describe('money out with people', () => {
  it('never adds what is held to what is owed', () => {
    /**
     * One is the factory's cash in somebody's pocket; the other is their cash
     * in the factory's till. A single netted figure states neither, which is
     * why `cash_book.services` keeps them apart — and why this screen must not
     * quietly put them back together.
     */
    show(board());

    expect(screen.getAllByText('₹21,626').length).toBeGreaterThan(0);
    expect(screen.getByText(/Owed back to people · ₹3,790/i)).toBeInTheDocument();
    // 21,626 + 3,790. If this ever renders, the two have been netted.
    expect(screen.queryByText('₹25,416')).not.toBeInTheDocument();
  });
});

describe('the salary section', () => {
  it('declares the money it could not attribute to a person', () => {
    show(board());

    expect(
      screen.getByText(/names nobody the register can resolve/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/₹42,117/)).toBeInTheDocument();
  });
});

describe('a band that is missing', () => {
  it('sends a withheld reader to an administrator', () => {
    show(
      board({
        salary: null,
        meta: { ...board().meta, withheld: ['salary'] },
      }),
    );

    expect(screen.getByText(/needs a permission you do not hold/i)).toBeInTheDocument();
  });

  it('sends a degraded reader to the source, not to an administrator', () => {
    show(
      board({
        salary: null,
        meta: { ...board().meta, degraded: ['salary'] },
      }),
    );

    expect(screen.getByText(/could not be read just now/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/needs a permission you do not hold/i),
    ).not.toBeInTheDocument();
  });
});

describe('the details panel', () => {
  it('opens the record for the row that was clicked', () => {
    // Both top-ups are on the same card, so the panel has to identify the one
    // that was clicked by its own date and amount, not by the card's name.
    const { container } = show(board());

    fireEvent.click(screen.getAllByText('Ginni Vg Imprest Debit Card (Vishal)')[1]);

    const panel = within(container.querySelector('.ab-details') as HTMLElement);
    expect(
      panel.getByText(/Imprest top-up · Ginni Vg Imprest Debit Card/i),
    ).toBeInTheDocument();
    expect(panel.getByText('₹1,00,000')).toBeInTheDocument();
    expect(panel.getByText('2 Sep 2026')).toBeInTheDocument();
  });

  it('tells a masked reader the figures are still complete', () => {
    show(board({ meta: { ...board().meta, names_visible: false } }));

    fireEvent.click(screen.getAllByText('Bunty')[0]);

    expect(screen.getByText(/Names are hidden for your login/i)).toBeInTheDocument();
  });
});

describe('the book’s own check', () => {
  it('states that it balances rather than asserting it silently', () => {
    show(board());
    expect(screen.getByText(/The book balances/i)).toBeInTheDocument();
  });

  it('shouts when it does not', () => {
    show(
      board({
        headline: {
          ...board().headline!,
          reconciliation: {
            ...board().headline!.reconciliation,
            difference: 1200,
            balances: false,
          },
        },
      }),
    );

    expect(screen.getByText(/The book is out by ₹1,200/i)).toBeInTheDocument();
  });
});

describe('the period selector', () => {
  it('asks the server for the newest month on first load', () => {
    /**
     * Not 'all'. The screen opens on the month somebody is working in, and
     * `latest` is resolved server-side so that costs one round trip rather
     * than fetching the whole book to find out which month is newest.
     */
    show(board());
    expect(useAccountsBoard).toHaveBeenCalledWith({ kind: 'latest' });
  });

  it('shows the month the server resolved, not the word it was asked for', () => {
    show(
      board({
        meta: {
          ...board().meta,
          period: { year: 2026, month: 9, from: '2026-09-01', to: '2026-09-30' },
        },
      }),
    );

    expect(screen.getByRole('combobox')).toHaveValue('2026-9');
  });

  it('offers only the months the book actually traded in', () => {
    show(board());

    const select = screen.getByRole('combobox');
    const options = within(select).getAllByRole('option');

    expect(options.map((o) => o.textContent)).toEqual([
      'Whole book',
      'September 2026',
      'August 2026',
    ]);
  });
});
