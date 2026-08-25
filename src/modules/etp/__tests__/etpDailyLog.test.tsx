import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ETP_PERMISSIONS } from '@/config/permissions';

import EtpDailyLogPage from '../pages/EtpDailyLogPage';

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

const LOG = {
  id: 7,
  plant: 1,
  plant_code: 'ETP',
  plant_name: 'Effluent Treatment Plant',
  date: '2026-08-01',
  inlet_initial: '7986.05',
  inlet_final: '8002.95',
  inlet_total: '16.90',
  outlet_initial: '7451.67',
  outlet_final: '7467.67',
  outlet_total: '16.00',
  ph_reading: '7.84',
  ph_reading_time: null,
  energy_initial: '766.00',
  energy_final: '796.00',
  energy_units: '30.00',
  operator: 5,
  operator_name: 'Anurag',
  chemist: null,
  chemist_name: '',
  remarks: '',
  created_by_name: 'Operator',
};

const CHANGE = {
  id: 3,
  register: 'DAILY_LOG',
  register_display: 'Daily plant log',
  action: 'UPDATED',
  action_display: 'Edited',
  object_id: 7,
  model_name: 'dailyplantlog',
  plant: 1,
  plant_code: 'ETP',
  entry_date: '2026-08-01',
  changes: { ph_reading: { from: '7.84', to: '7.60' } },
  summary: 'pH reading 7.84 → 7.60',
  changed_by: 2,
  changed_by_name: 'Yogesh',
  changed_at: '2026-08-02T09:15:00Z',
};

const createLog = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getLastReadings = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    found: true,
    date: '2026-08-01',
    inlet_final: '8002.95',
    outlet_final: '7467.67',
    energy_final: '796.00',
  }),
);

vi.mock('../api', () => ({
  etpApi: { getLastReadings },
  useEtpPlants: () => ({ data: [PLANT], isLoading: false }),
  useEtpStaff: () => ({ data: [], isLoading: false }),
  useEtpDailyLogs: () => ({ data: [LOG], isLoading: false }),
  useCreateEtpDailyLog: () => ({ mutateAsync: createLog, isPending: false }),
  useUpdateEtpDailyLog: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteEtpDailyLog: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEtpChangeLog: () => ({ data: [CHANGE], isLoading: false }),
  useEtpPrintDocuments: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/core/auth', () => ({
  useAuth: () => ({ currentCompany: { company_code: 'JIVO_OIL' } }),
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: (permission: string) => permission === ETP_PERMISSIONS.MANAGE_DAILY_LOG,
    hasAnyPermission: () => true,
  }),
}));

const dialog = () => within(screen.getByRole('dialog'));

describe('ETP daily plant log', () => {
  it('shows the derived totals for a recorded day', () => {
    render(<EtpDailyLogPage />);

    const row = screen.getByText('16.90').closest('tr') as HTMLElement;
    expect(within(row).getByText('2026-08-01')).toBeInTheDocument();
    expect(within(row).getByText('16.00')).toBeInTheDocument();
    expect(within(row).getByText('30.00')).toBeInTheDocument();
  });

  it('carries yesterday’s closings into today’s openings and previews the totals', async () => {
    render(<EtpDailyLogPage />);
    fireEvent.click(screen.getByRole('button', { name: /record day/i }));

    fireEvent.change(dialog().getByLabelText('Plant'), { target: { value: '1' } });
    await waitFor(() => expect(getLastReadings).toHaveBeenCalled());

    const openings = dialog().getAllByLabelText('Initial') as HTMLInputElement[];
    await waitFor(() => expect(openings[0].value).toBe('8002.95'));
    expect(openings[1].value).toBe('7467.67');
    expect(openings[2].value).toBe('796.00');

    // Typing the closing figure previews the register's TOTAL column.
    const closings = dialog().getAllByLabelText('Final') as HTMLInputElement[];
    fireEvent.change(closings[0], { target: { value: '8019.65' } });
    expect(dialog().getByText(/total 16.70 KL/)).toBeInTheDocument();

    fireEvent.click(dialog().getByRole('button', { name: /^record day$/i }));
    await waitFor(() => expect(createLog).toHaveBeenCalled());
    expect(createLog.mock.calls[0][0]).toMatchObject({
      plant: 1,
      inlet_initial: '8002.95',
      inlet_final: '8019.65',
    });
  });

  it('shows the entry’s own history under its form', () => {
    render(<EtpDailyLogPage />);
    fireEvent.click(screen.getByLabelText('Edit 2026-08-01'));

    // The history sits inside the entry being edited, so it can only be read as
    // that day's history.
    const history = dialog().getByText('Edit history').closest('section') as HTMLElement;
    expect(within(history).getByText('Edited')).toBeInTheDocument();

    fireEvent.click(within(history).getByRole('button', { name: /pH reading 7.84/ }));
    const detail = within(history).getByText('ph reading').closest('tr') as HTMLElement;
    expect(within(detail).getByText('7.84')).toBeInTheDocument();
    expect(within(detail).getByText('7.60')).toBeInTheDocument();
    expect(within(history).getByText(/by Yogesh/)).toBeInTheDocument();
  });
});
