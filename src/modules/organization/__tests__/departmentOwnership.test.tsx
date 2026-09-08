import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DepartmentOwnershipPage from '../pages/DepartmentOwnershipPage';

const CHART = {
  plant_name: 'Oil Plant',
  plant_head: 'Gagan Veerji',
  departments: [
    {
      id: 1,
      name: 'Procurement',
      head: 'Shunty Veerji',
      sort_order: 0,
      functions: [
        {
          id: 11,
          name: 'OIL',
          subtitle: '',
          owners: ['Shunty Veerji'],
          level_1: ['Raspreet', 'Lovepreet'],
          level_2: ['Team'],
          sort_order: 0,
        },
        {
          id: 12,
          name: 'Packing material',
          subtitle: '',
          owners: ['Ravinder Veerji'],
          level_1: [],
          level_2: ['Team'],
          sort_order: 1,
        },
      ],
    },
    {
      id: 2,
      name: 'Production',
      head: 'Kulbir Veerji',
      sort_order: 1,
      functions: [
        {
          id: 21,
          name: 'Storage',
          subtitle: 'OIL',
          owners: ['Vicky Veerji'],
          level_1: ['Sunil'],
          level_2: ['Team'],
          sort_order: 0,
        },
        {
          id: 22,
          name: 'Storage',
          subtitle: 'Packing material',
          owners: ['Kulbir Veerji'],
          level_1: ['Shahrukh'],
          level_2: ['Team'],
          sort_order: 1,
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

/**
 * The chart exactly as an OLDER backend sends it: no plant heading, no
 * department head, no section subtitle. The two halves do not deploy together,
 * so this shape reaches a new bundle in the wild.
 */
function openPreHeadingChart() {
  chart.current = {
    departments: CHART.departments.map((department) => ({
      id: department.id,
      name: department.name,
      sort_order: department.sort_order,
      functions: department.functions.map((row) => ({
        id: row.id,
        name: row.name,
        owners: row.owners,
        level_1: row.level_1,
        level_2: row.level_2,
        sort_order: row.sort_order,
      })),
    })),
    can_manage: true,
  };
  saveChart.mockClear();
  render(<DepartmentOwnershipPage />);
}

/** The payload of the one save the page sent. */
function savedPayload() {
  return saveChart.mock.calls[0][0];
}

describe('Department ownership chart', () => {
  it('draws the heading, every department and the people at each level', () => {
    openChart();

    expect(screen.getByText('Oil Plant')).toBeInTheDocument();
    expect(screen.getByText('Gagan Veerji')).toBeInTheDocument();
    expect(screen.getByText('Procurement')).toBeInTheDocument();
    // The department head sits under the department's name.
    expect(screen.getByText('Shunty Veerji', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getAllByText('OIL').length).toBeGreaterThan(0);
    expect(screen.getByText('Raspreet')).toBeInTheDocument();
  });

  it('tells two rows of one section apart by their second line', () => {
    openChart();

    // "Storage" twice, with its own second line under each.
    expect(screen.getAllByText('Storage')).toHaveLength(2);
    // Once as Procurement's section, once as Storage's second line.
    expect(screen.getAllByText('Packing material')).toHaveLength(2);
    expect(screen.getByText('Sunil')).toBeInTheDocument();
    expect(screen.getByText('Shahrukh')).toBeInTheDocument();
  });

  it('still reads when the backend is older than the bundle', () => {
    openPreHeadingChart();

    // The chart itself is what people came for, and it is all there.
    expect(screen.getByText('Procurement')).toBeInTheDocument();
    expect(screen.getByText('Raspreet')).toBeInTheDocument();
    expect(screen.getByText('Lovepreet')).toBeInTheDocument();
  });

  it('opens the editor against an older backend instead of blowing up', async () => {
    openPreHeadingChart();

    // Used to throw: plant_name was undefined and the draft trimmed it.
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));
    expect(screen.getByRole('button', { name: /Save changes/ })).toBeDisabled();

    const field = screen.getByLabelText('Add to Supported by (L2) for OIL');
    fireEvent.change(field, { target: { value: 'Gopi' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    // The fields it never received go back empty, not undefined.
    expect(savedPayload()).toMatchObject({ plant_name: '', plant_head: '' });
    expect(savedPayload().departments[0]).toMatchObject({ head: '' });
    expect(savedPayload().departments[0].functions[0]).toMatchObject({ subtitle: '' });
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

    const field = screen.getByLabelText('Add to Supported by (L2) for OIL');
    fireEvent.change(field, { target: { value: ' Gopi ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    const [procurement] = savedPayload().departments;
    expect(procurement.functions[0]).toMatchObject({
      id: 11,
      name: 'OIL',
      level_1: ['Raspreet', 'Lovepreet', 'Gopi'],
    });
    // Everything else went back exactly as it came.
    expect(procurement).toMatchObject({ id: 1, head: 'Shunty Veerji' });
    expect(procurement.functions[1]).toMatchObject({ id: 12, owners: ['Ravinder Veerji'] });
  });

  it('names the field by the section and its second line', async () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    const field = screen.getByLabelText('Add to Leader (L1) for Storage – Packing material');
    fireEvent.change(field, { target: { value: 'Shahrukh' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    expect(savedPayload().departments[1].functions[1]).toMatchObject({
      id: 22,
      name: 'Storage',
      subtitle: 'Packing material',
      owners: ['Kulbir Veerji', 'Shahrukh'],
    });
  });

  it('saves an edited plant head and department head', async () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    fireEvent.change(screen.getByLabelText('Plant head'), { target: { value: 'Gagan S.' } });
    fireEvent.change(screen.getByLabelText('Head of Production'), {
      target: { value: 'Kulbir S.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    expect(savedPayload()).toMatchObject({ plant_name: 'Oil Plant', plant_head: 'Gagan S.' });
    expect(savedPayload().departments[1].head).toBe('Kulbir S.');
  });

  it('commits a name still sitting in the field when Save is pressed', async () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    const field = screen.getByLabelText('Add to Leader (L1) for Packing material');
    fireEvent.change(field, { target: { value: 'Gagan Veerji' } });
    // No Enter: pressing Save takes focus off the field, which must commit it.
    fireEvent.blur(field);
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    expect(savedPayload().departments[0].functions[1].owners).toEqual([
      'Ravinder Veerji',
      'Gagan Veerji',
    ]);
  });

  it('drops a name that is taken off a row', async () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Lovepreet from Supported by (L2) for OIL' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    expect(savedPayload().departments[0].functions[0].level_1).toEqual(['Raspreet']);
  });

  it('saves a new row without an id and keeps the rows that had one', async () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    fireEvent.click(screen.getAllByRole('button', { name: /Add section/ })[1]);
    // The new row is the last one on the page.
    const rows = screen.getAllByPlaceholderText('Leave blank for the whole department');
    fireEvent.change(rows[rows.length - 1], { target: { value: 'Lab' } });
    const owner = screen.getByLabelText('Add to Leader (L1) for Lab');
    fireEvent.change(owner, { target: { value: 'Sonu' } });
    fireEvent.keyDown(owner, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    const production = savedPayload().departments[1];
    expect(production.functions).toHaveLength(3);
    expect(production.functions[0].id).toBe(21);
    expect(production.functions[2]).toMatchObject({ name: 'Lab', subtitle: '', owners: ['Sonu'] });
    expect(production.functions[2].id).toBeUndefined();
  });

  it('sends the new order when a department is moved up', async () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    fireEvent.click(screen.getByRole('button', { name: 'Move Production up' }));
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(saveChart).toHaveBeenCalledTimes(1));
    expect(
      savedPayload().departments.map((department: { name: string }) => department.name),
    ).toEqual(['Production', 'Procurement']);
  });

  it('refuses to save a department left unnamed', () => {
    openChart();
    fireEvent.click(screen.getByRole('button', { name: 'Edit chart' }));

    fireEvent.click(screen.getByRole('button', { name: /Add department/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    expect(saveChart).not.toHaveBeenCalled();
  });
});
