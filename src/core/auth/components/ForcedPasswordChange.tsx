/**
 * Shown instead of every page while the signed-in user still holds a
 * temporary password (`must_change_password`).
 *
 * JI sends no email, so an administrator issues a temporary password
 * (`manage.py issue_temporary_passwords`, or the Django admin action) and hands
 * it over — every SAP Portal user imported into JI starts this way. Changing it
 * here clears the flag on the server, and the app carries on as normal.
 */
import { KeyRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import type { ApiError } from '@/core/api/types';
import { useAppDispatch, useAppSelector } from '@/core/store';
import { Button, Input, Label } from '@/shared/components/ui';

import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth.service';
import { updateUser } from '../store/authSlice';

const MIN_LENGTH = 8;

export function ForcedPasswordChange() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const problem =
    next.length > 0 && next.length < MIN_LENGTH
      ? `Use at least ${MIN_LENGTH} characters.`
      : next && next === current
        ? 'Choose a password different from the temporary one.'
        : again && next !== again
          ? 'The two new passwords do not match.'
          : '';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem || !current || !next || next !== again || !user) return;
    setSaving(true);
    setError('');
    try {
      await authService.changePassword(current, next);
      dispatch(updateUser({ ...user, must_change_password: false }));
    } catch (err) {
      const apiError = err as Partial<ApiError> & { message?: string };
      setError(apiError?.message || 'The password could not be changed. Check the temporary password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm"
        aria-label="Choose your password"
      >
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound className="h-5 w-5" />
            Choose your own password
          </h1>
          <p className="text-sm text-muted-foreground">
            You signed in with a temporary password. Choose your own before you carry on — the
            temporary one stops working once you do.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="forced-current">Temporary password</Label>
          <Input
            id="forced-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="forced-new">New password</Label>
          <Input
            id="forced-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="forced-again">New password again</Label>
          <Input
            id="forced-again"
            type="password"
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
          />
        </div>

        {(problem || error) && <p className="text-sm text-destructive">{problem || error}</p>}

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => logout()} disabled={saving}>
            Log out
          </Button>
          <Button type="submit" disabled={saving || !!problem || !current || !next || next !== again}>
            {saving ? 'Saving…' : 'Save and continue'}
          </Button>
        </div>
      </form>
    </div>
  );
}
