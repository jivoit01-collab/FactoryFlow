import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════

vi.mock('@/config/constants', () => ({
  APP_NAME: 'TestApp',
}));

vi.mock('../../components/DashboardStats', () => ({
  DashboardStats: () => <div data-testid="dashboard-stats">DashboardStats</div>,
}));

import DashboardPage from '../../pages/DashboardPage';

// ═══════════════════════════════════════════════════════════════
// DashboardPage
// ═══════════════════════════════════════════════════════════════

describe('DashboardPage', () => {
  // ─── Basic Rendering ──────────────────────────────────────────

  it('renders without crashing', () => {
    const { container } = render(<DashboardPage />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders "Dashboard" heading as an h2', () => {
    render(<DashboardPage />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Dashboard');
  });

  it('heading has correct CSS classes', () => {
    render(<DashboardPage />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.className).toContain('text-3xl');
    expect(heading.className).toContain('font-bold');
    expect(heading.className).toContain('tracking-tight');
  });

  it('does not render a subtitle', () => {
    const { container } = render(<DashboardPage />);
    expect(container.querySelector('p')).toBeNull();
  });

  // ─── DashboardStats Child ─────────────────────────────────────

  it('renders DashboardStats component', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();
  });

  // ─── Layout Structure ─────────────────────────────────────────

  it('container has space-y-6 class for vertical spacing', () => {
    const { container } = render(<DashboardPage />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('space-y-6');
  });

  it('renders heading inside a wrapper div', () => {
    const { container } = render(<DashboardPage />);
    const wrapper = container.firstChild as HTMLElement;
    const headerDiv = wrapper.firstChild as HTMLElement;
    expect(headerDiv.tagName).toBe('DIV');
    expect(headerDiv.querySelector('h2')).toBeTruthy();
  });
});
