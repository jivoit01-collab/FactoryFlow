import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════
// Mock heavy dependencies
// ═══════════════════════════════════════════════════════════════

vi.mock('@/config/constants', () => ({
  VALIDATION_MESSAGES: {
    required: (f: string) => `${f} is required`,
    maxLength: (f: string, n: number) => `${f} max ${n}`,
  },
}));

const mockUpdateFullName = vi.fn();

vi.mock('@/core/auth', () => ({
  useAuth: () => ({ updateFullName: mockUpdateFullName }),
}));

const mockToastSuccess = vi.fn();

vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => mockToastSuccess(...args) },
}));

// Mock Dialog components to render children directly
vi.mock('@/shared/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/shared/components/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Input: (props: any) => <input {...props} />,
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

import { EditNameDialog } from '../../components/EditNameDialog';

describe('EditNameDialog', () => {
  const onOpenChange = vi.fn();

  const renderDialog = (props: Partial<Parameters<typeof EditNameDialog>[0]> = {}) =>
    render(
      <EditNameDialog open onOpenChange={onOpenChange} currentName="Imported Person" {...props} />,
    );

  const typeName = (value: string) =>
    fireEvent.change(screen.getByLabelText('Name'), { target: { value } });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // Open / Close
  // ═══════════════════════════════════════════════════════════════

  it('renders nothing when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('heading', { name: 'Edit Name' })).not.toBeInTheDocument();
  });

  it('starts from the current name', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: 'Edit Name' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Imported Person');
  });

  it('closes on Cancel without saving', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockUpdateFullName).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════
  // Saving
  // ═══════════════════════════════════════════════════════════════

  it('saves the trimmed name, confirms it and closes', async () => {
    mockUpdateFullName.mockResolvedValue(undefined);
    renderDialog();
    typeName('  Asha Kaur  ');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateFullName).toHaveBeenCalledWith('Asha Kaur'));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mockToastSuccess).toHaveBeenCalledWith('Name updated');
  });

  it('closes without a request when the name is unchanged', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mockUpdateFullName).not.toHaveBeenCalled();
  });

  it('refuses a blank name', async () => {
    renderDialog();
    typeName('   ');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(mockUpdateFullName).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('shows the server error and stays open', async () => {
    mockUpdateFullName.mockRejectedValue({
      message: 'Ensure this field has no more than 150 characters.',
      status: 400,
    });
    renderDialog();
    typeName('Asha Kaur');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Ensure this field has no more than 150 characters.'),
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
