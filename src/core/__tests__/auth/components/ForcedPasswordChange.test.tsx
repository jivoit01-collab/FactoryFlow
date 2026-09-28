/**
 * The screen a user with a temporary password sees instead of every page. The
 * store, the auth service and the logout hook are mocked.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dispatch = vi.fn();
const USER = { id: 7, email: 'imported@jivo.in', must_change_password: true };
vi.mock('@/core/store', () => ({
  useAppDispatch: () => dispatch,
  useAppSelector: (select: (state: unknown) => unknown) => select({ auth: { user: USER } }),
}));
const changePassword = vi.fn();
vi.mock('@/core/auth/services/auth.service', () => ({
  authService: { changePassword: (...args: unknown[]) => changePassword(...args) },
}));
const logout = vi.fn();
vi.mock('@/core/auth/hooks/useAuth', () => ({ useAuth: () => ({ logout }) }));

import { ForcedPasswordChange } from '@/core/auth/components/ForcedPasswordChange';

function fill(current: string, next: string, again = next) {
  fireEvent.change(screen.getByLabelText('Temporary password'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('New password again'), { target: { value: again } });
}

describe('ForcedPasswordChange', () => {
  beforeEach(() => {
    dispatch.mockReset();
    changePassword.mockReset().mockResolvedValue({ message: 'Password changed successfully' });
  });

  it('changes the password and lets the user carry on', async () => {
    render(<ForcedPasswordChange />);
    fill('Tmp8kQ2mZpXa', 'my-own-password');
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('Tmp8kQ2mZpXa', 'my-own-password'));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(dispatch.mock.calls[0][0].payload.must_change_password).toBe(false);
  });

  it('refuses a short, repeated or mismatched new password', () => {
    render(<ForcedPasswordChange />);
    const save = screen.getByRole('button', { name: 'Save and continue' });
    fill('Tmp8kQ2mZpXa', 'short');
    expect(save).toBeDisabled();
    fill('Tmp8kQ2mZpXa', 'Tmp8kQ2mZpXa');
    expect(screen.getByText(/different from the temporary one/)).toBeInTheDocument();
    fill('Tmp8kQ2mZpXa', 'my-own-password', 'my-own-passw0rd');
    expect(screen.getByText(/do not match/)).toBeInTheDocument();
    expect(save).toBeDisabled();
  });

  it('keeps the screen when the temporary password is wrong', async () => {
    changePassword.mockRejectedValueOnce({ message: 'Old password is incorrect', status: 400 });
    render(<ForcedPasswordChange />);
    fill('wrong-temp-pw', 'my-own-password');
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByText('Old password is incorrect')).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('offers a way out', () => {
    render(<ForcedPasswordChange />);
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalled();
  });
});
