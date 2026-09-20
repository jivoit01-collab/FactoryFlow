import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real hook reaches the store, which pulls in the API client and its env
// config. Only the signed-in user matters here, so serve that directly.
let mockFullName: string | undefined = 'Rajesh Kumar';
vi.mock('@/core/store', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ auth: { user: mockFullName ? { full_name: mockFullName } : undefined } }),
}));

import { HeaderGreeting } from '../../components/HeaderGreeting';

/** 19 Sep 2026 is a Saturday. */
const at = (hour: number, minute = 0) => new Date(2026, 8, 19, hour, minute, 0);

describe('HeaderGreeting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFullName = 'Rajesh Kumar';
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Greeting by time of day ──────────────────────────────────

  it.each([
    [0, 'Good morning, Rajesh'],
    [9, 'Good morning, Rajesh'],
    [12, 'Good afternoon, Rajesh'],
    [16, 'Good afternoon, Rajesh'],
    [17, 'Good evening, Rajesh'],
    [23, 'Good evening, Rajesh'],
  ])('at %i:00 greets "%s"', (hour, expected) => {
    vi.setSystemTime(at(hour));
    render(<HeaderGreeting />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  // Boundary hours are where an off-by-one hides.
  it('turns over from morning to afternoon exactly at 12:00', () => {
    vi.setSystemTime(at(11, 59));
    const { unmount } = render(<HeaderGreeting />);
    expect(screen.getByText(/Good morning/)).toBeInTheDocument();
    unmount();

    vi.setSystemTime(at(12, 0));
    render(<HeaderGreeting />);
    expect(screen.getByText(/Good afternoon/)).toBeInTheDocument();
  });

  // ─── Greeting only ────────────────────────────────────────────

  it('shows the greeting alone — no date, no shift', () => {
    vi.setSystemTime(at(9));
    const { container } = render(<HeaderGreeting />);
    expect(container.textContent).toBe('Good morning, Rajesh');
    expect(screen.queryByText(/shift/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/September/)).not.toBeInTheDocument();
  });

  // ─── Name handling ────────────────────────────────────────────

  it('uses only the first name', () => {
    vi.setSystemTime(at(9));
    render(<HeaderGreeting />);
    expect(screen.queryByText(/Kumar/)).not.toBeInTheDocument();
  });

  it('greets without a name when the user has none', () => {
    mockFullName = undefined;
    vi.setSystemTime(at(9));
    render(<HeaderGreeting />);
    expect(screen.getByText('Good morning')).toBeInTheDocument();
  });
});
