/**
 * The branch field on the hire/edit form.
 *
 * Branch carries no logic of its own, so what is worth pinning down is the one
 * thing that would be wrong silently: which branch is selected before anybody
 * touches it. Getting that wrong files every new joiner under the wrong label
 * and nothing complains.
 *
 * Specifically: a new hire opens on the master's default (including when the
 * master arrives *after* the dialog has mounted, which is why the field is not
 * seeded into state), an edit opens on whatever the person is already filed
 * under, and a deactivated branch is not offered — unless it is the one they
 * already hold, since dropping it from the list would re-file them on save.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmployeeFormDialog } from '../components/EmployeeFormDialog';
import type { Branch, EmployeeDetail, EmployeeMeta } from '../types';

const createMutate = vi.fn();
const updateMutate = vi.fn();

vi.mock('../api', () => ({
  useCreateEmployee: () => ({ mutate: createMutate, isPending: false }),
  useUpdateEmployee: () => ({ mutate: updateMutate, isPending: false }),
}));

function branch(id: number, name: string, extra: Partial<Branch> = {}): Branch {
  return {
    id,
    code: name.toUpperCase().replace(/\s/g, '_'),
    name,
    description: '',
    status: 'ACTIVE',
    is_default: false,
    employee_count: 0,
    ...extra,
  };
}

const OIL = branch(1, 'Jivo Oil', { is_default: true });
const MART = branch(2, 'Jivo Mart');
const CLOSED = branch(3, 'Old Depot', { status: 'INACTIVE' });

function meta(overrides: Partial<EmployeeMeta> = {}): EmployeeMeta {
  return {
    departments: [],
    designations: [],
    branches: [OIL, MART, CLOSED],
    default_branch: OIL.id,
    managers: [],
    assignable_users: [],
    employment_statuses: [{ value: 'ACTIVE', label: 'Active' }],
    revision_types: [],
    salary_statuses: [],
    history_events: [],
    sort_options: [],
    headcount: 0,
    permissions: {
      can_view_employees: true,
      can_manage_employees: true,
      can_manage_structure: true,
      can_view_reports: false,
      can_view_audit: false,
      can_record_presence: false,
      salary: {
        any: false, own: false, subordinates: false, department: false,
        all: false, history: false, create: false, update: false, approve: false,
      },
      self_employee_id: null,
      self_employee_code: null,
    },
    ...overrides,
  } as EmployeeMeta;
}

function employee(overrides: Partial<EmployeeDetail> = {}): EmployeeDetail {
  return {
    id: 9,
    employee_code: 'EMP009',
    full_name: 'Kavya Test',
    first_name: 'Kavya',
    last_name: 'Test',
    email: '',
    phone: '',
    photo: null,
    initials: 'KT',
    job_title: '',
    location: '',
    department: null,
    department_name: null,
    designation: null,
    designation_name: null,
    employment_status: 'ACTIVE',
    status_display: 'Active',
    hierarchy_level: 2,
    is_manager: false,
    date_of_birth: null,
    joining_date: '2020-01-01',
    exit_date: null,
    department_detail: null,
    designation_detail: null,
    branch: MART.id,
    branch_detail: MART,
    manager: null,
    reporting_manager: null,
    hierarchy_path: '/9/',
    direct_report_count: 0,
    user: null,
    user_detail: null,
    salary: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as EmployeeDetail;
}

function branchSelect() {
  return screen.getByLabelText('Branch') as HTMLSelectElement;
}

describe('the branch field', () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
  });

  it('opens a new hire on the master default', () => {
    render(<EmployeeFormDialog open onOpenChange={() => {}} meta={meta()} />);
    expect(branchSelect().value).toBe(String(OIL.id));
  });

  it('marks which option is the default so the choice is legible', () => {
    render(<EmployeeFormDialog open onOpenChange={() => {}} meta={meta()} />);
    expect(screen.getByRole('option', { name: 'Jivo Oil (default)' })).toBeInTheDocument();
  });

  it('picks up a default that arrives after the dialog mounted', () => {
    // meta is a prop, and the field is deliberately not seeded into state —
    // a form that mounted before the fetch resolved must not stay blank.
    const { rerender } = render(
      <EmployeeFormDialog open onOpenChange={() => {}} meta={undefined} />,
    );
    expect(branchSelect().value).toBe('');
    rerender(<EmployeeFormDialog open onOpenChange={() => {}} meta={meta()} />);
    expect(branchSelect().value).toBe(String(OIL.id));
  });

  it('lets the default be overridden and sends what was chosen', () => {
    render(<EmployeeFormDialog open onOpenChange={() => {}} meta={meta()} />);
    fireEvent.change(branchSelect(), { target: { value: String(MART.id) } });
    expect(branchSelect().value).toBe(String(MART.id));

    fireEvent.change(screen.getByLabelText(/Employee code/), { target: { value: 'EMP100' } });
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'New' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add employee' }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0][0]).toMatchObject({ branch: MART.id });
  });

  it('does not offer a deactivated branch on a hire', () => {
    render(<EmployeeFormDialog open onOpenChange={() => {}} meta={meta()} />);
    expect(screen.queryByRole('option', { name: 'Old Depot' })).not.toBeInTheDocument();
  });

  it('opens an edit on what the person is already filed under', () => {
    render(
      <EmployeeFormDialog open onOpenChange={() => {}} meta={meta()} employee={employee()} />,
    );
    expect(branchSelect().value).toBe(String(MART.id));
  });

  it('keeps offering a deactivated branch to the person who holds it', () => {
    render(
      <EmployeeFormDialog
        open
        onOpenChange={() => {}}
        meta={meta()}
        employee={employee({ branch: CLOSED.id, branch_detail: CLOSED })}
      />,
    );
    expect(branchSelect().value).toBe(String(CLOSED.id));
    expect(screen.getByRole('option', { name: 'Old Depot' })).toBeInTheDocument();
  });

  it('leaves an unfiled employee unfiled rather than defaulting them on edit', () => {
    // The default belongs to hiring. Silently re-filing somebody mid-edit
    // would assert a branch nobody chose for them.
    render(
      <EmployeeFormDialog
        open
        onOpenChange={() => {}}
        meta={meta()}
        employee={employee({ branch: null, branch_detail: null })}
      />,
    );
    expect(branchSelect().value).toBe('');
  });

  it('says so when no branch master has been set up yet', () => {
    render(
      <EmployeeFormDialog
        open
        onOpenChange={() => {}}
        meta={meta({ branches: [], default_branch: null })}
      />,
    );
    expect(branchSelect().value).toBe('');
    expect(
      screen.getByRole('option', { name: 'No branches set up yet' }),
    ).toBeInTheDocument();
  });
});
