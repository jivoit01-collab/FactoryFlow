import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardLoading } from '../../../components/dashboard/DashboardLoading';

// Mock cn utility
vi.mock('@/shared/utils', () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}));

describe('DashboardLoading', () => {
  // ─── Basic Rendering ───────────────────────────────────────────

  it('renders without crashing', () => {
    const { container } = render(<DashboardLoading />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a loading spinner element', () => {
    const { container } = render(<DashboardLoading />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('spinner has correct default styling', () => {
    const { container } = render(<DashboardLoading />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
    expect(spinner!.className).toContain('h-8');
    expect(spinner!.className).toContain('w-8');
    expect(spinner!.className).toContain('rounded-full');
    expect(spinner!.className).toContain('border-4');
    expect(spinner!.className).toContain('border-primary');
    expect(spinner!.className).toContain('border-t-transparent');
  });

  // ─── Default Height ────────────────────────────────────────────

  it('has default height of h-48', () => {
    const { container } = render(<DashboardLoading />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('h-48');
  });

  // ─── Custom Height ────────────────────────────────────────────

  it('accepts custom height prop', () => {
    const { container } = render(<DashboardLoading height="h-96" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('h-96');
  });

  it('custom height replaces default in className', () => {
    const { container } = render(<DashboardLoading height="h-32" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('h-32');
  });

  // ─── Custom className ─────────────────────────────────────────

  it('applies custom className', () => {
    const { container } = render(<DashboardLoading className="mt-4 bg-gray-50" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('mt-4');
    expect(wrapper.className).toContain('bg-gray-50');
  });

  // ─── Layout ────────────────────────────────────────────────────

  it('container uses flexbox centering', () => {
    const { container } = render(<DashboardLoading />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('items-center');
    expect(wrapper.className).toContain('justify-center');
  });

  // ─── Accessibility ─────────────────────────────────────────────

  it('has role="status" on the container', () => {
    const { container } = render(<DashboardLoading />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute('role')).toBe('status');
  });

  it('has aria-label="Loading"', () => {
    const { container } = render(<DashboardLoading />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute('aria-label')).toBe('Loading');
  });

  it('renders sr-only loading text for screen readers', () => {
    const { container } = render(<DashboardLoading />);
    const srOnly = container.querySelector('.sr-only');
    expect(srOnly).toBeInTheDocument();
    expect(srOnly!.textContent).toBe('Loading...');
  });

  // ─── Isolation ─────────────────────────────────────────────────

  it('renders only the spinner and sr-only text', () => {
    const { container } = render(<DashboardLoading />);
    expect(container.textContent).toBe('Loading...');
  });

  it('does not render any interactive elements', () => {
    const { container } = render(<DashboardLoading />);
    const buttons = container.querySelectorAll('button');
    const links = container.querySelectorAll('a');
    expect(buttons.length).toBe(0);
    expect(links.length).toBe(0);
  });

  // ─── Edge Cases ────────────────────────────────────────────────

  it('renders correctly with empty string height', () => {
    const { container } = render(<DashboardLoading height="" />);
    const wrapper = container.firstChild as HTMLElement;
    // Should still render with flexbox centering
    expect(wrapper.className).toContain('flex');
  });

  it('renders correctly with both className and custom height', () => {
    const { container } = render(<DashboardLoading height="h-64" className="my-custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('h-64');
    expect(wrapper.className).toContain('my-custom-class');
  });
});
