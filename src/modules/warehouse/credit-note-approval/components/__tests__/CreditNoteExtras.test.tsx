/**
 * Withdraw and Without Qty Posting on an opened credit-note row, shown only
 * where the server's `actions/` says they apply.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreditNoteActions, CreditNoteApproval } from '../../types';

let actions: CreditNoteActions | undefined;
vi.mock('../../api/creditNoteApproval.queries', () => ({
  useCreditNoteActions: () => ({ data: actions }),
  useWithdrawCreditNote: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

import { CreditNoteExtras } from '../CreditNoteExtras';

const ROW = {
  id: 75424,
  status: 'PENDING',
  doc_type_label: 'A/R Credit Note',
  party_name: 'ILAHI CO.',
} as CreditNoteApproval;

function base(overrides: Partial<CreditNoteActions> = {}): CreditNoteActions {
  return {
    wdd_code: 75424,
    status: 'PENDING',
    is_originator: false,
    can_withdraw: false,
    withdraw_note: 'Only the person who raised it can withdraw it.',
    without_qty_posting: { current: false, item_lines: 2, can_set: false },
    ...overrides,
  };
}

function renderExtras(withoutQty?: boolean) {
  const onChange = vi.fn();
  const view = render(
    <CreditNoteExtras
      row={ROW}
      withoutQty={withoutQty}
      onWithoutQtyChange={onChange}
      onResult={vi.fn()}
      onError={vi.fn()}
    />,
  );
  return { ...view, onChange };
}

describe('CreditNoteExtras', () => {
  beforeEach(() => {
    actions = undefined;
  });

  it('shows nothing to someone who can do neither', () => {
    actions = base();
    const { container } = renderExtras();
    expect(container).toBeEmptyDOMElement();
  });

  it('offers Withdraw to the originator the server cleared', () => {
    actions = base({ is_originator: true, can_withdraw: true, withdraw_note: null });
    renderExtras();
    expect(screen.getByRole('button', { name: /Withdraw request/ })).toBeInTheDocument();
  });

  it('tells the originator why not, instead of a button', () => {
    actions = base({
      is_originator: true,
      withdraw_note: 'Your SAP password is not stored on the server.',
    });
    renderExtras();
    expect(screen.queryByRole('button', { name: /Withdraw/ })).not.toBeInTheDocument();
    expect(screen.getByText(/not stored on the server/)).toBeInTheDocument();
  });

  it('sends a Without Qty Posting choice only when it differs from SAP', () => {
    actions = base({ without_qty_posting: { current: false, item_lines: 2, can_set: true } });
    const { onChange, rerender } = renderExtras();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Without Qty Posting' }));
    expect(onChange).toHaveBeenLastCalledWith(true);

    rerender(
      <CreditNoteExtras
        row={ROW}
        withoutQty
        onWithoutQtyChange={onChange}
        onResult={vi.fn()}
        onError={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Without Qty Posting' }));
    // Back to what SAP already holds: nothing to send.
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});
