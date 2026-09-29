import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminDispatchBill, AdminDispatchBills, AdminDispatchCompany } from '../types';
import { AdminDispatchBillsDrill } from './AdminDispatchBillsDrill';

const COMPANY: AdminDispatchCompany = {
  company_code: 'JIVO_MART',
  tons: 1_514.9,
  trucks: 107,
  bills: 333,
};

function bill(over: Partial<AdminDispatchBill> = {}): AdminDispatchBill {
  return {
    key: '1919:3568',
    document_type: 'INVOICE',
    sap_doc_entry: 40073,
    bill_no: '609260566',
    bill_date: '2026-09-15',
    dispatch_date: '2026-09-29',
    out_time: '14:32',
    days_to_dispatch: 14,
    billed_before_month: false,
    customer_code: 'CUSTA000048',
    customer_name: 'R K WORLDINFOCOM PVT LTD',
    place_of_supply: 'HR',
    tons: 2.729,
    weighed: true,
    boxes: 140,
    amount: 611_042,
    eway_bill: '3523 4471 2591',
    vehicle_no: 'DL01LAT2433',
    transporter_name: 'Amod Kumar Tpt.',
    driver_name: 'Akshay 8923474024',
    driver_mobile_no: '8923474024',
    gatepass_no: 'DCK/JIVO_MART/2026-27/000339',
    bills_on_truck: 7,
    trucks_for_bill: 1,
    ...over,
  };
}

function bills(over: Partial<AdminDispatchBills> = {}): AdminDispatchBills {
  return {
    company_code: 'JIVO_MART',
    from: '2026-09-01',
    to: '2026-09-29',
    bills: 333,
    trucks: 107,
    tons: 1_514.9,
    amount: 319_095_362,
    earlier_bills: { bills: 116, tons: 354.18 },
    unweighed_bills: 13,
    split_bills: 0,
    avg_days_to_dispatch: 4.6,
    rows: [bill()],
    ...over,
  };
}

function renderDrill(props: Partial<Parameters<typeof AdminDispatchBillsDrill>[0]> = {}) {
  const onBack = vi.fn();
  render(
    <AdminDispatchBillsDrill
      company={COMPANY}
      name="Jivo Mart"
      period="1–29 Sept"
      bills={bills()}
      onBack={onBack}
      onClose={vi.fn()}
      {...props}
    />,
  );
  return { onBack };
}

const stats = () => document.querySelector('.ops-drill__stats') as HTMLElement;
const cut = () => document.querySelector('.ops-drill__cut') as HTMLElement;

describe('AdminDispatchBillsDrill', () => {
  it('opens with the company row’s own figures', () => {
    renderDrill();

    expect(
      screen.getByRole('heading', { name: 'Jivo Mart · bills dispatched' }),
    ).toBeInTheDocument();
    expect(within(stats()).getByText('1,514.9 T')).toBeInTheDocument();
    expect(within(stats()).getByText('333 bills · 107 trucks')).toBeInTheDocument();
    expect(within(stats()).getByText('₹31.91 Cr')).toBeInTheDocument();
    expect(within(stats()).getByText('4.6 days on average')).toBeInTheDocument();
  });

  it('shows the row’s figures while the list is still being read', () => {
    renderDrill({ bills: undefined, loading: true });

    expect(within(stats()).getByText('333 bills · 107 trucks')).toBeInTheDocument();
    expect(screen.getByText('Reading…')).toBeInTheDocument();
  });

  it('lists each bill with its date, its dispatch and its truck', () => {
    renderDrill();

    const row = screen.getByText('609260566').closest('tr') as HTMLElement;
    expect(within(row).getByText('15 Sept')).toBeInTheDocument();
    expect(within(row).getByText('29 Sept, 14:32')).toBeInTheDocument();
    expect(within(row).getByText('14 days')).toBeInTheDocument();
    expect(within(row).getByText('R K WORLDINFOCOM PVT LTD')).toBeInTheDocument();
    expect(within(row).getByText('DL01LAT2433')).toBeInTheDocument();
    expect(within(row).getByText('2.7 T')).toBeInTheDocument();
    expect(within(row).getByText('₹6.11 L')).toBeInTheDocument();
  });

  it('weighs a bill under a tonne in kilograms, so it is not read as unweighed', () => {
    renderDrill({ bills: bills({ rows: [bill({ tons: 0.042 })] }) });

    const row = screen.getByText('609260566').closest('tr') as HTMLElement;
    expect(within(row).getByText('42 kg')).toBeInTheDocument();
  });

  it('says a bill carries no weight rather than printing it as weighed empty', () => {
    renderDrill({ bills: bills({ rows: [bill({ weighed: false, tons: 0 })] }) });

    const row = screen.getByText('609260566').closest('tr') as HTMLElement;
    expect(within(row).getByText('no weight')).toBeInTheDocument();
    expect(within(cut()).getByText('No weight recorded')).toBeInTheDocument();
    expect(within(cut()).getByText('13 bills')).toBeInTheDocument();
  });

  it('counts the bills raised in an earlier month apart', () => {
    renderDrill();

    expect(within(cut()).getByText('Raised before this month')).toBeInTheDocument();
    expect(within(cut()).getByText('116 bills · 354.2 T')).toBeInTheDocument();
  });

  it('opens a bill onto its gate pass, e-way bill and driver', () => {
    renderDrill();

    fireEvent.click(screen.getByText('609260566'));

    expect(screen.getByText('DCK/JIVO_MART/2026-27/000339')).toBeInTheDocument();
    expect(screen.getByText('3523 4471 2591')).toBeInTheDocument();
    expect(screen.getByText('Akshay 8923474024')).toBeInTheDocument();
    // Already in the name, so not printed a second time.
    expect(screen.queryByText('8923474024')).not.toBeInTheDocument();
    expect(screen.getByText('7 bills')).toBeInTheDocument();
  });

  it('says why the list is missing rather than showing an empty one', () => {
    renderDrill({
      bills: undefined,
      error: 'You are not a member of JIVO_MART, so its bills are not shown here.',
    });

    expect(
      screen.getByText('You are not a member of JIVO_MART, so its bills are not shown here.'),
    ).toBeInTheDocument();
  });

  it('goes back to the company panel, by the arrow or by Escape', () => {
    const { onBack } = renderDrill();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Total dispatch' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onBack).toHaveBeenCalledTimes(2);
  });
});
