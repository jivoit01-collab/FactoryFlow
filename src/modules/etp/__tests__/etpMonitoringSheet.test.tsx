import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ETP_PERMISSIONS } from '@/config/permissions';

import EtpMonitoringPage from '../pages/EtpMonitoringPage';

const PLANT = {
  id: 1,
  name: 'Effluent Treatment Plant',
  code: 'ETP',
  plant_type: 'ETP',
  plant_type_display: 'ETP — Effluent Treatment Plant',
  location: 'Ganaur',
  company_codes: [],
  companies_display: 'Jivo Oil',
  capacity_kld: null,
  consent_number: '',
  sequence: 1,
  is_active: true,
};

const PH = {
  id: 11,
  plant: 1,
  plant_code: 'ETP',
  stage: 'TREATED',
  stage_display: 'Treated effluent water',
  parameter_key: 'ph',
  parameter_name: 'pH',
  unit: '',
  min_value: '6.5000',
  max_value: '8.5000',
  specification_text: '6.5-8.5',
  validation_type: 'RANGE',
  sequence: 1,
  is_active: true,
};

const DO = {
  ...PH,
  id: 12,
  parameter_key: 'do',
  parameter_name: 'DO',
  unit: 'ppm',
  min_value: '2.0000',
  max_value: null,
  specification_text: '≥ 2.0',
  validation_type: 'MIN',
  sequence: 2,
};

const STAFF = [
  {
    id: 5,
    name: 'Anurag',
    role: 'OPERATOR',
    role_display: 'Operator',
    employee_code: '',
    plant_ids: [],
    sequence: 1,
    is_active: true,
  },
];

const createRecord = vi.hoisted(() => vi.fn().mockResolvedValue({}));
/** The sheet already on file for the chosen plant/date. Empty unless a test sets it. */
const saved = vi.hoisted(() => ({ current: [] as unknown[] }));

vi.mock('../api', () => ({
  useEtpPlants: () => ({ data: [PLANT], isLoading: false }),
  useEtpStaff: () => ({ data: STAFF, isLoading: false }),
  useEtpSheetTemplate: () => ({
    data: { plant: 1, interval_hours: 2, time_slots: ['06:00', '08:00'], parameters: [PH, DO] },
    isLoading: false,
  }),
  useEtpMonitoringRecords: () => ({ data: saved.current, isLoading: false }),
  useCreateEtpMonitoringRecord: () => ({ mutateAsync: createRecord, isPending: false }),
  useUpdateEtpMonitoringRecord: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useVerifyEtpMonitoringRecord: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEtpChangeLog: () => ({ data: [], isLoading: false }),
  useEtpPrintDocuments: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/core/auth', () => ({
  useAuth: () => ({ currentCompany: { company_code: 'JIVO_OIL' } }),
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: (permission: string) => permission === ETP_PERMISSIONS.MANAGE_MONITORING,
    hasAnyPermission: () => true,
  }),
}));

function openSheet() {
  render(<EtpMonitoringPage />);
  fireEvent.change(screen.getByLabelText('Plant'), { target: { value: '1' } });
}

/** The grid row for a time slot. The "Starts at" filter shows 06:00 too, so
 *  match the time INPUT rather than any element with that display value. */
function rowAt(time: string) {
  const input = screen
    .getAllByDisplayValue(time)
    .find((element) => element.tagName === 'INPUT') as HTMLElement;
  return input.closest('tr') as HTMLElement;
}

describe('ETP on-line monitoring sheet', () => {
  beforeEach(() => {
    saved.current = [];
  });

  it('lays the sheet out from the configured parameters and time slots', () => {
    openSheet();

    // Columns come from the plant's parameters, grouped by sampling point.
    expect(screen.getByText('Treated effluent water')).toBeInTheDocument();
    expect(screen.getByText(/^pH$/)).toBeInTheDocument();
    expect(screen.getByText('DO (ppm)')).toBeInTheDocument();
    // Rows come from the interval — 06:00 and 08:00 in this template.
    expect(rowAt('06:00')).toBeInTheDocument();
    expect(rowAt('08:00')).toBeInTheDocument();
  });

  it('flags a reading outside the configured limits without refusing it', () => {
    openSheet();
    const [phInput] = within(rowAt('06:00')).getAllByRole('spinbutton');

    fireEvent.change(phInput, { target: { value: '9.6' } });

    expect(screen.getByText('1 out of spec')).toBeInTheDocument();
    expect((phInput as HTMLInputElement).value).toBe('9.6');
  });

  it('saves only the cells that were filled in', async () => {
    openSheet();
    const [phInput, doInput] = within(rowAt('06:00')).getAllByRole('spinbutton');
    fireEvent.change(phInput, { target: { value: '7.44' } });
    fireEvent.change(doInput, { target: { value: '2.4' } });

    fireEvent.click(screen.getByRole('button', { name: /save sheet/i }));

    await waitFor(() => expect(createRecord).toHaveBeenCalled());
    const payload = createRecord.mock.calls[0][0];
    expect(payload).toMatchObject({ plant: 1, interval_hours: 2 });
    // The untouched 08:00 slot is not filed at all — the paper form leaves it blank.
    expect(payload.readings).toHaveLength(1);
    expect(payload.readings[0]).toMatchObject({ reading_time: '06:00' });
    expect(payload.readings[0].values).toEqual([
      { parameter: 11, value: '7.44' },
      { parameter: 12, value: '2.4' },
    ]);
  });

  it('reopens a filed sheet with its blank slots still laid out', () => {
    // 06:00 was filled and filed; 08:00 was left blank so it was never filed.
    saved.current = [
      {
        id: 9,
        plant: 1,
        date: '2026-09-04',
        interval_hours: 2,
        chemist: null,
        verified_by: null,
        verified_at: null,
        remarks: '',
        readings: [
          {
            id: 3,
            reading_time: '06:00:00',
            operator: 5,
            remarks: '',
            values: [
              { id: 1, parameter: 11, value: '7.440', is_out_of_spec: false },
              { id: 2, parameter: 12, value: '2.400', is_out_of_spec: false },
            ],
          },
        ],
      },
    ];

    openSheet();

    // The filed row keeps its values...
    const [phInput] = within(rowAt('06:00')).getAllByRole('spinbutton');
    expect((phInput as HTMLInputElement).value).toBe('7.440');
    // ...and the unfiled slot is still on the sheet to be filled in later, the
    // way the paper form is pre-printed for the whole day.
    expect(rowAt('08:00')).toBeInTheDocument();
  });
});
