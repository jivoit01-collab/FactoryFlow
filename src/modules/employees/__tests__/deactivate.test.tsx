/**
 * The Deactivate shortcut on an employee's profile.
 *
 * The button exists because setting somebody inactive was buried behind a
 * "Change" link on a status field, and it is the thing people open a leaver's
 * profile to do. What is worth pinning down is that the shortcut does not become
 * a *second* way of doing it: it opens the same dialog on a different starting
 * answer, so the exit date, the reason and — the one that matters — making a
 * departing manager name who inherits their team all still apply.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChangeStatusDialog } from '../components/OrgActionDialogs';
import type { EmployeeDetail, EmployeeMeta } from '../types';

vi.mock('../api', () => ({
  useChangeStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useChangeManager: () => ({ mutate: vi.fn(), isPending: false }),
  useChangeDepartment: () => ({ mutate: vi.fn(), isPending: false }),
  useChangeDesignation: () => ({ mutate: vi.fn(), isPending: false }),
  usePromote: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateSalary: () => ({ mutate: vi.fn(), isPending: false }),
}));

const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'RESIGNED', label: 'Resigned' },
];

const meta = { employment_statuses: STATUSES, managers: [] } as unknown as EmployeeMeta;

function person(overrides: Partial<EmployeeDetail> = {}): EmployeeDetail {
  return {
    id: 7,
    employee_code: 'TP096',
    full_name: 'Ajab Singh Rana',
    employment_status: 'ACTIVE',
    status_display: 'Active',
    direct_report_count: 0,
    exit_date: null,
    ...overrides,
  } as EmployeeDetail;
}

function statusSelect() {
  return screen.getByLabelText('Status') as HTMLSelectElement;
}

describe('the deactivate shortcut', () => {
  it('opens the status dialog already on Inactive', () => {
    render(
      <ChangeStatusDialog
        open
        onOpenChange={() => {}}
        employee={person()}
        meta={meta}
        initialStatus="INACTIVE"
      />,
    );
    expect(statusSelect().value).toBe('INACTIVE');
  });

  it('opens on Active when reactivating somebody who left', () => {
    render(
      <ChangeStatusDialog
        open
        onOpenChange={() => {}}
        employee={person({ employment_status: 'INACTIVE', status_display: 'Inactive' })}
        meta={meta}
        initialStatus="ACTIVE"
      />,
    );
    expect(statusSelect().value).toBe('ACTIVE');
  });

  it('still shows the whole list, so the shortcut does not take the decision away', () => {
    render(
      <ChangeStatusDialog
        open
        onOpenChange={() => {}}
        employee={person()}
        meta={meta}
        initialStatus="INACTIVE"
      />,
    );
    STATUSES.forEach((s) =>
      expect(screen.getByRole('option', { name: s.label })).toBeInTheDocument(),
    );
  });

  it('asks for a last working day, because inactive is an exit', () => {
    render(
      <ChangeStatusDialog
        open
        onOpenChange={() => {}}
        employee={person()}
        meta={meta}
        initialStatus="INACTIVE"
      />,
    );
    expect(screen.getByLabelText('Last working day')).toBeInTheDocument();
  });

  it('makes a departing manager say who inherits the team', () => {
    // The reason the shortcut reuses this dialog instead of writing the status
    // itself: 102 people hang off one of these managers.
    render(
      <ChangeStatusDialog
        open
        onOpenChange={() => {}}
        employee={person({ direct_report_count: 12 })}
        meta={meta}
        initialStatus="INACTIVE"
      />,
    );
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it('falls back to the employee’s own status when no shortcut was used', () => {
    render(
      <ChangeStatusDialog
        open
        onOpenChange={() => {}}
        employee={person({ employment_status: 'ON_LEAVE', status_display: 'On Leave' })}
        meta={meta}
      />,
    );
    expect(statusSelect().value).toBe('ON_LEAVE');
  });
});
