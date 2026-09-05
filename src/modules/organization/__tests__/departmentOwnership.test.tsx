import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DepartmentOwnershipPage from '../pages/DepartmentOwnershipPage';

const CHART = {
  departments: [
    {
      id: 1,
      name: 'Purchasing',
      sort_order: 0,
      functions: [
        {
          id: 11,
          name: 'Oil',
          owners: ['Shunty Veerji'],
          level_1: ['Raspreet', 'Lovepreet'],
          level_2: ['Team'],
          sort_order: 0,
        },
        {
          id: 12,
          name: 'Packaging Material',
          owners: ['Gagan Veerji'],
          level_1: ['Ravinder Veerji'],
          level_2: ['Team'],
          sort_order: 1,
        },
      ],
    },
    {
      id: 2,
      name: 'Quality Control',
      sort_order: 1,
      functions: [
        {
          id: 21,
          name: '',
          owners: ['Tejinderjit Veerji'],
          level_1: ['Team'],
          level_2: [],
          sort_order: 0,
        },
      ],
    },
  ],
  can_manage: true,
};

const saveChart = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const chart = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('../api', () => ({
  useOrgChart: () => ({ data: chart.current, isLoading: false, isError: false }),
  useSaveOrgChart: () => ({ mutateAsync: saveChart, isPending: false }),
}));

vi.mock('@/shared/components', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/components')>()),
  confirmDialog: vi.fn().mockResolvedValue(true),
}));

function openChart(canManage = true) {
  chart.current = { ...CHART, can_manage: canManage };
  saveChart.mockClear();
  render(<DepartmentOwnershipPage />);
}

/** The payload of the one save the page sent. */
function savedPayload() {
  return saveChart.mock.calls[0][0];
}

describe('Department ownership chart', () => {
  it('draws every department, its rows and the people at each level', () => {
    openChart();

    expect(screen.getByText('Purchasing')).toBeInTheDocument();
    expect(screen.getByText('Quality Control')).toBeInTheDocument();
    expect(screen.getByText('Oil')).toBeInTheDocument();
    expect(screen.getByText('Shunty Veerji')).toBeInTheDocument();
    expect(screen.getByText('Raspreet')).toBeInTheDocument();
    expect(screen.getByText('Lovepreet')).toBeInTheDocument();
    // A department with no sub-divisions says so rather than showing a blank.
    expect(screen.getByText('Whole department')).toBeInTheDocument();
  });

  it('offers no way in for somebody who may only read it', () => {
    openChart(false);

    expect(screen.queryByRole('button', { name: 'Edit chart' })).not.toBeInTheDocument();
  });

  it('keeps Save out of reach until something actually changed', () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    expect(screen.getByRole('button', { name: /Save changes/ })).toBeDisabled();
  });

  it('saves an added name against the row it was typed into', async () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    const field = screen.getByLabelText('Add to Level-01 Support for Oil');
    fireEvent.change(field, { target: { value: ' Gopi ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    const [purchasing] = savedPayload().departments;
    expect(purchasing.functions[0]).toMatchObject({
      id: 11,
      name: 'Oil',
      level_1: ['Raspreet', 'Lovepreet', 'Gopi'],
    });
    // Everything else went back exactly as it came.
    expect(purchasing.functions[1]).toMatchObject({ id: 12, owners: ['Gagan Veerji'] });
  });

  it('commits a name still sitting in the field when Save is pressed', async () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    const field = screen.getByLabelText('Add to Ownership for Packaging Material');
    fireEvent.change(field, { target: { value: 'Ravinder Veerji' } });
    // No Enter: pressing Save takes focus off the field, which must commit it.
    fireEvent.blur(field);
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    expect(savedPayload().departments[0].functions[1].owners).toEqual([
      'Gagan Veerji',
      'Ravinder Veerji',
    ]);
  });

  it('drops a name that is taken off a row', async () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Lovepreet from Level-01 Support for Oil' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    expect(savedPayload().departments[0].functions[0].level_1).toEqual(['Raspreet']);
  });

  it('saves a new row without an id and keeps the rows that had one', async () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    fireEvent.click(screen.getAllByRole('button', { name: /Add function/ })[1]);
    // The new row is the last one on the page.
    const rows = screen.getAllByPlaceholderText('Leave blank for the whole department');
    const rowName = rows[rows.length - 1];
    fireEvent.change(rowName, { target: { value: 'Lab' } });
    const owner = screen.getByLabelText('Add to Ownership for Lab');
    fireEvent.change(owner, { target: { value: 'Sonu' } });
    fireEvent.keyDown(owner, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    const qc = savedPayload().departments[1];
    expect(qc.functions).toHaveLength(2);
    expect(qc.functions[0].id).toBe(21);
    expect(qc.functions[1]).toMatchObject({ name: 'Lab', owners: ['Sonu'] });
    expect(qc.functions[1].id).toBeUndefined();
  });

  it('sends the new order when a department is moved up', async () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    fireEvent.click(screen.getByRole('button', { name: 'Move Quality Control up' }));
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    expect(
      savedPayload().departments.map((department: { name: string }) => department.name),
    ).toEqual(['Quality Control', 'Purchasing']);
  });

  it('refuses to save a department left unnamed', () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    fireEvent.click(screen.getByRole('button', { name: /Add department/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    expect(saveChart).not.toHaveBeenCalled();
  });
});
