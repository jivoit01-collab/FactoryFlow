import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProductionSettingsPage from '../pages/ProductionSettingsPage';

const saveSettings = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const perms = vi.hoisted(() => ({ canEdit: true }));
const settings = vi.hoisted(() => ({
  data: {
    rm_warehouse: 'BH-PC',
    pm_warehouse: 'BH-PC',
    fg_warehouse: 'BH-PF',
    is_saved: false,
    updated_by_name: '',
    updated_at: null as string | null,
  },
}));

vi.mock('../api', () => ({
  useProductionSettings: () => ({ data: settings.data, isLoading: false, error: null }),
  useUpdateProductionSettings: () => ({ mutateAsync: saveSettings, isPending: false }),
}));

vi.mock('@/core/auth', () => ({
  usePermission: () => ({
    hasPermission: () => perms.canEdit,
    hasAnyPermission: () => true,
  }),
}));

vi.mock('@/modules/warehouse/grpo/api', () => ({
  useWarehouses: () => ({
    data: [
      { warehouse_code: 'BH-PC', warehouse_name: 'Production Consumption' },
      { warehouse_code: 'BH-PM', warehouse_name: 'Packing Material' },
      { warehouse_code: 'BH-PF', warehouse_name: 'Production Finished' },
    ],
    isLoading: false,
    isError: false,
  }),
}));

// The real picker is a popover; a plain <select> drives the same callbacks.
vi.mock('@/shared/components', () => ({
  SearchableSelect: (props: {
    label: string;
    value?: string;
    items: { warehouse_code: string }[];
    onItemSelect: (item: { warehouse_code: string }) => void;
    onClear: () => void;
  }) => (
    <select
      aria-label={props.label}
      value={props.value}
      onChange={(event) => {
        const item = props.items.find((w) => w.warehouse_code === event.target.value);
        if (item) props.onItemSelect(item);
        else props.onClear();
      }}
    >
      <option value="">—</option>
      {props.items.map((w) => (
        <option key={w.warehouse_code} value={w.warehouse_code}>
          {w.warehouse_code}
        </option>
      ))}
    </select>
  ),
}));

describe('Production settings', () => {
  it('opens on the saved warehouses and says they are the defaults', () => {
    perms.canEdit = true;
    render(<ProductionSettingsPage />);

    expect(screen.getByLabelText('RM warehouse')).toHaveValue('BH-PC');
    expect(screen.getByLabelText('PM warehouse')).toHaveValue('BH-PC');
    expect(screen.getByLabelText('FG warehouse')).toHaveValue('BH-PF');
    expect(screen.getByText(/nobody has changed them yet/)).toBeInTheDocument();
    // Nothing changed yet, so nothing to save.
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('saves all three warehouses once one is changed', async () => {
    perms.canEdit = true;
    saveSettings.mockClear();
    render(<ProductionSettingsPage />);

    fireEvent.change(screen.getByLabelText('PM warehouse'), { target: { value: 'BH-PM' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(saveSettings).toHaveBeenCalledWith({
        rm_warehouse: 'BH-PC',
        pm_warehouse: 'BH-PM',
        fg_warehouse: 'BH-PF',
      });
    });
  });

  it('will not save with a warehouse cleared', () => {
    perms.canEdit = true;
    render(<ProductionSettingsPage />);

    fireEvent.change(screen.getByLabelText('FG warehouse'), { target: { value: '' } });

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    expect(screen.getByText('Pick the FG warehouse.')).toBeInTheDocument();
  });

  it('is read-only without the manage permission', () => {
    perms.canEdit = false;
    render(<ProductionSettingsPage />);

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('RM warehouse')).not.toBeInTheDocument();
    expect(screen.getAllByText('BH-PC')).toHaveLength(2);
    expect(screen.getByText('BH-PF')).toBeInTheDocument();
    expect(screen.getByText(/Read-only/)).toBeInTheDocument();
  });
});
