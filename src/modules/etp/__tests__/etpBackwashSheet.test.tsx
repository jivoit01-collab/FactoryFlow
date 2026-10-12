import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BackwashSheetDialog } from '../components/BackwashSheetDialog';
import type { BackwashEquipment } from '../types';

const PLANTS = [
  {
    id: 1,
    name: 'Effluent Treatment Plant',
    code: 'ETP',
    plant_type: 'ETP',
    plant_type_display: 'ETP — Effluent Treatment Plant',
    location: 'Ganaur',
    company_codes: [],
    companies_display: '',
    capacity_kld: null,
    consent_number: '',
    sequence: 1,
    is_active: true,
  },
  {
    id: 2,
    name: 'Sewage Treatment Plant',
    code: 'STP',
    plant_type: 'STP',
    plant_type_display: 'STP — Sewage Treatment Plant',
    location: 'Ganaur',
    company_codes: [],
    companies_display: '',
    capacity_kld: null,
    consent_number: '',
    sequence: 2,
    is_active: true,
  },
] as const;

const step = (overrides: Partial<BackwashEquipment>): BackwashEquipment => ({
  id: 0,
  plant: 1,
  plant_code: 'ETP',
  name: '',
  equipment_code: '',
  default_chemical: null,
  default_chemical_name: '',
  default_duration_minutes: null,
  sequence: 0,
  is_active: true,
  ...overrides,
});

const EQUIPMENT = [
  step({ id: 11, name: 'Sand Filter Backwash', default_duration_minutes: 10, sequence: 1 }),
  step({ id: 12, name: 'Sand Filter Rinse', default_duration_minutes: 5, sequence: 2 }),
  step({ id: 13, name: 'Carbon Filter Backwash', default_chemical: 4, sequence: 3 }),
  step({ id: 21, plant: 2, plant_code: 'STP', name: 'STP Pressure Filter', sequence: 1 }),
];

const CHEMICALS = [
  {
    id: 4,
    name: 'Hypo',
    default_uom: 'KG',
    uom_display: 'kg',
    plant_ids: [1],
    sequence: 1,
    remarks: '',
    is_active: true,
  },
];

const STAFF = [
  {
    id: 5,
    name: 'Anurag',
    role: 'OPERATOR',
    role_display: 'Operator',
    employee_code: '',
    plant_ids: [1],
    sequence: 1,
    is_active: true,
  },
];

const createSheet = vi.hoisted(() => vi.fn());
const dayEntries = vi.hoisted(() => ({ rows: [] as object[] }));

vi.mock('../api', () => ({
  useEtpBackwashEntries: () => ({ data: dayEntries.rows, isLoading: false }),
  useCreateEtpBackwashSheet: () => ({ mutateAsync: createSheet, isPending: false }),
}));

const renderSheet = (initialPlant = '') =>
  render(
    <BackwashSheetDialog
      open
      onOpenChange={vi.fn()}
      initialPlant={initialPlant}
      plants={PLANTS as never}
      equipment={EQUIPMENT}
      chemicals={CHEMICALS as never}
      staff={STAFF as never}
    />,
  );

const dialog = () => within(screen.getByRole('dialog'));

describe('ETP back washing — all steps in one form', () => {
  beforeEach(() => {
    createSheet.mockReset().mockResolvedValue([]);
    dayEntries.rows = [];
  });

  it('lays out every step of the plant once the plant is picked', () => {
    renderSheet();
    expect(dialog().getByText(/pick the plant/i)).toBeInTheDocument();
    expect(dialog().queryByText('Sand Filter Backwash')).not.toBeInTheDocument();

    fireEvent.change(dialog().getByLabelText('Plant'), { target: { value: '1' } });

    expect(dialog().getByText('Sand Filter Backwash')).toBeInTheDocument();
    expect(dialog().getByText('Sand Filter Rinse')).toBeInTheDocument();
    expect(dialog().getByText('Carbon Filter Backwash')).toBeInTheDocument();
    // Another plant's step stays out of this plant's sheet.
    expect(dialog().queryByText('STP Pressure Filter')).not.toBeInTheDocument();
    expect(dialog().getAllByLabelText('Start')).toHaveLength(3);
  });

  it('files only the steps given a start time, each with its own clock', async () => {
    renderSheet('1');
    fireEvent.change(dialog().getByLabelText('Operator'), { target: { value: '5' } });

    const starts = dialog().getAllByLabelText('Start') as HTMLInputElement[];
    const stops = dialog().getAllByLabelText('Stop') as HTMLInputElement[];
    fireEvent.change(starts[0], { target: { value: '08:20' } });
    // The step's usual duration fills its stop time.
    expect(stops[0].value).toBe('08:30');
    fireEvent.change(starts[2], { target: { value: '09:00' } });
    fireEvent.change(stops[2], { target: { value: '09:25' } });

    fireEvent.click(dialog().getByRole('button', { name: /log 2 steps/i }));
    await waitFor(() => expect(createSheet).toHaveBeenCalledTimes(1));
    expect(createSheet.mock.calls[0][0]).toMatchObject({
      plant: 1,
      operator: 5,
      chemist: null,
      steps: [
        { equipment: 11, start_time: '08:20', stop_time: '08:30', chemical: null },
        // The step's usual chemical is prefilled.
        { equipment: 13, start_time: '09:00', stop_time: '09:25', chemical: 4 },
      ],
    });
  });

  it('will not drop a row that has details but no start time', () => {
    renderSheet('1');
    const remarks = dialog().getAllByLabelText('Remarks') as HTMLInputElement[];
    fireEvent.change(remarks[1], { target: { value: 'Valve stuck' } });

    fireEvent.click(dialog().getByRole('button', { name: /log step/i }));
    expect(createSheet).not.toHaveBeenCalled();
    expect(dialog().getByText(/fill the start time, or clear this row/i)).toBeInTheDocument();
  });

  it('marks the step the server refused', async () => {
    createSheet.mockRejectedValue({
      message: 'Sand Filter Rinse start time: That step is already logged.',
      status: 400,
      errors: { 'Sand Filter Rinse.start_time': ['That step is already logged.'] },
    });
    renderSheet('1');
    const starts = dialog().getAllByLabelText('Start') as HTMLInputElement[];
    fireEvent.change(starts[0], { target: { value: '08:20' } });
    fireEvent.change(starts[1], { target: { value: '08:30' } });

    fireEvent.click(dialog().getByRole('button', { name: /log 2 steps/i }));
    const message = await dialog().findByText('That step is already logged.');
    expect(message.parentElement).toHaveTextContent('Sand Filter Rinse');
  });

  it('shows what is already on the register for that day', () => {
    dayEntries.rows = [{ id: 1, equipment: 12, start_time: '08:30:00', stop_time: '08:35:00' }];
    renderSheet('1');
    expect(dialog().getByText('Already logged: 08:30–08:35')).toBeInTheDocument();
  });
});
