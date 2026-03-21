import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StepHeader } from '../../components/StepHeader';

describe('StepHeader', () => {
  it('renders the title and step number', () => {
    render(<StepHeader currentStep={2} totalSteps={4} title="Vehicle Details" />);
    expect(screen.getByText(/Vehicle Details/)).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument();
  });

  it('renders progress bar at correct percentage', () => {
    render(<StepHeader currentStep={1} totalSteps={4} title="Test" />);
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('shows error alert when error prop is provided', () => {
    render(<StepHeader currentStep={1} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not render error alert when no error', () => {
    render(<StepHeader currentStep={1} title="Test" />);
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('uses default title and totalSteps when not provided', () => {
    render(<StepHeader currentStep={3} />);
    expect(screen.getByText(/Material Inward/)).toBeInTheDocument();
    expect(screen.getByText(/Step 3 of 6/)).toBeInTheDocument();
  });
});
