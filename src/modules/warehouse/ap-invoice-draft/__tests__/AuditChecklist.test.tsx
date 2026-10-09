/**
 * The checklist: each check's finding, a person's decision over it, and the
 * review controls only for those who may review. The query hook is mocked.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mutate = vi.fn();
vi.mock('../api', () => ({
  useReviewCheck: () => ({ mutate, isPending: false }),
}));

import { AuditChecklist } from '../components/AuditChecklist';
import type { APInvoiceDraftCheck } from '../types';

function check(overrides: Partial<APInvoiceDraftCheck>): APInvoiceDraftCheck {
  return {
    key: 'warehouse',
    position: 0,
    label: 'GRPO is received into BH-PM',
    status: 'PASS',
    detail: 'Every line went into BH-PM.',
    facts: {},
    review_decision: '',
    review_remark: '',
    reviewed_by_name: '',
    reviewed_at: null,
    effective_status: 'PASS',
    ...overrides,
  };
}

const CHECKS = [
  check({}),
  check({
    key: 'rate_check_signature',
    position: 1,
    label: "Kulbeer's signature on the invoice's Rate Check stamp",
    status: 'FAIL',
    effective_status: 'FAIL',
    detail: 'Nobody has signed the Rate Check line.',
  }),
  check({
    key: 'po_rate',
    position: 2,
    label: 'PO rate matches GRPO rate',
    status: 'PASS',
    effective_status: 'PASS',
    detail: 'Every line is at the PO’s rate.',
    facts: {
      lines: [{ line: 1, item_code: 'PM0000817', grpo_price: '3.321', po_price: '3.3217' }],
    },
  }),
  check({
    key: 'qc',
    position: 3,
    label: 'QC approved',
    status: 'REVIEW',
    effective_status: 'PASS',
    review_decision: 'OK',
    review_remark: 'QC register p. 14',
    reviewed_by_name: 'Auditor',
    detail: 'No QC record here.',
  }),
];

describe('AuditChecklist', () => {
  beforeEach(() => mutate.mockClear());

  it('shows every check in order with its finding', () => {
    render(<AuditChecklist entryId={7} checks={CHECKS} canReview={false} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[1]).toHaveTextContent("2. Kulbeer's signature on the invoice's Rate Check stamp");
    expect(items[1]).toHaveTextContent('Not OK');
    expect(items[1]).toHaveTextContent('Nobody has signed the Rate Check line.');
  });

  it('says who overrode the app, and what the app had found', () => {
    render(<AuditChecklist entryId={7} checks={CHECKS} canReview={false} />);
    const qc = screen.getAllByRole('listitem')[3];
    expect(qc).toHaveTextContent('Marked OK by Auditor');
    expect(qc).toHaveTextContent('“QC register p. 14”');
    expect(qc).toHaveTextContent('The app found: Needs a look.');
  });

  it('opens the per-line details on request', () => {
    render(<AuditChecklist entryId={7} checks={CHECKS} canReview={false} />);
    expect(screen.queryByText('PM0000817')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show details/i }));
    expect(screen.getByText('PM0000817')).toBeInTheDocument();
    expect(screen.getByText('3.3217')).toBeInTheDocument();
  });

  it('offers no decision to someone who cannot review', () => {
    render(<AuditChecklist entryId={7} checks={CHECKS} canReview={false} />);
    expect(screen.queryByRole('button', { name: 'Not OK' })).not.toBeInTheDocument();
  });

  it('wants a reason before marking a check not OK', () => {
    render(<AuditChecklist entryId={7} checks={[CHECKS[0]]} canReview />);
    fireEvent.click(screen.getByRole('button', { name: 'Not OK' }));
    const save = screen.getByRole('button', { name: 'Mark not OK' });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Went into BH-PC' } });
    fireEvent.click(save);
    expect(mutate).toHaveBeenCalledWith(
      { key: 'warehouse', decision: 'NOT_OK', remark: 'Went into BH-PC' },
      expect.any(Object),
    );
  });
});
