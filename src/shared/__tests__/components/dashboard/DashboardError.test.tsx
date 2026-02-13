import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardError } from '../../../components/dashboard/DashboardError';

// Mock UI components
vi.mock('@/shared/components/ui', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

// Mock cn utility
vi.mock('@/shared/utils', () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ShieldX: (props: any) => <span data-testid="shield-icon" {...props} />,
  AlertCircle: (props: any) => <span data-testid="alert-icon" {...props} />,
  RefreshCw: (props: any) => <span data-testid="refresh-icon" {...props} />,
}));

describe('DashboardError', () => {
  // ─── General Error (default) ────────────────────────────────────

  describe('General Error', () => {
    it('renders general error by default', () => {
      render(<DashboardError />);
      expect(screen.getByText('Failed to Load')).toBeInTheDocument();
    });

    it('shows default general error message', () => {
      render(<DashboardError />);
      expect(
        screen.getByText('An error occurred while loading the dashboard.'),
      ).toBeInTheDocument();
    });

    it('shows custom message', () => {
      render(<DashboardError message="Custom error message" />);
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('renders alert icon for general errors', () => {
      render(<DashboardError />);
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });

    it('does not render shield icon for general errors', () => {
      render(<DashboardError />);
      expect(screen.queryByTestId('shield-icon')).not.toBeInTheDocument();
    });
  });

  // ─── Permission Error ──────────────────────────────────────────

  describe('Permission Error', () => {
    it('renders permission error when isPermissionError is true', () => {
      render(<DashboardError isPermissionError />);
      expect(screen.getByText('Permission Denied')).toBeInTheDocument();
    });

    it('shows default permission error message', () => {
      render(<DashboardError isPermissionError />);
      expect(screen.getByText('You do not have permission to view this data.')).toBeInTheDocument();
    });

    it('shows custom message for permission error', () => {
      render(<DashboardError isPermissionError message="Access restricted" />);
      expect(screen.getByText('Access restricted')).toBeInTheDocument();
    });

    it('renders shield icon for permission errors', () => {
      render(<DashboardError isPermissionError />);
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
    });

    it('does not render alert icon for permission errors', () => {
      render(<DashboardError isPermissionError />);
      expect(screen.queryByTestId('alert-icon')).not.toBeInTheDocument();
    });
  });

  // ─── Retry Button ──────────────────────────────────────────────

  describe('Retry Button', () => {
    it('renders retry button when onRetry is provided', () => {
      const handleRetry = vi.fn();
      render(<DashboardError onRetry={handleRetry} />);
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const handleRetry = vi.fn();
      render(<DashboardError onRetry={handleRetry} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(<DashboardError />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders retry button for permission errors too', () => {
      const handleRetry = vi.fn();
      render(<DashboardError isPermissionError onRetry={handleRetry} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  // ─── Custom className ──────────────────────────────────────────

  it('applies custom className', () => {
    const { container } = render(<DashboardError className="my-custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('my-custom-class');
  });
});
