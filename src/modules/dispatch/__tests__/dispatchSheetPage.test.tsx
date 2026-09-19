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
    booking_status: 'DISPATCHED',
    vehicle_stage: 'DISPATCHED',
    vehicle_stage_label: 'Dispatched',
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
    vehicle_stage: 'DOCKED',
    vehicle_stage_label: 'Docked',
    party: 'ARJUN DASS & SONS',
    invoice_no: '626030604',
    litres: 11996,
    transport_name: 'Delhi Punjab',
  }),
  row({
    plan_id: 3,
    vehicle_stage: 'EMPTY_IN',
    vehicle_stage_label: 'Empty Vehicle In',
    company_code: 'JIVO_BEVERAGES',
    company_name: 'Jivo Beverages',
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
        counts_by_company: { JIVO_OIL: 2, JIVO_BEVERAGES: 1 },
        companies: ['JIVO_BEVERAGES', 'JIVO_OIL'],
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

/** One body cell, by its place on screen — the row gutter is not a cell. */
function cellAt(row: number, column: number) {
  return bodyRows()[row].children[column + 1] as HTMLElement;
}

/** The grid, excluding the letter strip and the totals line. */
function bodyRows() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(2, -1);
}

function openSheet() {
  render(<DispatchSheetPage />);
}

describe('the Dispatch Sheet', () => {
  it('opens on Oil, showing only that company’s lines', () => {
    openSheet();

    expect(screen.getByText('Oil · 2')).toBeInTheDocument();
    expect(screen.getByText('CHIRAG ENTERPRISES MUMBAI')).toBeInTheDocument();
    expect(screen.queryByText('ROYAL HOSPITALITY HARYANA')).not.toBeInTheDocument();
  });

  it('names all three companies, and counts each before any is opened', () => {
    openSheet();

    expect(screen.getByRole('tab', { name: 'Oil · 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Beverages · 1' })).toBeInTheDocument();
    // Mart has no line today and is still named: a tab that comes and goes
    // with the window would be worse than one reading zero.
    expect(screen.getByRole('tab', { name: 'Mart · 0' })).toBeInTheDocument();
  });

  it('reads every company by default', () => {
    openSheet();

    expect(screen.getByLabelText('All companies')).toBeChecked();
  });

  it('lays out the columns the Oil tab of the workbook has', () => {
    openSheet();

    for (const label of ['Dispatch Date', 'Party', 'Bilty No.', 'Oil LTR', 'Total Freight']) {
      expect(screen.getByRole('button', { name: `Sort by ${label}` })).toBeInTheDocument();
    }
    // The water tab's own columns are not on this one.
    expect(screen.queryByRole('button', { name: 'Sort by Total Box' })).not.toBeInTheDocument();
  });

  it('switches to the Beverages sheet, columns and all', () => {
    openSheet();
    // Radix switches a tab on mouse-down, not on a synthesised click.
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Beverages · 1' }));

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

    expect(screen.getByText('1 row × 20 columns')).toBeInTheDocument();
    expect(screen.getByText('Sum 10,913.00')).toBeInTheDocument();
  });

  it('picks a column from its letter, and totals it down the sheet', () => {
    openSheet();

    fireEvent.click(screen.getByTitle('Select column Oil LTR'));

    expect(screen.getByText('2 rows × 1 column')).toBeInTheDocument();
    expect(screen.getByText('Sum 22,909.00')).toBeInTheDocument();
  });

  it('picks the cell pressed on, and names it the way a sheet does', () => {
    openSheet();

    // Row 1, the Party column — the third, so C1.
    fireEvent.mouseDown(cellAt(0, 2));

    expect(screen.getByText('C1')).toBeInTheDocument();
    expect(screen.getByText('1 cell')).toBeInTheDocument();
  });

  it('takes the block dragged across the cells', () => {
    openSheet();

    // Press on the litres of the first line and drag onto the second's.
    fireEvent.mouseDown(cellAt(0, 11));
    fireEvent.mouseEnter(cellAt(1, 11));

    expect(screen.getByText('L1:L2')).toBeInTheDocument();
    expect(screen.getByText('2 rows × 1 column')).toBeInTheDocument();
    expect(screen.getByText('Sum 22,909.00')).toBeInTheDocument();
  });

  it('stops extending once the mouse is let go', () => {
    openSheet();

    fireEvent.mouseDown(cellAt(0, 11));
    fireEvent.mouseUp(window);
    fireEvent.mouseEnter(cellAt(1, 11));

    // Still the one cell: the drag was over before the mouse moved.
    expect(screen.getByText('L1')).toBeInTheDocument();
    expect(screen.getByText('Sum 10,913.00')).toBeInTheDocument();
  });

  it('shift-pressing a second cell extends from the first', () => {
    openSheet();

    fireEvent.mouseDown(cellAt(0, 11));
    fireEvent.mouseUp(window);
    fireEvent.mouseDown(cellAt(1, 12), { shiftKey: true });

    expect(screen.getByText('L1:M2')).toBeInTheDocument();
    expect(screen.getByText('2 rows × 2 columns')).toBeInTheDocument();
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

  it('colours a line by where its truck has got to', () => {
    openSheet();

    const [gone, loading] = bodyRows();
    // Dispatched is the finished line; docked is still in hand.
    expect(gone.className).toContain('emerald');
    expect(loading.className).toContain('sky');
  });

  it('names the stage in the Status cell, since two stages share a colour', () => {
    openSheet();

    // "Dispatched" is on the key as well, so look in the row's own cells.
    const [gone, loading] = bodyRows();
    expect(within(gone).getByText('Dispatched')).toBeInTheDocument();
    expect(within(loading).getByText('Docked')).toBeInTheDocument();
  });

  it('puts a key on the page for what the colours mean', () => {
    openSheet();

    expect(screen.getByText('At the gate')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByText('Not in yet')).toBeInTheDocument();
  });

  it('says which cells are blank because SAP did not answer', () => {
    sapAvailable.current = false;
    openSheet();

    expect(screen.getByText(/SAP did not answer/)).toBeInTheDocument();
    sapAvailable.current = true;
  });
});
