import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DispatchSheetPage from '../pages/DispatchSheetPage';
import type { DispatchSheetRow } from '../types/sheet.types';

function row(overrides: Partial<DispatchSheetRow>): DispatchSheetRow {
  return {
    plan_id: 1,
    sap_invoice_doc_entry: 4001,
    company_code: 'JIVO_OIL',
    company_name: 'Jivo Oil',
    stream: 'OIL',
    booking_status: 'DISPATCHED',
    dispatch_date: '2026-04-01',
    invoice_date: '2026-03-30',
    party: 'CHIRAG ENTERPRISES MUMBAI',
    location: 'ANJUR MANKOLI ROAD, BHIWANDI',
    state: 'MH',
    invoice_no: '626030549',
    bilty_no: '1756',
    bilty_date: null,
    vehicle_no: 'RJ09GB9203',
    transport_name: 'Bombay Sri Nagar',
    mobile_no: '9521334090',
    litres: 10913,
    total_boxes: null,
    priority: '',
    kanta_weight: null,
    invoice_weight: null,
    freight: null,
    total_freight: null,
    remarks: '',
    eway_bill: '',
    ...overrides,
  };
}

const ROWS: DispatchSheetRow[] = [
  row({ plan_id: 1, party: 'CHIRAG ENTERPRISES MUMBAI', litres: 10913 }),
  row({
    plan_id: 2,
    party: 'ARJUN DASS & SONS',
    invoice_no: '626030604',
    litres: 11996,
    transport_name: 'Delhi Punjab',
  }),
  row({
    plan_id: 3,
    stream: 'WATER',
    party: 'ROYAL HOSPITALITY HARYANA',
    invoice_no: '626038217',
    litres: 3000,
    total_boxes: 250,
  }),
];

const sapAvailable = vi.hoisted(() => ({ current: true }));

vi.mock('@/modules/dispatch/api/sheet.api', () => ({
  useDispatchSheet: () => ({
    data: {
      data: ROWS,
      meta: {
        total: ROWS.length,
        date_from: '2026-04-01',
        date_to: '2026-04-30',
        stream: 'all',
        oil_count: 2,
        water_count: 1,
        companies: ['JIVO_OIL'],
        sap_available: sapAvailable.current,
        sap_error: '',
        fetched_at: '2026-04-30T10:00:00Z',
      },
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

/** The grid, excluding the letter strip and the totals line. */
function bodyRows() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(2, -1);
}

function openSheet() {
  render(<DispatchSheetPage />);
}

describe('the Dispatch Sheet', () => {
  it('opens on the oil sheet, showing only what went out as oil', () => {
    openSheet();

    expect(screen.getByText('Oil · 2')).toBeInTheDocument();
    expect(screen.getByText('Water · 1')).toBeInTheDocument();
    expect(screen.getByText('CHIRAG ENTERPRISES MUMBAI')).toBeInTheDocument();
    expect(screen.queryByText('ROYAL HOSPITALITY HARYANA')).not.toBeInTheDocument();
  });

  it('lays out the columns the oil tab of the workbook has', () => {
    openSheet();

    for (const label of ['Dispatch Date', 'Party', 'Bilty No.', 'Oil LTR', 'Total Freight']) {
      expect(screen.getByRole('button', { name: `Sort by ${label}` })).toBeInTheDocument();
    }
    // The water tab's own columns are not on this one.
    expect(screen.queryByRole('button', { name: 'Sort by Total Box' })).not.toBeInTheDocument();
  });

  it('switches to the water sheet, columns and all', () => {
    openSheet();
    // Radix switches a tab on mouse-down, not on a synthesised click.
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Water · 1' }));

    expect(screen.getByText('ROYAL HOSPITALITY HARYANA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort by Total Box' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort by Water+WG Ltr' })).toBeInTheDocument();
  });

  it('foots the sheet with the litres on it', () => {
    openSheet();

    // 10,913 + 11,996 — the day total the workbook keeps under each block.
    expect(screen.getByText('22,909')).toBeInTheDocument();
    expect(screen.getByText('2 lines')).toBeInTheDocument();
  });

  it('picks a row from its number, and says what the row adds up to', () => {
    openSheet();

    fireEvent.click(screen.getByTitle('Select row 1'));

    expect(screen.getByText('1 row picked')).toBeInTheDocument();
    expect(screen.getByText('Sum 10,913.00')).toBeInTheDocument();
  });

  it('picks a column from its letter, and totals it down the sheet', () => {
    openSheet();

    // L is the twelfth column: Oil LTR.
    fireEvent.click(screen.getByTitle('Select column Oil LTR'));

    expect(screen.getByText('1 column picked')).toBeInTheDocument();
    expect(screen.getByText('Sum 22,909.00')).toBeInTheDocument();
  });

  it('sorts a column when its heading is clicked', () => {
    openSheet();

    const partyOf = () => bodyRows().map((line) => line.children[3].textContent);
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Party' }));
    expect(partyOf()[0]).toBe('ARJUN DASS & SONS');

    fireEvent.click(screen.getByRole('button', { name: 'Sort by Party' }));
    expect(partyOf()[0]).toBe('CHIRAG ENTERPRISES MUMBAI');
  });

  it('keeps only the rows a column filter ticks', async () => {
    openSheet();

    fireEvent.click(screen.getByRole('button', { name: 'Filter Transport Name' }));
    // The value appears in the table too, so tick the one in the drop-down.
    const dropdown = await screen.findByRole('dialog');
    fireEvent.click(within(dropdown).getByText('Delhi Punjab'));

    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText('ARJUN DASS & SONS')).toBeInTheDocument();
    expect(screen.getByText(/Filtered by transport_name/)).toBeInTheDocument();
  });

  it('says which cells are blank because SAP did not answer', () => {
    sapAvailable.current = false;
    openSheet();

    expect(screen.getByText(/SAP did not answer/)).toBeInTheDocument();
    sapAvailable.current = true;
  });
});
