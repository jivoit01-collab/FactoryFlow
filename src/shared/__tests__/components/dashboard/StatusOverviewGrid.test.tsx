import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  StatusOverviewGrid,
  type StatusItemConfig,
} from '../../../components/dashboard/StatusOverviewGrid';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock UI components
vi.mock('@/shared/components/ui', () => ({
  Card: ({ children, onClick, className, ...props }: any) => (
    <div onClick={onClick} className={className} data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// Mock cn utility
vi.mock('@/shared/utils', () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronRight: (props: any) => <span data-testid="chevron-right" {...props} />,
  // Provide a mock LucideIcon type-compatible component
}));

// Helper to create a mock icon component
const MockIcon = (props: any) => <span data-testid="status-icon" {...props} />;

function createStatusConfig(): Record<string, StatusItemConfig> {
  return {
    pending: {
      label: 'Pending',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200',
      icon: MockIcon as any,
      link: '/items?status=pending',
    },
    approved: {
      label: 'Approved',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      icon: MockIcon as any,
      link: '/items?status=approved',
    },
    rejected: {
      label: 'Rejected',
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      icon: MockIcon as any,
      link: '/items?status=rejected',
    },
  };
}

describe('StatusOverviewGrid', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ─── Basic Rendering ───────────────────────────────────────────

  it('renders all status items in the correct order', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending', 'approved', 'rejected'] as const;
    const counts = { pending: 5, approved: 10, rejected: 2 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('renders correct count values', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending', 'approved', 'rejected'] as const;
    const counts = { pending: 5, approved: 10, rejected: 2 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  // ─── Navigation ────────────────────────────────────────────────

  it('navigates to correct link when a status card is clicked', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 5 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    fireEvent.click(screen.getByText('Pending').closest('[data-testid="card"]')!);
    expect(mockNavigate).toHaveBeenCalledWith('/items?status=pending');
  });

  it('navigates to different links for different status items', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending', 'approved'] as const;
    const counts = { pending: 3, approved: 7 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    fireEvent.click(screen.getByText('Approved').closest('[data-testid="card"]')!);
    expect(mockNavigate).toHaveBeenCalledWith('/items?status=approved');
  });

  // ─── Missing / Empty Data ──────────────────────────────────────

  it('defaults to 0 when count is not provided for a status', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = {}; // no count for pending

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('skips rendering for status IDs not in statusConfig', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending', 'nonexistent'] as const;
    const counts = { pending: 5, nonexistent: 99 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.queryByText('99')).not.toBeInTheDocument();
  });

  it('renders empty grid when statusOrder is empty', () => {
    const statusConfig = createStatusConfig();
    const statusOrder: readonly string[] = [];
    const counts = { pending: 5 };

    const { container } = render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    const cards = container.querySelectorAll('[data-testid="card"]');
    expect(cards.length).toBe(0);
  });

  it('renders empty grid when statusConfig is empty', () => {
    const statusConfig = {};
    const statusOrder = ['pending', 'approved'] as const;
    const counts = { pending: 5, approved: 10 };

    const { container } = render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    const cards = container.querySelectorAll('[data-testid="card"]');
    expect(cards.length).toBe(0);
  });

  // ─── Grid Layout ───────────────────────────────────────────────

  it('applies grid layout classes to the container', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 5 };

    const { container } = render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer.className).toContain('grid');
    expect(gridContainer.className).toContain('gap-4');
    expect(gridContainer.className).toContain('grid-cols-2');
  });

  // ─── Custom className ─────────────────────────────────────────

  it('applies custom className to the grid container', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 5 };

    const { container } = render(
      <StatusOverviewGrid
        statusConfig={statusConfig}
        statusOrder={statusOrder}
        counts={counts}
        className="custom-grid-class"
      />,
    );

    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer.className).toContain('custom-grid-class');
  });

  // ─── Large Counts ─────────────────────────────────────────────

  it('renders large count values correctly', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 999999 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    expect(screen.getByText('999999')).toBeInTheDocument();
  });

  // ─── Color Classes ─────────────────────────────────────────────

  it('applies color classes from config to the label', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 5 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    const label = screen.getByText('Pending');
    expect(label.className).toContain('text-yellow-600');
  });

  it('applies bgColor class from config to cards', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 5 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-yellow-50');
  });

  // ─── Keyboard Navigation ────────────────────────────────────────

  it('status cards have role="link"', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 5 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    const card = screen.getByTestId('card');
    expect(card.getAttribute('role')).toBe('link');
  });

  it('status cards have tabIndex={0} for keyboard focus', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 5 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    const card = screen.getByTestId('card');
    expect(card.getAttribute('tabindex')).toBe('0');
  });

  it('status cards have accessible aria-label', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 5 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    const card = screen.getByTestId('card');
    expect(card.getAttribute('aria-label')).toBe('Pending: 5');
  });

  it('navigates on Enter key press', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 5 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    const card = screen.getByTestId('card');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/items?status=pending');
  });

  it('navigates on Space key press', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 5 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    const card = screen.getByTestId('card');
    fireEvent.keyDown(card, { key: ' ' });
    expect(mockNavigate).toHaveBeenCalledWith('/items?status=pending');
  });

  it('does not navigate on other key presses', () => {
    const statusConfig = createStatusConfig();
    const statusOrder = ['pending'] as const;
    const counts = { pending: 5 };

    render(
      <StatusOverviewGrid statusConfig={statusConfig} statusOrder={statusOrder} counts={counts} />,
    );

    const card = screen.getByTestId('card');
    fireEvent.keyDown(card, { key: 'Tab' });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
