import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchableSelect } from '../../components/SearchableSelect';

vi.mock('@/config/constants', () => ({
  DEBOUNCE_DELAY: { search: 300, input: 150, resize: 100 },
}));

// Mock UI components
vi.mock('@/shared/components/ui', () => ({
  Input: ({ ref, ...props }: any) => <input {...props} />,
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

// Mock cn utility
vi.mock('@/shared/utils', () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}));

// Mock hooks
vi.mock('@/shared/hooks', () => ({
  useDebounce: (val: any) => val,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ChevronDown: (props: any) => <span data-testid="chevron-down" {...props} />,
  Check: (props: any) => <span data-testid="check" {...props} />,
  Loader2: (props: any) => <span data-testid="loader" {...props} />,
  Plus: (props: any) => <span data-testid="plus" {...props} />,
  HelpCircle: (props: any) => <span data-testid="help" {...props} />,
}));

type TestItem = { id: string; name: string };

const defaultProps = {
  items: [
    { id: '1', name: 'Apple' },
    { id: '2', name: 'Banana' },
    { id: '3', name: 'Cherry' },
  ] as TestItem[],
  isLoading: false,
  inputId: 'test-select',
  getItemKey: (item: TestItem) => item.id,
  getItemLabel: (item: TestItem) => item.name,
  loadingText: 'Loading...',
  emptyText: 'No items available',
  notFoundText: 'No results found',
  onItemSelect: vi.fn(),
  onClear: vi.fn(),
};

describe('SearchableSelect', () => {
  // ─── Basic Rendering ───────────────────────────────────────────

  it('renders the input element', () => {
    render(<SearchableSelect {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<SearchableSelect {...defaultProps} placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<SearchableSelect {...defaultProps} label="Select Fruit" />);
    expect(screen.getByText('Select Fruit')).toBeInTheDocument();
  });

  it('renders required indicator when required', () => {
    render(<SearchableSelect {...defaultProps} label="Fruit" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  // ─── Dropdown ──────────────────────────────────────────────────

  it('opens dropdown on input focus', () => {
    render(<SearchableSelect {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('shows items in dropdown', () => {
    render(<SearchableSelect {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  // ─── Loading State ─────────────────────────────────────────────

  it('shows loading indicator when isLoading is true', () => {
    render(<SearchableSelect {...defaultProps} isLoading={true} />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('disables input when loading', () => {
    render(<SearchableSelect {...defaultProps} isLoading={true} />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  // ─── Disabled State ────────────────────────────────────────────

  it('disables input when disabled prop is true', () => {
    render(<SearchableSelect {...defaultProps} disabled={true} />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  // ─── Error State ───────────────────────────────────────────────

  it('shows error message when error prop is provided', () => {
    render(<SearchableSelect {...defaultProps} error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  // ─── Keyboard ──────────────────────────────────────────────────

  it('closes dropdown on Escape key', () => {
    render(<SearchableSelect {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(screen.getByText('Apple')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
  });

  // ─── Selection ─────────────────────────────────────────────────

  it('calls onItemSelect when item is clicked', () => {
    const onItemSelect = vi.fn();
    render(<SearchableSelect {...defaultProps} onItemSelect={onItemSelect} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    fireEvent.click(screen.getByText('Banana'));
    expect(onItemSelect).toHaveBeenCalledWith(defaultProps.items[1]);
  });

  // ─── Clearing ──────────────────────────────────────────────────

  it('calls onClear when input is cleared', () => {
    const onClear = vi.fn();
    render(<SearchableSelect {...defaultProps} onClear={onClear} value="Apple" />);

    const input = screen.getByRole('textbox');
    // First type something to ensure searchTerm is non-empty
    fireEvent.change(input, { target: { value: 'test' } });
    // Then clear
    fireEvent.change(input, { target: { value: '' } });
    expect(onClear).toHaveBeenCalled();
  });
});
