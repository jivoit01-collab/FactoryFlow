/**
 * The approved-draft queue reads as a list, opened a row at a time.
 *
 * It is a backlog of twenty-odd documents, and the question asked of it is what
 * is sitting here and how long it has sat — so a row states the document and
 * its items stay folded away until somebody asks for them. The exception is a
 * search: a row that came back from one usually matched on an item, which is
 * inside it.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SapTransferDraft } from '../../../types';
import { SapUnpostedDraftTable } from '../SapUnpostedDraftTable';

vi.mock('../../../api', () => ({
  useAddSapTransferDraft: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

const draft: SapTransferDraft = {
  draft_entry: 4321,
  doc_num: 726676913,
  doc_date: '2026-07-24',
  from_warehouse: 'BH-GR',
  to_warehouse: 'BH-SC',
  comments: 'disassembly entery',
  journal_memo: null,
  branch_id: 1,
  created_by: 'PANKAJ',
  age_days: 52,
  approval_status: 'Y',
  can_post: true,
  blocked_reason: null,
  warnings: [],
  will_be_refused: false,
  lines: [
    {
      line_num: 0,
      item_code: 'SC0000007',
      item_name: 'TROLLY BAG',
      uom: 'PCS',
      quantity: '16',
      from_warehouse: 'BH-GR',
      to_warehouse: 'BH-SC',
      source_stock: '16',
      short: false,
      source_empty: false,
      batch_managed: false,
      batches_allocated: 0,
      allocated_quantity: '0',
      batches_missing: false,
      allocation_partial: false,
      batches_short: [],
      last_issue: null,
    },
  ],
};

/** A draft SAP is certain to refuse — the shape the first live add hit. */
const refused: SapTransferDraft = {
  ...draft,
  warnings: ['BH-GR holds none of SC0000007 any more, so this draft can no longer be added.'],
  will_be_refused: true,
  lines: [
    {
      ...draft.lines[0],
      source_stock: '0',
      short: true,
      source_empty: true,
      batch_managed: true,
      batches_allocated: 1,
      allocated_quantity: '16',
      batches_short: [{ batch: 'LS1103', allocated: '16', in_stock: '0' }],
      last_issue: {
        doc_num: '726678123',
        doc_type: 'inventory transfer',
        doc_date: '2026-07-25',
        quantity: '16',
      },
    },
  ],
};

function show(rows: SapTransferDraft[], searching = false) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SapUnpostedDraftTable rows={rows} isLoading={false} isError={false} searching={searching} />
    </QueryClientProvider>,
  );
}

describe('SapUnpostedDraftTable', () => {
  it('lists a draft with its items folded away', () => {
    show([draft]);

    expect(screen.getByText('SAP 726676913')).toBeTruthy();
    // What the row says without being opened: how many items, and how long.
    expect(screen.getByText('1 item')).toBeTruthy();
    expect(screen.getByText('52 days unposted')).toBeTruthy();
    expect(screen.queryByText('TROLLY BAG')).toBeNull();
  });

  it('opens one row on a click and folds it back', () => {
    show([draft]);

    const toggle = screen.getByRole('button', { expanded: false });
    fireEvent.click(toggle);
    expect(screen.getByText('TROLLY BAG')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { expanded: true }));
    expect(screen.queryByText('TROLLY BAG')).toBeNull();
  });

  it('adds a draft from the row itself, without opening it', () => {
    show([draft]);

    // Nothing has to be filled in to add a draft, so a backlog can be cleared
    // without expanding every row.
    expect(screen.getByRole('button', { name: /Add in SAP/i })).toBeTruthy();
    expect(screen.queryByText('TROLLY BAG')).toBeNull();
  });

  it('opens the rows a search returned', () => {
    show([draft], true);

    expect(screen.getByText('TROLLY BAG')).toBeTruthy();
  });

  it('says a row is blocked without making anyone open it', () => {
    show([{ ...draft, can_post: false, blocked_reason: 'The source is short.' }]);

    expect(screen.getByText('blocked')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add in SAP/i })).toBeNull();
  });

  describe('a draft SAP will refuse', () => {
    it('does not offer Add on the row', () => {
      /* The refusal is certain, so the one-click path is the wrong one: five
         identical presses is what happened when it was offered anyway. */
      show([refused]);

      expect(screen.getByText('SAP will refuse')).toBeTruthy();
      expect(screen.queryByRole('button', { name: /Add in SAP/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Add anyway/i })).toBeNull();
    });

    it('offers it inside, under the reason', () => {
      // Not removed: SAP, not this page, is the authority on its own stock.
      show([refused], true);

      expect(screen.getByText(/holds none of SC0000007/)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Add anyway/i })).toBeTruthy();
    });

    it('names the batch and the document that took the stock', () => {
      show([refused], true);

      expect(screen.getByText(/batch LS1103/)).toBeTruthy();
      expect(screen.getByText(/0 of 16/)).toBeTruthy();
    });
  });
});
