import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// The tour fires once, unprompted, in front of someone who opened the app to
// do something else. What has to hold: it shows when it has never been seen,
// it never shows again afterwards, and it only points at buttons that are
// actually on the screen.
// ═══════════════════════════════════════════════════════════════

const auth = { user: { id: 7 } as { id: number } | null, permissionsLoaded: true };

vi.mock('@/core/auth', () => ({
  useAuth: () => auth,
}));

import { HeaderHelpTour } from '@/app/layouts/components/HeaderHelpTour';
import { HEADER_TOUR_SEEN_KEY } from '@/app/layouts/components/headerTour';

/** Stand in for the header buttons the tour looks for. */
function placeTargets(...names: string[]) {
  for (const name of names) {
    const button = document.createElement('button');
    button.setAttribute('data-tour', name);
    document.body.appendChild(button);
  }
}

describe('HeaderHelpTour', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    auth.user = { id: 7 };
    auth.permissionsLoaded = true;
  });

  it('walks through both header buttons and remembers it was seen', async () => {
    placeTargets('support', 'report-issue');
    render(<HeaderHelpTour />);

    expect(await screen.findByText('Customer support')).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Report an issue')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(screen.queryByText('Report an issue')).not.toBeInTheDocument());
    expect(localStorage.getItem(`${HEADER_TOUR_SEEN_KEY}:7`)).toBe('true');
  });

  it('does not come back once it has been seen', async () => {
    localStorage.setItem(`${HEADER_TOUR_SEEN_KEY}:7`, 'true');
    placeTargets('support', 'report-issue');
    render(<HeaderHelpTour />);

    await waitFor(() => expect(screen.queryByText('Customer support')).not.toBeInTheDocument());
  });

  it('counts skipping as seen, so it does not nag', async () => {
    placeTargets('support', 'report-issue');
    render(<HeaderHelpTour />);

    fireEvent.click(await screen.findByRole('button', { name: 'Skip' }));
    expect(localStorage.getItem(`${HEADER_TOUR_SEEN_KEY}:7`)).toBe('true');
  });

  it('skips a button the user cannot see', async () => {
    // No issue-create permission means no bug button in the header, and a
    // spotlight on a button that is not there would be pointing at nothing.
    placeTargets('support');
    render(<HeaderHelpTour />);

    expect(await screen.findByText('Customer support')).toBeInTheDocument();
    expect(screen.getByText('1 of 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('is remembered per user, so a shared terminal does not swallow it', async () => {
    localStorage.setItem(`${HEADER_TOUR_SEEN_KEY}:7`, 'true');
    auth.user = { id: 9 };
    placeTargets('support', 'report-issue');
    render(<HeaderHelpTour />);

    expect(await screen.findByText('Customer support')).toBeInTheDocument();
  });

  it('waits for permissions before deciding which buttons exist', async () => {
    auth.permissionsLoaded = false;
    placeTargets('support', 'report-issue');
    render(<HeaderHelpTour />);

    await waitFor(() => expect(screen.queryByText('Customer support')).not.toBeInTheDocument());
  });
});
