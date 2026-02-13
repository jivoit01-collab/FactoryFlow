import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageLoadError } from '../../components/PageLoadError';

describe('PageLoadError', () => {
  // ─── Basic Rendering ───────────────────────────────────────────

  it('renders without crashing', () => {
    const { container } = render(<PageLoadError />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders the error heading', () => {
    render(<PageLoadError />);
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<PageLoadError />);
    expect(
      screen.getByText('Please check your internet connection or try reloading the page.'),
    ).toBeInTheDocument();
  });

  it('renders the Reload Page button', () => {
    render(<PageLoadError />);
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  // ─── Reload Button ─────────────────────────────────────────────

  it('calls window.location.reload when reload button is clicked', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(<PageLoadError />);
    fireEvent.click(screen.getByText('Reload Page'));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  // ─── Structure ─────────────────────────────────────────────────

  it('renders an SVG icon', () => {
    const { container } = render(<PageLoadError />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('heading is an h2 element', () => {
    render(<PageLoadError />);
    const heading = screen.getByText('An error occurred');
    expect(heading.tagName).toBe('H2');
  });

  it('reload button is a button element', () => {
    render(<PageLoadError />);
    const button = screen.getByText('Reload Page');
    expect(button.tagName).toBe('BUTTON');
  });
});
