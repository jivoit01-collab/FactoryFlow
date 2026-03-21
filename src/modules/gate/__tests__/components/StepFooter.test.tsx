import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepFooter } from '../../components/StepFooter';

describe('StepFooter', () => {
  const defaultProps = {
    onCancel: vi.fn(),
    onNext: vi.fn(),
  };

  // ═══════════════════════════════════════════════════════════════
  // Default rendering
  // ═══════════════════════════════════════════════════════════════

  it('renders Cancel and Next buttons', () => {
    render(<StepFooter {...defaultProps} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save and next/i })).toBeInTheDocument();
  });

  it('does not render Previous button when showPrevious is false', () => {
    render(<StepFooter {...defaultProps} showPrevious={false} />);
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
  });

  it('renders Previous button when showPrevious is true and onPrevious provided', () => {
    render(<StepFooter {...defaultProps} showPrevious onPrevious={vi.fn()} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Button labels
  // ═══════════════════════════════════════════════════════════════

  it('shows custom nextLabel when provided', () => {
    render(<StepFooter {...defaultProps} nextLabel="Submit" />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('shows "Next →" in edit mode without update mode', () => {
    render(<StepFooter {...defaultProps} isEditMode />);
    expect(screen.getByRole('button', { name: /next →/i })).toBeInTheDocument();
  });

  it('shows saving label when isSaving is true', () => {
    render(<StepFooter {...defaultProps} isSaving />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Interactions
  // ═══════════════════════════════════════════════════════════════

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<StepFooter {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onNext when Next is clicked', () => {
    const onNext = vi.fn();
    render(<StepFooter {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: /save and next/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('calls onPrevious when Previous is clicked', () => {
    const onPrevious = vi.fn();
    render(<StepFooter {...defaultProps} showPrevious onPrevious={onPrevious} />);
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPrevious).toHaveBeenCalledOnce();
  });

  // ═══════════════════════════════════════════════════════════════
  // Disabled state
  // ═══════════════════════════════════════════════════════════════

  it('disables next button when isSaving', () => {
    render(<StepFooter {...defaultProps} isSaving />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('disables next button when isNextDisabled', () => {
    render(<StepFooter {...defaultProps} isNextDisabled />);
    expect(screen.getByRole('button', { name: /save and next/i })).toBeDisabled();
  });

  // ═══════════════════════════════════════════════════════════════
  // Update button
  // ═══════════════════════════════════════════════════════════════

  it('shows Update button when showUpdate and onUpdate are provided', () => {
    render(<StepFooter {...defaultProps} showUpdate onUpdate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });

  it('does not show Update button by default', () => {
    render(<StepFooter {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /^update$/i })).not.toBeInTheDocument();
  });

  it('calls onUpdate when Update is clicked', () => {
    const onUpdate = vi.fn();
    render(<StepFooter {...defaultProps} showUpdate onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: /update/i }));
    expect(onUpdate).toHaveBeenCalledOnce();
  });
});
