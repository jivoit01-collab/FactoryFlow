import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DispatchSheetPage from '../../../pages/DispatchSheetPage';
import type { DispatchSheetRow } from '../../../types/sheet.types';

const mockDownload = vi.fn();

vi.mock('../sheetExport', () => ({
  downloadSheet: (args: unknown) => mockDownload(args),
}));

const line = (entry: number, party: string, state: string, dispatch: string): DispatchSheetRow => ({
  plan_id: entry,
  sap_invoice_doc_entry: entry,
  company_code: 'JIVO_OIL',
  company_name: 'Jivo Oil',
  booking_status: 'DISPATCHED',
  vehicle_stage: 'DISPATCHED',
  vehicle_stage_label: 'Dispatched',
  dispatch_date: dispatch,
  invoice_date: dispatch,
  party,
  location: '',
  state,
  invoice_no: String(entry),
  bilty_no: '',
  bilty_date: null,
  vehicle_no: '',
  transport_name: '',
  mobile_no: '',
  litres: 100,
  total_boxes: 10,
  priority: '',
  kanta_weight: null,
  invoice_weight: null,
  freight: null,
  total_freight: null,
  remarks: '',
  eway_bill: '',
  freight_from_sap: false,
});

const ROWS = [
  line(1, 'AGGARWAL AGENCIES', 'DL', '2026-09-03'),
  line(2, 'SAI TRADERS LUDHIANA', 'PB', '2026-09-05'),
  line(3, 'ILAHI CO.', 'PB', '2026-09-10'),
  line(4, 'PURE AGROCHEM', 'DL', '2026-09-12'),
];

vi.mock('@/modules/dispatch/api/sheet.api', () => ({
  useDispatchSheet: () => ({
    data: {
      data: ROWS,
      meta: {
        total: ROWS.length,
        date_from: '2026-09-01',
        date_to: '2026-09-24',
        counts_by_company: { JIVO_OIL: ROWS.length },
        companies: ['JIVO_OIL'],
        sap_available: true,
        sap_error: '',
        fetched_at: '',
      },
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

const downloaded = () => {
  fireEvent.click(screen.getByRole('button', { name: /download/i }));
  const args = mockDownload.mock.calls.at(-1)?.[0] as { rows: DispatchSheetRow[] };
  return args.rows.map((row) => row.party);
};

describe('the Download button', () => {
  beforeEach(() => mockDownload.mockClear());

  it('gives back every line when nothing narrows the sheet, newest first', () => {
    render(<DispatchSheetPage />);
    expect(downloaded()).toEqual([
      'PURE AGROCHEM',
      'ILAHI CO.',
      'SAI TRADERS LUDHIANA',
      'AGGARWAL AGENCIES',
    ]);
  });

  it('gives back only the lines a column filter leaves, in the order on screen', async () => {
    render(<DispatchSheetPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter State' }));
    const list = await screen.findByPlaceholderText('Search state…');
    const popover = list.closest('[role="dialog"]') as HTMLElement;
    const pb = within(popover).getByText('PB');
    fireEvent.click(within(pb.closest('label') as HTMLElement).getByRole('checkbox'));
    // Re-sort by party, ascending, so the file has to follow the screen's order too.
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Party' }));

    expect(downloaded()).toEqual(['ILAHI CO.', 'SAI TRADERS LUDHIANA']);
  });

  it('gives back only what the Find box leaves', () => {
    render(<DispatchSheetPage />);
    fireEvent.change(screen.getByLabelText('Find'), { target: { value: 'agg' } });
    expect(downloaded()).toEqual(['AGGARWAL AGENCIES']);
  });
});
