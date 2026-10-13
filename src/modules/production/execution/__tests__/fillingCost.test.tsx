import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FillingCostPage from '../pages/FillingCostPage';

/** 25 September's sheet, as the factory wrote it and the API hands it back. */
const SEP_25 = {
  id: 4,
  line: null,
  line_name: '',
  date: '2026-09-25',
  shift: '',
  cases: '160000.00',
  notes: '',
  entries: [
    { id: 1, head: 'Salary', amount: '1200000.00', sort_order: 0, per_case: '7.50' },
    { id: 2, head: 'Electricity', amount: '800000.00', sort_order: 1, per_case: '5.00' },
    { id: 3, head: 'Maintenance', amount: '250000.00', sort_order: 2, per_case: '1.56' },
    { id: 4, head: 'Batch Coding', amount: '60000.00', sort_order: 3, per_case: '0.38' },
    {
      id: 5,
      head: 'Ground Water Extraction Bill',
      amount: '16000.00',
      sort_order: 4,
      per_case: '0.10',
    },
    { id: 6, head: 'Briquette', amount: '25000.00', sort_order: 5, per_case: '0.16' },
    { id: 7, head: 'Lubrication', amount: '32400.00', sort_order: 6, per_case: '0.20' },
    { id: 8, head: 'Lab', amount: '5000.00', sort_order: 7, per_case: '0.03' },
    { id: 9, head: 'Miscellaneous', amount: '100000.00', sort_order: 8, per_case: '0.63' },
  ],
  total_amount: '2488400.00',
  total_per_case: '15.55',
  created_by_name: 'Anurag',
  updated_by_name: '',
  created_at: '2026-09-25T10:00:00Z',
  updated_at: '2026-09-25T10:00:00Z',
};

/** 27 September, saved before the store had posted its wastage to SAP. */
const SEP_27 = {
  ...SEP_25,
  id: 7,
  date: '2026-09-27',
  cases: '4928.00',
  entries: [
    { id: 21, head: 'Wastage', amount: '1739.00', sort_order: 0, per_case: '0.35' },
    // Saved under the head's older name.
    { id: 22, head: 'Scrap Recovering', amount: '-1680.00', sort_order: 1, per_case: '-0.34' },
    { id: 23, head: 'Lab', amount: '192.31', sort_order: 2, per_case: '0.04' },
  ],
  total_amount: '251.31',
  total_per_case: '0.05',
  updated_at: '2026-09-28T10:00:00Z',
};

/** The scrap table, as the scrap rates endpoint hands it back. */
const SCRAP_RATES = [
  {
    id: 1,
    name: 'Preform 10.5 GM',
    items: [
      { code: 'PM0000659', name: 'PREFORM 10/10.5 GMS' },
      { code: 'PM0000739', name: 'PREFORM 10.5 GMS' },
      { code: 'PM0000740', name: 'PREFORM 10.5 GMS NEW' },
    ],
    grams_per_piece: '10.500',
    pieces_per_box: 2064,
    sort_order: 0,
    price_per_kg: '49.00',
    price_from: '2026-09-01',
    prices: [],
  },
  {
    id: 4,
    name: 'Cap',
    items: [{ code: 'PM0000641', name: 'CAP ALASKA SKY BLUE A27W' }],
    grams_per_piece: null,
    pieces_per_box: 6000,
    sort_order: 3,
    price_per_kg: '49.00',
    price_from: '2026-09-01',
    prices: [],
  },
  {
    id: 6,
    name: 'Boxes',
    items: [],
    grams_per_piece: null,
    pieces_per_box: null,
    sort_order: 5,
    price_per_kg: null,
    price_from: null,
    prices: [],
  },
];

const createSheet = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const createRate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const updateRate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const updateSheet = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const perms = vi.hoisted(() => ({ canEdit: true }));
const askedFor = vi.hoisted(() => [] as unknown[]);
/** What the Cost Master fills a new day with; none unless a test sets it. */
const costMaster = vi.hoisted(() => ({
  entries: [] as unknown[],
  produced_cases: '0.00',
  run_count: 0,
  warnings: [] as string[],
  skus: [] as unknown[],
  askedFor: [] as unknown[],
}));
/** The night of the 28th, as the defaults endpoint works it out. */
const ALIASES: Record<string, string[]> = {
  'Fixed Manpower': ['Salary'],
  'Scrap Recurring': ['Scrap Recovering'],
};
const worked = (head: string, amount: string | null, explain: string, source = 'cost_master') => ({
  head,
  aliases: ALIASES[head] ?? [],
  amount,
  explain,
  source,
});
const COST_MASTER = [
  worked('Electricity', '32787.00', 'Electricity++: ₹32,787 for Jivo Beverages on 28 Sep'),
  worked('Fixed Manpower', '46153.85', '₹12,00,000 a month ÷ 26 days'),
  worked('Maintenance', '9615.38', '₹2,50,000 a month ÷ 26 days'),
  worked('Batch Coding', '4071.60', '1,35,720 bottles × ₹0.03'),
  worked('Lubrication', '902.54', '67,860 litres × ₹0.0133 a litre (Rs. 0.2 per 15 litres)'),
  worked('Lab', '192.31', '₹5,000 a month ÷ 26 days'),
  worked('Miscellaneous', '384.62', '₹10,000 a month ÷ 26 days'),
  worked('Scrap Recurring', '-3090.75', '412.100 kg of the wastage sold as scrap, deducted'),
  worked('Wastage', '4121.00', '1 waste log entry × the material’s SAP price on the run'),
];

vi.mock('../api', () => ({
  useLines: () => ({ data: [{ id: 1, name: 'Line 1' }] }),
  useFillingCostSheets: (params: unknown) => {
    askedFor.push(params);
    return { data: [SEP_25, SEP_27], isLoading: false };
  },
  useFillingCostDefaults: (date: string, lineId: unknown, shift: string, enabled: boolean) => {
    if (enabled) costMaster.askedFor.push({ date, lineId, shift });
    return {
      data: enabled
        ? {
            date,
            entries: costMaster.entries,
            produced_cases: costMaster.produced_cases,
            run_count: costMaster.run_count,
            warnings: costMaster.warnings,
            skus: costMaster.skus,
          }
        : undefined,
      isLoading: false,
    };
  },
  useCreateFillingCostSheet: () => ({ mutateAsync: createSheet, isPending: false }),
  useUpdateFillingCostSheet: () => ({ mutateAsync: updateSheet, isPending: false }),
  useDeleteFillingCostSheet: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useScrapRates: () => ({ data: SCRAP_RATES, isLoading: false }),
  useCreateScrapRate: () => ({ mutateAsync: createRate, isPending: false }),
  useUpdateScrapRate: () => ({ mutateAsync: updateRate, isPending: false }),
  useDeleteScrapRate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSearchSAPItems: (search: string) => ({
    data:
      search.length >= 2
        ? [{ ItemCode: 'PM0000654', ItemName: 'PREFORM 12.5 GMS', UomCode: 'PCS' }]
        : [],
    isFetching: false,
  }),
}));

vi.mock('@/core/auth', () => ({
  usePermission: () => ({
    hasPermission: () => perms.canEdit,
    hasAnyPermission: () => true,
  }),
}));

/** The page opens on today; every test picks its own day. */
const openDay = (date: string) => {
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: date } });
};

const row = (head: string) =>
  within((screen.getByDisplayValue(head).closest('tr') as HTMLElement) ?? document.body);

describe('Filling cost sheet', () => {
  beforeEach(() => {
    createSheet.mockClear();
    updateSheet.mockClear();
    createRate.mockClear();
    updateRate.mockClear();
    askedFor.length = 0;
    costMaster.entries = [];
    costMaster.produced_cases = '0.00';
    costMaster.run_count = 0;
    costMaster.warnings = [];
    costMaster.skus = [];
    costMaster.askedFor.length = 0;
  });

  it('shows the day as it was written, per case', () => {
    render(<FillingCostPage />);
    openDay('2026-09-25');

    expect(screen.getByText('Filling Cost — 25 September 2026')).toBeInTheDocument();
    expect(screen.getByText(/Per 1,60,000 Cases/)).toBeInTheDocument();
    expect(row('Salary').getByDisplayValue('1200000')).toBeInTheDocument();
    expect(row('Salary').getByText('7.50')).toBeInTheDocument();
    // 0.375 a case, rounded up, exactly as the sheet writes it.
    expect(row('Batch Coding').getByText('0.38')).toBeInTheDocument();
    expect(row('Miscellaneous').getByText('0.63')).toBeInTheDocument();

    // The total row: the day over the cases. Adding the rounded column above
    // would read 15.56.
    const total = screen.getByText('Total').closest('tr') as HTMLElement;
    expect(within(total).getByText('24,88,400.00')).toBeInTheDocument();
    expect(within(total).getByText('15.55')).toBeInTheDocument();
  });

  it('asks only for the day picked and the newest two, not every day entered', () => {
    render(<FillingCostPage />);
    openDay('2026-09-25');

    expect(askedFor).toContainEqual({ line_id: 'none', shift: '', date: '2026-09-25' });
    expect(askedFor).toContainEqual({ line_id: 'none', shift: '', limit: 2 });
    expect(askedFor).not.toContainEqual(undefined);
  });

  it('reprices every head when the case count changes', () => {
    render(<FillingCostPage />);
    openDay('2026-09-25');

    fireEvent.change(screen.getByLabelText('Cases'), { target: { value: '80000' } });

    expect(row('Salary').getByText('15.00')).toBeInTheDocument();
    const total = screen.getByText('Total').closest('tr') as HTMLElement;
    expect(within(total).getByText('31.11')).toBeInTheDocument();
  });

  it('starts a day nobody has entered from the last day’s heads', () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');

    expect(
      screen.getByText(
        /No sheet for this day yet — the heads are carried over from 25 September 2026/,
      ),
    ).toBeInTheDocument();
    // The heads carry over; the amounts and the case count do not.
    expect(screen.getByDisplayValue('Salary')).toBeInTheDocument();
    expect(row('Salary').getByPlaceholderText('0')).toHaveValue('');
    expect(screen.getByLabelText('Cases')).toHaveValue('');
  });

  it('saves a new day as a sheet of its own', async () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');

    fireEvent.change(screen.getByLabelText('Cases'), { target: { value: '5200' } });
    fireEvent.change(row('Salary').getByPlaceholderText('0'), { target: { value: '40000' } });
    fireEvent.change(row('Electricity').getByPlaceholderText('0'), { target: { value: '27000' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(createSheet).toHaveBeenCalled());
    const payload = createSheet.mock.calls[0][0];
    expect(payload).toMatchObject({ date: '2026-09-26', cases: '5200', line_id: null });
    // Heads left blank are still part of the sheet, at zero.
    expect(payload.entries.slice(0, 2)).toEqual([
      { head: 'Salary', amount: '40000' },
      { head: 'Electricity', amount: '27000' },
    ]);
    expect(payload.entries).toContainEqual({ head: 'Lab', amount: '0' });
  });

  it('will not save a new day until its cases are entered', () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');

    fireEvent.change(row('Salary').getByPlaceholderText('0'), { target: { value: '40000' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(createSheet).not.toHaveBeenCalled();
  });

  it('is read-only without the entry permission', () => {
    perms.canEdit = false;
    try {
      render(<FillingCostPage />);
      openDay('2026-09-25');

      expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('Salary')).toBeDisabled();
      // The figures are still there to read.
      expect(row('Salary').getByText('7.50')).toBeInTheDocument();
    } finally {
      perms.canEdit = true;
    }
  });

  it('opens a new day with every head worked out, and says how', () => {
    costMaster.entries = COST_MASTER;
    render(<FillingCostPage />);
    openDay('2026-09-26');

    // The 25th's 'Salary' row is carried over under its new name.
    expect(screen.queryByDisplayValue('Salary')).not.toBeInTheDocument();
    expect(row('Fixed Manpower').getByPlaceholderText('0')).toHaveValue('46153.85');
    expect(row('Fixed Manpower').getByText('₹12,00,000 a month ÷ 26 days')).toBeInTheDocument();
    expect(row('Electricity').getByPlaceholderText('0')).toHaveValue('32787');
    expect(row('Batch Coding').getByText('1,35,720 bottles × ₹0.03')).toBeInTheDocument();
    // Heads the 25th did not have go on the end, the credit as a minus.
    expect(row('Scrap Recurring').getByPlaceholderText('0')).toHaveValue('-3090.75');
    expect(row('Wastage').getByPlaceholderText('0')).toHaveValue('4121');
    // Not worked out: typed in as before.
    expect(row('Briquette').getByPlaceholderText('0')).toHaveValue('');
  });

  it('adds up with the scrap taken off', () => {
    costMaster.entries = COST_MASTER;
    costMaster.produced_cases = '5655.00';
    render(<FillingCostPage />);
    openDay('2026-09-26');

    const total = screen.getByText('Total').closest('tr') as HTMLElement;
    // 32,787 + 46,153.85 + 9,615.38 + 4,071.60 + 902.54 + 192.31 + 384.62
    // + 4,121 − 3,090.75
    expect(within(total).getByText('95,137.55')).toBeInTheDocument();
    expect(within(total).getByText('16.82')).toBeInTheDocument();
  });

  it('says what it could not work out', () => {
    costMaster.warnings = ['No bottles per case on run #8: its cases are left out.'];
    render(<FillingCostPage />);
    openDay('2026-09-26');

    expect(screen.getByText('Not everything could be worked out:')).toBeInTheDocument();
    expect(screen.getByText(/No bottles per case on run #8/)).toBeInTheDocument();
  });

  it('saves what it opened with, unless it is changed', async () => {
    costMaster.entries = COST_MASTER;
    render(<FillingCostPage />);
    openDay('2026-09-26');

    fireEvent.change(screen.getByLabelText('Cases'), { target: { value: '5655' } });
    fireEvent.change(row('Lab').getByPlaceholderText('0'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(createSheet).toHaveBeenCalled());
    const { entries, shift } = createSheet.mock.calls[0][0];
    expect(shift).toBe('');
    expect(entries).toContainEqual({ head: 'Fixed Manpower', amount: '46153.85' });
    expect(entries).toContainEqual({ head: 'Lab', amount: '250' });
    expect(entries).toContainEqual({ head: 'Scrap Recurring', amount: '-3090.75' });
  });

  it('keeps a sheet per shift', async () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');
    fireEvent.click(screen.getByRole('combobox', { name: 'Shift' }));
    fireEvent.click(screen.getByRole('option', { name: 'Night (19:00–07:00)' }));

    expect(askedFor).toContainEqual({ line_id: 'none', shift: 'NIGHT', date: '2026-09-26' });
    expect(costMaster.askedFor).toContainEqual({
      date: '2026-09-26',
      lineId: 'none',
      shift: 'NIGHT',
    });
    expect(screen.getByText(/Filling Cost — 26 September 2026 · Night/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Cases'), { target: { value: '5655' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(createSheet).toHaveBeenCalled());
    expect(createSheet.mock.calls[0][0].shift).toBe('NIGHT');
  });

  it('leaves a day already entered as it was saved', () => {
    costMaster.entries = COST_MASTER;
    render(<FillingCostPage />);
    openDay('2026-09-25');

    expect(row('Salary').getByDisplayValue('1200000')).toBeInTheDocument();
    expect(screen.queryByText(/a month ÷ 26 days/)).not.toBeInTheDocument();
  });

  it('opens a new day at the cases its runs produced', () => {
    costMaster.produced_cases = '5450.00';
    costMaster.run_count = 3;
    render(<FillingCostPage />);
    openDay('2026-09-26');

    expect(screen.getByLabelText('Cases')).toHaveValue('5450');
    expect(screen.getByText('From Production Execution: 3 runs')).toBeInTheDocument();
    expect(screen.getByText(/Per 5,450 Cases/)).toBeInTheDocument();
    expect(costMaster.askedFor).toContainEqual({ date: '2026-09-26', lineId: 'none', shift: '' });
  });

  it('asks for the picked line’s runs only', () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');
    fireEvent.click(screen.getByRole('combobox', { name: 'Line' }));
    fireEvent.click(screen.getByRole('option', { name: 'Line 1' }));

    expect(costMaster.askedFor).toContainEqual({ date: '2026-09-26', lineId: 1, shift: '' });
  });

  it('leaves the cases blank on a day with no production', () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');

    expect(screen.getByLabelText('Cases')).toHaveValue('');
    expect(screen.queryByText(/From Production Execution/)).not.toBeInTheDocument();
  });

  it('keeps a saved day’s own case count', () => {
    costMaster.produced_cases = '5450.00';
    render(<FillingCostPage />);
    openDay('2026-09-25');

    expect(screen.getByLabelText('Cases')).toHaveValue('160000');
  });

  it('opens on yesterday, the day whose cost is entered', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T10:00:00'));
    try {
      render(<FillingCostPage />);
      expect(screen.getByLabelText('Date')).toHaveValue('2026-09-30');
    } finally {
      vi.useRealTimers();
    }
  });

  it('heads the sheet with the SKU, box size and production the runs filled', () => {
    costMaster.skus = [
      {
        product: 'JIVO WATER 1 LTR',
        sku: '1000 ML',
        pieces_per_case: 12,
        litres_per_piece: '1.0000',
        cases: '7140.00',
      },
    ];
    render(<FillingCostPage />);
    openDay('2026-09-26');
    const strip = within(screen.getByText('SKU').closest('table') as HTMLElement);
    expect(strip.getByText('1000 ML')).toBeInTheDocument();
    expect(strip.getByText('12 PCS')).toBeInTheDocument();
    expect(strip.getByText('7,140 BOXES')).toBeInTheDocument();
  });

  it('shows the runs’ SKU on a day already saved too', () => {
    costMaster.skus = [
      { product: 'X', sku: '500 ML', pieces_per_case: 24, litres_per_piece: '0.5', cases: '10' },
    ];
    render(<FillingCostPage />);
    openDay('2026-09-25');
    expect(screen.getByText('500 ML')).toBeInTheDocument();
    // The saved figures are still the saved ones.
    expect(screen.getByLabelText('Cases')).toHaveValue('160000');
  });

  it('offers SAP’s wastage on a day saved before the store posted it', async () => {
    costMaster.entries = [
      worked('Wastage', '1800.50', 'SAP: 926678136 (wastage 27-09-2026 Night) ₹1,800.50', 'sap'),
      worked('Scrap Recurring', '-900.00', '120.000 kg of the wastage sold as scrap', 'sap'),
      // Already what the sheet says: nothing to offer.
      worked('Lab', '192.31', '₹5,000 a month ÷ 26 days'),
    ];
    render(<FillingCostPage />);
    openDay('2026-09-27');

    // The saved figures stay until someone takes SAP's.
    expect(row('Wastage').getByPlaceholderText('0')).toHaveValue('1739');
    expect(row('Wastage').getByText('SAP now has ₹1,800.50 for this.')).toBeInTheDocument();
    // Found under the head's older name too.
    expect(row('Scrap Recovering').getByText('SAP now has ₹-900.00 for this.')).toBeInTheDocument();
    expect(row('Lab').queryByText(/SAP now has/)).not.toBeInTheDocument();

    fireEvent.click(row('Wastage').getByRole('button', { name: 'Use SAP’s figure' }));
    expect(row('Wastage').getByPlaceholderText('0')).toHaveValue('1800.5');
    expect(row('Wastage').queryByText(/SAP now has/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(updateSheet).toHaveBeenCalled());
    expect(updateSheet.mock.calls[0][0].data.entries).toContainEqual({
      head: 'Wastage',
      amount: '1800.5',
    });
  });

  it('offers nothing from the waste logs on a saved day', () => {
    costMaster.entries = [worked('Wastage', '2409.61', '5 waste log entries', 'waste_logs')];
    render(<FillingCostPage />);
    openDay('2026-09-27');
    expect(screen.queryByText(/SAP now has/)).not.toBeInTheDocument();
  });

  it('lists the scrap rates the sheet’s scrap is priced at', () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');

    const preform = within(screen.getByText('Preform 10.5 GM').closest('tr') as HTMLElement);
    expect(preform.getByText('10.5 g')).toBeInTheDocument();
    expect(preform.getByText('2064')).toBeInTheDocument();
    expect(preform.getByText('₹49')).toBeInTheDocument();
    expect(preform.getByText(/^from 1 Sept? 2026$/)).toBeInTheDocument();
    expect(preform.getByText(/PREFORM 10\/10.5 GMS, PREFORM 10.5 GMS/)).toBeInTheDocument();
    expect(preform.getByText('+ 1 more')).toBeInTheDocument();
    const boxes = within(screen.getByText('Boxes').closest('tr') as HTMLElement);
    expect(boxes.getByText('No price yet')).toBeInTheDocument();
  });

  it('gives a scrap its weight and a new price from a date', async () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');

    fireEvent.click(screen.getByRole('button', { name: 'Change Cap' }));
    fireEvent.change(screen.getByLabelText('Weight a piece (g)'), { target: { value: '2.5' } });
    // The date only matters once the price changes.
    expect(screen.getByLabelText('New price counts from')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Price a kg (₹)'), { target: { value: '52' } });
    fireEvent.change(screen.getByLabelText('New price counts from'), {
      target: { value: '2026-10-10' },
    });
    expect(screen.getByText('Days before 10 Oct 2026 keep ₹49 a kg.')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateRate).toHaveBeenCalled());
    expect(updateRate.mock.calls[0][0]).toEqual({
      kindId: 4,
      data: {
        name: 'Cap',
        items: [{ code: 'PM0000641', name: 'CAP ALASKA SKY BLUE A27W' }],
        grams_per_piece: '2.5',
        pieces_per_box: 6000,
        price_per_kg: '52',
        effective_from: '2026-10-10',
      },
    });
  });

  it('leaves the price alone when only the weight changes', async () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');

    fireEvent.click(screen.getByRole('button', { name: 'Change Cap' }));
    fireEvent.change(screen.getByLabelText('Weight a piece (g)'), { target: { value: '2.5' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateRate).toHaveBeenCalled());
    expect(updateRate.mock.calls[0][0].data).not.toHaveProperty('price_per_kg');
  });

  it('adds a scrap with its SAP items', async () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');

    fireEvent.click(screen.getByRole('button', { name: /add scrap/i }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Scrap'), { target: { value: 'Preform 12.5 GM' } });
    fireEvent.change(dialog.getByLabelText('Search SAP items'), { target: { value: 'PREFORM' } });
    fireEvent.click(dialog.getByRole('button', { name: /PM0000654 PREFORM 12.5 GMS/ }));
    fireEvent.change(dialog.getByLabelText('Weight a piece (g)'), { target: { value: '12.5' } });
    fireEvent.change(dialog.getByLabelText('Price a kg (₹)'), { target: { value: '49' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(createRate).toHaveBeenCalled());
    expect(createRate.mock.calls[0][0]).toMatchObject({
      name: 'Preform 12.5 GM',
      items: [{ code: 'PM0000654', name: 'PREFORM 12.5 GMS' }],
      grams_per_piece: '12.5',
      pieces_per_box: null,
      price_per_kg: '49',
    });
  });

  it('shows the scrap rates without changing them to those who only read', () => {
    perms.canEdit = false;
    try {
      render(<FillingCostPage />);
      openDay('2026-09-26');
      expect(screen.getByText('Preform 10.5 GM')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add scrap/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Change Cap' })).not.toBeInTheDocument();
    } finally {
      perms.canEdit = true;
    }
  });
});
