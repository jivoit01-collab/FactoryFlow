import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialogHost } from '../../components/ConfirmDialog';
import { promptSapPost } from '../../components/SapPostConfirm';

// The Radix dialog and the field it holds are the point of the test, so only
// the pieces with no bearing on it are stubbed.
vi.mock('@/shared/utils', () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(' '),
}));

function openRejectPrompt() {
  const answer = promptSapPost({
    title: 'Reject this request?',
    details: [{ label: 'Closes', value: 'Inventory Transfer Request 926656542' }],
    placeholder: 'Why are you rejecting this?',
    confirmLabel: 'Reject and close it',
  });
  render(<ConfirmDialogHost />);
  return answer;
}

describe('promptSapPost', () => {
  it('asks for the reason inside the dialog, not on the page behind it', async () => {
    const answer = openRejectPrompt();

    expect(await screen.findByText('Reject this request?')).toBeInTheDocument();
    expect(screen.getByText('Inventory Transfer Request 926656542')).toBeInTheDocument();

    const field = screen.getByPlaceholderText('Why are you rejecting this?');
    expect(field.tagName).toBe('TEXTAREA');

    fireEvent.change(field, { target: { value: '  wrong warehouse  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reject and close it' }));

    await expect(answer).resolves.toBe('wrong warehouse');
  });

  it('will not let a blank reason through', async () => {
    // The dialog queue is module state, so every test has to settle its own
    // request or the next one waits behind it.
    const answer = openRejectPrompt();

    await screen.findByText('Reject this request?');
    expect(screen.getByRole('button', { name: 'Reject and close it' })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Why are you rejecting this?'), {
      target: { value: '   ' },
    });
    expect(screen.getByRole('button', { name: 'Reject and close it' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await answer;
  });

  it('resolves null when the operator backs out', async () => {
    const answer = openRejectPrompt();

    await screen.findByText('Reject this request?');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await expect(answer).resolves.toBeNull();
  });
});
