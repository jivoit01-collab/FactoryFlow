import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════
// Mock dependencies
// ═══════════════════════════════════════════════════════════════

vi.mock('../../api', () => ({
  useWarehouses: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

let lastSearchableSelectProps: any = null;
vi.mock('@/shared/components', () => ({
  SearchableSelect: (props: any) => {
    lastSearchableSelectProps = props;
    return <div data-testid="searchable-select" />;
  },
}));

import { WarehouseSelect } from '../../components/WarehouseSelect';

const defaultProps = {
  onChange: vi.fn(),
};

describe('WarehouseSelect', () => {
  // ═══════════════════════════════════════════════════════════════
  // Rendering
  // ═══════════════════════════════════════════════════════════════

  it('renders without crashing', () => {
    const { container } = render(<WarehouseSelect {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('renders the SearchableSelect component', () => {
    const { getByTestId } = render(<WarehouseSelect {...defaultProps} />);
    expect(getByTestId('searchable-select')).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Props forwarding
  // ═══════════════════════════════════════════════════════════════

  it('passes inputId="warehouse-select" to SearchableSelect', () => {
    render(<WarehouseSelect {...defaultProps} />);
    expect(lastSearchableSelectProps.inputId).toBe('warehouse-select');
  });

  it('uses default placeholder "Select warehouse"', () => {
    render(<WarehouseSelect {...defaultProps} />);
    expect(lastSearchableSelectProps.placeholder).toBe('Select warehouse');
  });

  it('passes custom placeholder when provided', () => {
    render(<WarehouseSelect {...defaultProps} placeholder="Pick one" />);
    expect(lastSearchableSelectProps.placeholder).toBe('Pick one');
  });

  it('passes disabled prop correctly', () => {
    render(<WarehouseSelect {...defaultProps} disabled={true} />);
    expect(lastSearchableSelectProps.disabled).toBe(true);
  });

  it('passes error prop correctly', () => {
    render(<WarehouseSelect {...defaultProps} error="Required field" />);
    expect(lastSearchableSelectProps.error).toBe('Required field');
  });

  it('passes label prop correctly', () => {
    render(<WarehouseSelect {...defaultProps} label="Warehouse" />);
    expect(lastSearchableSelectProps.label).toBe('Warehouse');
  });

  it('passes required prop correctly', () => {
    render(<WarehouseSelect {...defaultProps} required={true} />);
    expect(lastSearchableSelectProps.required).toBe(true);
  });

  it('defaults disabled to false', () => {
    render(<WarehouseSelect {...defaultProps} />);
    expect(lastSearchableSelectProps.disabled).toBe(false);
  });

  it('defaults required to false', () => {
    render(<WarehouseSelect {...defaultProps} />);
    expect(lastSearchableSelectProps.required).toBe(false);
  });
});
