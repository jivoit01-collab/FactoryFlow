import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BillSummaryDetail } from '../../../api';
import { ResendBillSummaryForm } from '../ResendBillSummaryForm';

const resubmit = vi.hoisted(() => vi.fn());
const asked = vi.hoisted(() => ({ detail: [] as unknown[], resubmit: [] as unknown[] }));
const loaded = vi.hoisted(() => ({ sheet: null as unknown }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../../api', () => ({
  useBillSummary: (...args: unknown[]) => {
    asked.detail.push(args);
    return { data: loaded.sheet, isLoading: false, isError: false };
  },
  useResubmitBillSummary: (...args: unknown[]) => {
    asked.resubmit.push(args);
    return { mutateAsync: resubmit, isPending: false };
  },
}));

/** BS-20261006-002 as it came back: raised off a plan that had no bilty. */
const sentBack = (overrides: Partial<BillSummaryDetail> = {}) =>
  ({
    id: 584,
    entry_no: 'BS-20261006-002',
    company_code: 'JIVO_OIL',
    status: 'REJECTED',
    bilty_no: '',
    bilty_date: null,
    transporter_name: '',
    plan_transport: {
      bilty_no: '',
      bilty_date: null,
      transporter_name: 'Bhargave Road Carrier',
      vehicle_no: 'DL01LAN0395',
      driver_name: 'Sunil',
      driver_mobile: '9069746674',
    },
    ...overrides,
  }) as unknown as BillSummaryDetail;

describe('re-sending a sheet the warehouse sent back', () => {
  beforeEach(() => {
    resubmit.mockReset();
    resubmit.mockImplementation(async () => ({ ...sentBack(), status: 'PENDING_APPROVAL' }));
    asked.detail = [];
    asked.resubmit = [];
    loaded.sheet = sentBack();
  });

  it('takes the bilty number, its date and the transporter, and sends all three', async () => {
    const onSent = vi.fn();
    render(
      <ResendBillSummaryForm sheetId={584} companyCode="JIVO_OIL" idPrefix="t" onSent={onSent} />,
    );

    // The sheet had no transporter; the plan's truck does.
    expect(screen.getByLabelText('Transporter')).toHaveValue('Bhargave Road Carrier');
    expect(screen.getByText(/filled from the dispatch plan/)).toBeInTheDocument();
    const send = screen.getByRole('button', { name: /Send back to the warehouse/ });
    // A sheet re-sent without its bilty would only come back again.
    expect(send).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Bilty number'), { target: { value: ' 2124 ' } });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Bilty date'), { target: { value: '2026-10-06' } });
    fireEvent.click(send);

    await waitFor(() =>
      expect(resubmit).toHaveBeenCalledWith({
        bilty_no: '2124',
        bilty_date: '2026-10-06',
        transporter_name: 'Bhargave Road Carrier',
      }),
    );
    await waitFor(() =>
      expect(onSent).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING_APPROVAL' })),
    );
  });

  it("asks in the sheet's own company", () => {
    render(<ResendBillSummaryForm sheetId={584} companyCode="JIVO_OIL" idPrefix="t" />);
    expect(asked.detail).toContainEqual([584, 'JIVO_OIL']);
    expect(asked.resubmit).toContainEqual([584, 'JIVO_OIL']);
  });

  it("prefers what the sheet holds over the plan's", () => {
    loaded.sheet = sentBack({
      bilty_no: 'NCR-1',
      bilty_date: '2026-10-05',
      transporter_name: 'Abhiman Express',
    });
    render(<ResendBillSummaryForm sheetId={584} idPrefix="t" />);
    expect(screen.getByLabelText('Bilty number')).toHaveValue('NCR-1');
    expect(screen.getByLabelText('Bilty date')).toHaveValue('2026-10-05');
    expect(screen.getByLabelText('Transporter')).toHaveValue('Abhiman Express');
    expect(screen.queryByText(/filled from the dispatch plan/)).not.toBeInTheDocument();
  });
});
