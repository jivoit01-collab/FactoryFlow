import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NonMovingFilters as NonMovingFiltersType } from '../../types';
import { NonMovingFilters } from '../NonMovingFilters';

const OIL_WAREHOUSES = ['BH-BS', 'BH-FG', 'BH-NM', 'BH-PC', 'BH-PM', 'GP-NM'];

const baseFilters: NonMovingFiltersType = {
  age: 0,
  item_group: 105,
  status: ['slow-moving', 'non-moving'],
};

function renderFilters(warehousePreset: string[], warehouses = OIL_WAREHOUSES) {
  const onFiltersChange = vi.fn();
  const view = render(
    <NonMovingFilters
      onFiltersChange={onFiltersChange}
      defaultValues={baseFilters}
      itemGroups={[{ item_group_code: 105, item_group_name: 'PACKAGING MATERIAL' }]}
      warehouses={warehouses}
      warehousePreset={warehousePreset}
    />,
  );
  return { onFiltersChange, view };
}

/** The warehouse values of every call the filter bar made. */
function warehouseCalls(spy: ReturnType<typeof vi.fn>): (string[] | undefined)[] {
  return spy.mock.calls.map(([filters]) => (filters as NonMovingFiltersType).warehouse);
}

describe('NonMovingFilters warehouse preset', () => {
  it('opens on the four default stores once the report says they exist', async () => {
    const { onFiltersChange } = renderFilters(['BH-BS', 'BH-NM', 'BH-PM', 'GP-NM']);

    await waitFor(() => expect(onFiltersChange).toHaveBeenCalled());
    expect(warehouseCalls(onFiltersChange).at(-1)).toEqual(['BH-BS', 'BH-NM', 'BH-PM', 'GP-NM']);
    // The chips have to say what is actually being filtered on.
    expect(screen.getByText('4 selected')).toBeTruthy();
  });

  it('leaves a company holding none of them on every warehouse', async () => {
    const { onFiltersChange } = renderFilters([], ['WH-01', 'WH-02']);

    // Nothing to apply, so nothing is filtered out — not an empty table.
    await waitFor(() => expect(screen.getAllByText('All').length).toBeGreaterThan(0));
    expect(warehouseCalls(onFiltersChange).every((value) => value === undefined)).toBe(true);
  });

  it('applies the preset once, not on every later render', async () => {
    const preset = ['BH-BS', 'BH-NM', 'BH-PM', 'GP-NM'];
    const { onFiltersChange, view } = renderFilters(preset);

    await waitFor(() => expect(onFiltersChange).toHaveBeenCalled());
    const callsAfterPreset = onFiltersChange.mock.calls.length;

    // Same preset identity re-rendered: the selection must not be re-applied,
    // or a user who cleared it would have it grow back under them.
    view.rerender(
      <NonMovingFilters
        onFiltersChange={onFiltersChange}
        defaultValues={baseFilters}
        itemGroups={[{ item_group_code: 105, item_group_name: 'PACKAGING MATERIAL' }]}
        warehouses={OIL_WAREHOUSES}
        warehousePreset={preset}
      />,
    );

    expect(onFiltersChange.mock.calls.length).toBe(callsAfterPreset);
  });
});
