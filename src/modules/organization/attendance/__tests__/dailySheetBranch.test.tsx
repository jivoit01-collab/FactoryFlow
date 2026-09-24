/**
 * The daily sheet names each person's branch, beside their department.
 *
 * Branch is optional on an employee — the directory predates it — so an
 * unfiled person must read as a dash, not as an empty cell that looks like a
 * rendering fault.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DailyAttendanceRow } from '../api/attendance.api';

const row = (over: Partial<DailyAttendanceRow>): DailyAttendanceRow => ({
  id: 1,
  date: '2026-09-16',
  employee: 1,
  employee_code: 'JWPL0593',
  employee_name: 'Vishal Tyagi',
  department_name: 'Production',
  branch_name: 'Sonipat',
  machine_status: 'PRESENT',
  machine_status_display: 'Present',
  machine_first_punch: '09:01:00',
  machine_last_punch: '18:02:00',
  machine_punch_count: 2,
  machine_worked_minutes: 541,
  devices: '',
  effective_status: 'PRESENT',
  effective_status_display: 'Present',
  is_overridden: false,
  override_reason_code: '',
  override_reason_code_display: '',
  override_reason: '',
  overridden_by: null,
  overridden_by_name: null,
  overridden_at: null,
  synced_at: null,
  ...over,
});

const ROWS = [
  row({}),
  row({
    id: 2,
    employee: 2,
    employee_code: 'JWPL0594',
    employee_name: 'Ravi Kumar',
    branch_name: null,
  }),
];

vi.mock('@/core/auth', () => ({
  usePermission: () => ({ hasPermission: () => false }),
}));

vi.mock('../api', () => ({
  useDailyAttendance: () => ({ data: ROWS, isLoading: false }),
  useAttendanceSummary: () => ({ data: undefined }),
  useAttendanceSourceStatus: () => ({ data: undefined }),
  useSyncAttendance: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('../components/OverrideDialog', () => ({ OverrideDialog: () => null }));
vi.mock('../components/HistoryDialog', () => ({ HistoryDialog: () => null }));

import DailyAttendancePage from '../pages/DailyAttendancePage';

describe('daily sheet branch column', () => {
  it('shows a Branch column right after Department', () => {
    render(<DailyAttendancePage />);
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers.indexOf('Branch')).toBe(headers.indexOf('Department') + 1);
  });

  it("shows each person's branch, and a dash for somebody not filed under one", () => {
    render(<DailyAttendancePage />);
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
    const column = headers.indexOf('Branch');
    const cellFor = (name: string) =>
      within(screen.getByText(name).closest('tr') as HTMLElement).getAllByRole('cell')[column];

    expect(cellFor('Vishal Tyagi').textContent).toBe('Sonipat');
    expect(cellFor('Ravi Kumar').textContent).toBe('—');
  });
});
