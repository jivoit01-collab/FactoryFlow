import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { StepLoadingSpinner } from '../../components/StepLoadingSpinner';

describe('StepLoadingSpinner', () => {
  it('renders a spinner element', () => {
    const { container } = render(<StepLoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with animate-spin class', () => {
    const { container } = render(<StepLoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('animate-spin');
  });

  it('renders spinner inside a centered container', () => {
    const { container } = render(<StepLoadingSpinner />);
    const wrapper = container.querySelector('.flex.items-center.justify-center');
    expect(wrapper).toBeInTheDocument();
  });

  it('renders spinner with rounded-full class', () => {
    const { container } = render(<StepLoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('rounded-full');
  });

  it('renders spinner with border classes', () => {
    const { container } = render(<StepLoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('border-4');
    expect(spinner).toHaveClass('border-primary');
    expect(spinner).toHaveClass('border-t-transparent');
  });
});
