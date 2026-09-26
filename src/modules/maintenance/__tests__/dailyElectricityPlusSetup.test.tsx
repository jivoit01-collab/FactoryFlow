/**
 * Who pays for a meter: its dated versions, and the form that corrects one or
 * adds the next. A change starts from a date and leaves earlier days alone; a
 * correction rewrites the version, and every day it covers is split again.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MeterTreeTab } from '../components/electricity/MeterTreeTab';
import { GROUND, LAB, METERS } from './electricityTreeFixtures';

const calls = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  versions: [] as unknown[],
}));

vi.mock('../api', () => ({
  useMeterSetups: (meterId: number | null) => ({
    data: meterId == null ? [] : calls.versions,
    isLoading: false,
  }),
  useElectricityConsumers: () => ({ data: [] }),
  useElectricityRunSources: () => ({
    data: [
      { kind: 'LINE', id: 8, name: 'Sidel', company: 'JIVO_BEVERAGES', company_name: 'Jivo Beverages', is_active: true },
      { kind: 'BLOWING_MACHINE', id: 2, name: 'Synergy 1/4', company: 'JIVO_OIL', company_name: 'Jivo Oil', is_active: true },
    ],
  }),
  useCreateMeterSetup: () => ({ mutateAsync: calls.create, isPending: false }),
  useUpdateMeterSetup: () => ({ mutateAsync: calls.update, isPending: false }),
  useDeleteMeterSetup: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateTreeMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTreeMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function renderTree(canManageAllocation = true) {
  render(
    <MemoryRouter>
      <MeterTreeTab
        meters={METERS}
        isLoading={false}
        canManageMeters
        canManageAllocation={canManageAllocation}
        keeps={() => true}
      />
    </MemoryRouter>,
  );
}

function openWhoPays(index: number) {
  fireEvent.click(screen.getAllByRole('button', { name: /who pays/i })[index]);
  return screen.getByRole('dialog');
}

describe('Meter tree — who pays', () => {
  beforeEach(() => {
    calls.create.mockReset().mockResolvedValue({});
    calls.update.mockReset().mockResolvedValue({});
    calls.versions = [LAB.tree?.setup];
  });

  it('draws the tree with each meter under its parent and the rule beside it', () => {
    renderTree();
    expect(screen.getByText('Lab')).toBeInTheDocument();
    expect(screen.getByText('The rest: Jivo Beverages 100%')).toBeInTheDocument();
    expect(screen.getByText('Jivo Oil 50% · Jivo Beverages 50%')).toBeInTheDocument();
  });

  it('warns that the incomer’s own units are nobody’s yet', () => {
    renderTree();
    expect(screen.getByText(/Part of the electricity is nobody's yet/)).toBeInTheDocument();
    expect(screen.getByText(/own units of KWH/)).toBeInTheDocument();
  });

  it('shows the versions and opens on a change from today', () => {
    renderTree();
    const dialog = openWhoPays(2);
    expect(within(dialog).getByText('From 1 Sept 2026', { exact: false })).toBeInTheDocument();
    expect(within(dialog).getByText(/A change from a date/)).toBeInTheDocument();
  });

  it('refuses shares that do not add up to 100', () => {
    renderTree();
    const dialog = openWhoPays(2);
    const percents = within(dialog).getAllByLabelText('Percent');
    fireEvent.change(percents[0], { target: { value: '60' } });
    expect(within(dialog).getByText(/Shares must add up to 100% — these add up to 110%/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /save the change/i })).toBeDisabled();
  });

  it('saves a change from a date with the shares as the API takes them', () => {
    renderTree();
    const dialog = openWhoPays(2);
    fireEvent.click(within(dialog).getByRole('button', { name: 'All Oil' }));
    fireEvent.change(within(dialog).getByLabelText('From'), { target: { value: '2026-10-01' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /save the change/i }));
    expect(calls.create).toHaveBeenCalledWith({
      meter: LAB.id,
      effective_from: '2026-10-01',
      in_service: true,
      parent: GROUND.id,
      basis: 'FIXED',
      shares: [{ company: 'JIVO_OIL', percent: '100' }],
      drivers: [],
      note: '',
    });
  });

  it('corrects a version in place', () => {
    renderTree();
    const dialog = openWhoPays(2);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Correct' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Half each' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /save the correction/i }));
    expect(calls.update).toHaveBeenCalledWith({
      setupId: LAB.tree?.setup?.id,
      payload: expect.objectContaining({
        effective_from: '2026-09-01',
        shares: [
          { company: 'JIVO_OIL', percent: '50' },
          { company: 'JIVO_BEVERAGES', percent: '50' },
        ],
      }),
    });
  });

  it('splits by run hours only once a line or machine is picked', () => {
    renderTree();
    const dialog = openWhoPays(2);
    fireEvent.change(within(dialog).getByLabelText('Who pays for its own units'), { target: { value: 'RUN_HOURS' } });
    expect(within(dialog).getByText(/Pick the lines or machines/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /add a line or machine/i }));
    fireEvent.change(within(dialog).getByLabelText('Line or machine'), { target: { value: 'BLOWING_MACHINE:2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /save the change/i }));
    expect(calls.create).toHaveBeenCalledWith(
      expect.objectContaining({ basis: 'RUN_HOURS', drivers: [{ blowing_machine: 2, weight: '1' }] }),
    );
  });

  it('never offers a meter, or anything under it, as its own parent', () => {
    calls.versions = [GROUND.tree?.setup];
    renderTree();
    const dialog = openWhoPays(1);
    const options = within(within(dialog).getByLabelText('Sub-meter of'))
      .getAllByRole('option')
      .map((option) => option.textContent ?? '');
    expect(options.some((text) => text.includes('KWH'))).toBe(true);
    expect(options.some((text) => text.includes('Production Floor Beverage'))).toBe(false);
    expect(options.some((text) => text.includes('Lab'))).toBe(false);
  });

  it('shows the versions read-only without the allocation right', () => {
    renderTree(false);
    const dialog = openWhoPays(2);
    expect(within(dialog).queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Correct' })).not.toBeInTheDocument();
  });
});
