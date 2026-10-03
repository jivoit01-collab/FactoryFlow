import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POPrintSettingsButton } from '../POPrintSettingsButton';

const mutate = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ canManage: true }));
const settings = vi.hoisted(() => ({
  data: {
    approver_source: 'SAP' as 'SAP' | 'MANUAL',
    approver_name: '',
    updated_by_name: '',
    updated_at: null as string | null,
  },
}));

vi.mock('../../api', () => ({
  usePOPrintSettings: () => ({ data: settings.data, isLoading: false, error: null }),
  useUpdatePOPrintSettings: () => ({ mutate, isPending: false, error: null }),
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => perms.canManage }),
}));

vi.mock('@/core/store', () => ({
  useAppSelector: () => 'Jivo Oil',
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('POPrintSettingsButton', () => {
  beforeEach(() => {
    mutate.mockReset();
    perms.canManage = true;
    settings.data = {
      approver_source: 'SAP',
      approver_name: '',
      updated_by_name: '',
      updated_at: null,
    };
  });

  it('is not there for someone who cannot change the settings', () => {
    perms.canManage = false;
    render(<POPrintSettingsButton />);
    expect(screen.queryByRole('button', { name: /PO print settings/ })).toBeNull();
  });

  it('saves a typed approver', () => {
    render(<POPrintSettingsButton />);
    fireEvent.click(screen.getByRole('button', { name: /PO print settings/ }));

    expect(screen.getByLabelText(/From SAP/)).toBeChecked();
    fireEvent.click(screen.getByLabelText(/Enter a name/));
    fireEvent.change(screen.getByLabelText(/Approver/), {
      target: { value: '  Vishal/Gagandeep Singh ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mutate).toHaveBeenCalledWith(
      { approver_source: 'MANUAL', approver_name: 'Vishal/Gagandeep Singh' },
      expect.anything(),
    );
  });

  it('will not save a typed source with no name', () => {
    render(<POPrintSettingsButton />);
    fireEvent.click(screen.getByRole('button', { name: /PO print settings/ }));

    fireEvent.click(screen.getByLabelText(/Enter a name/));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter the approver's name/)).toBeInTheDocument();
  });

  it('opens on what is saved, and switching back to SAP keeps the name', () => {
    settings.data = {
      approver_source: 'MANUAL',
      approver_name: 'Vishal/Gagandeep Singh',
      updated_by_name: 'Jashan',
      updated_at: '2026-10-03T10:00:00Z',
    };
    render(<POPrintSettingsButton />);
    fireEvent.click(screen.getByRole('button', { name: /PO print settings/ }));

    expect(screen.getByLabelText(/Approver/)).toHaveValue('Vishal/Gagandeep Singh');
    expect(screen.getByText(/Last changed by Jashan/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/From SAP/));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mutate).toHaveBeenCalledWith(
      { approver_source: 'SAP', approver_name: 'Vishal/Gagandeep Singh' },
      expect.anything(),
    );
  });
});
