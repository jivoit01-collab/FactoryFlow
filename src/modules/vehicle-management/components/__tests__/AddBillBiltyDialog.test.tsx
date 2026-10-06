import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';

import { AddBillBiltyDialog, type AddBillBiltyTarget } from '../AddBillBiltyDialog';

const bill = (plan: { bilty_no?: string; bilty_date?: string | null } = {}) =>
  ({
    doc_entry: 81463,
    doc_num: '626100148',
    company_code: 'JIVO_OIL',
    card_code: 'CUSTA000844',
    card_name: 'ILAHI CO. (BTCPN5063N)',
    plan: { bilty_no: '', bilty_date: null, ...plan },
  }) as unknown as DispatchBill;

const target = (overrides: Partial<AddBillBiltyTarget> = {}): AddBillBiltyTarget => ({
  bill: bill(),
  vehicleNo: 'DL01LAN0395',
  suggestion: null,
  ...overrides,
});

function open(t: AddBillBiltyTarget) {
  const onConfirm = vi.fn();
  render(
    <AddBillBiltyDialog target={t} isSaving={false} onCancel={vi.fn()} onConfirm={onConfirm} />,
  );
  return { onConfirm, add: screen.getByRole('button', { name: /Add bill/ }) };
}

describe('the bilty asked for as a bill joins a truck at the gate', () => {
  it('will not add the bill without a number and a date', () => {
    const { onConfirm, add } = open(target());
    expect(add).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Bilty number'), { target: { value: ' 2125 ' } });
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Bilty date'), { target: { value: '2026-10-06' } });
    fireEvent.click(add);

    expect(onConfirm).toHaveBeenCalledWith({ bilty_no: '2125', bilty_date: '2026-10-06' });
  });

  it("offers the LR the same customer's bill already has on this truck, and says so", () => {
    const { onConfirm, add } = open(
      target({ suggestion: { bilty_no: '2124', bilty_date: '2026-10-06', docNum: '626107975' } }),
    );
    expect(screen.getByLabelText('Bilty number')).toHaveValue('2124');
    expect(screen.getByText(/same LR as bill 626107975/)).toBeInTheDocument();

    // Changed: it is this bill's own LR now, not the suggestion.
    fireEvent.change(screen.getByLabelText('Bilty number'), { target: { value: '2125' } });
    expect(screen.queryByText(/same LR as bill/)).not.toBeInTheDocument();
    fireEvent.click(add);
    expect(onConfirm).toHaveBeenCalledWith({ bilty_no: '2125', bilty_date: '2026-10-06' });
  });

  it("starts from the bilty on the bill's own plan before any suggestion", () => {
    open(
      target({
        bill: bill({ bilty_no: 'NCR-4494', bilty_date: '2026-10-05' }),
        suggestion: { bilty_no: '2124', bilty_date: '2026-10-06', docNum: '626107975' },
      }),
    );
    expect(screen.getByLabelText('Bilty number')).toHaveValue('NCR-4494');
    expect(screen.getByLabelText('Bilty date')).toHaveValue('2026-10-05');
    expect(screen.getByText(/already on this bill/)).toBeInTheDocument();
  });
});
