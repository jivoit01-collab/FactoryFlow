import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SummaryCard } from '../SummaryCard'

// Mock UI components
vi.mock('@/shared/components/ui', () => ({
  Card: ({ children, onClick, className, ...props }: any) => (
    <div onClick={onClick} className={className} data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}))

// Mock cn utility
vi.mock('@/shared/utils', () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ChevronRight: (props: any) => <span data-testid="chevron-right" {...props} />,
}))

// Mock icon component
const MockIcon = (props: any) => <span data-testid="summary-icon" {...props} />

describe('SummaryCard', () => {
  // ─── Basic Rendering ───────────────────────────────────────────

  it('renders title correctly', () => {
    render(<SummaryCard title="Total Items" value={42} />)
    expect(screen.getByText('Total Items')).toBeInTheDocument()
  })

  it('renders numeric value correctly', () => {
    render(<SummaryCard title="Count" value={150} />)
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('renders string value correctly', () => {
    render(<SummaryCard title="Status" value="Active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  // ─── Icon ──────────────────────────────────────────────────────

  it('renders icon when provided', () => {
    render(<SummaryCard title="Items" value={10} icon={MockIcon as any} />)
    expect(screen.getByTestId('summary-icon')).toBeInTheDocument()
  })

  it('does not render icon when not provided', () => {
    render(<SummaryCard title="Items" value={10} />)
    expect(screen.queryByTestId('summary-icon')).not.toBeInTheDocument()
  })

  // ─── Click Handler ─────────────────────────────────────────────

  it('calls onClick when card is clicked', () => {
    const handleClick = vi.fn()
    render(<SummaryCard title="Items" value={10} onClick={handleClick} />)
    fireEvent.click(screen.getByTestId('card'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders chevron icon when onClick is provided', () => {
    const handleClick = vi.fn()
    render(<SummaryCard title="Items" value={10} onClick={handleClick} />)
    expect(screen.getByTestId('chevron-right')).toBeInTheDocument()
  })

  it('does not render chevron icon when onClick is not provided', () => {
    render(<SummaryCard title="Items" value={10} />)
    expect(screen.queryByTestId('chevron-right')).not.toBeInTheDocument()
  })

  it('applies cursor-pointer class when onClick is provided', () => {
    const handleClick = vi.fn()
    render(<SummaryCard title="Items" value={10} onClick={handleClick} />)
    const card = screen.getByTestId('card')
    expect(card.className).toContain('cursor-pointer')
  })

  it('does not apply cursor-pointer class when onClick is not provided', () => {
    render(<SummaryCard title="Items" value={10} />)
    const card = screen.getByTestId('card')
    expect(card.className).not.toContain('cursor-pointer')
  })

  // ─── Details Section ───────────────────────────────────────────

  it('renders details when provided', () => {
    const details = [
      { label: 'Active', value: 5 },
      { label: 'Inactive', value: 3 },
    ]
    render(<SummaryCard title="Items" value={8} details={details} />)
    expect(screen.getByText('Active:')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Inactive:')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('does not render details section when details is undefined', () => {
    const { container } = render(<SummaryCard title="Items" value={8} />)
    const border = container.querySelector('.border-t')
    expect(border).not.toBeInTheDocument()
  })

  it('does not render details section when details array is empty', () => {
    const { container } = render(
      <SummaryCard title="Items" value={8} details={[]} />
    )
    const border = container.querySelector('.border-t')
    expect(border).not.toBeInTheDocument()
  })

  it('renders details with string values', () => {
    const details = [{ label: 'Category', value: 'Electronics' }]
    render(<SummaryCard title="Items" value={8} details={details} />)
    expect(screen.getByText('Electronics')).toBeInTheDocument()
  })

  // ─── Children ──────────────────────────────────────────────────

  it('renders children at the bottom of the card', () => {
    render(
      <SummaryCard title="Items" value={8}>
        <div data-testid="custom-child">Extra content</div>
      </SummaryCard>
    )
    expect(screen.getByTestId('custom-child')).toBeInTheDocument()
  })

  // ─── Custom className ─────────────────────────────────────────

  it('applies custom className', () => {
    render(
      <SummaryCard title="Items" value={8} className="custom-summary" />
    )
    const card = screen.getByTestId('card')
    expect(card.className).toContain('custom-summary')
  })

  // ─── Edge Cases ────────────────────────────────────────────────

  it('renders with value of 0', () => {
    render(<SummaryCard title="Items" value={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('renders with negative value', () => {
    render(<SummaryCard title="Balance" value={-100} />)
    expect(screen.getByText('-100')).toBeInTheDocument()
  })

  it('renders with very large value', () => {
    render(<SummaryCard title="Revenue" value={9999999} />)
    expect(screen.getByText('9999999')).toBeInTheDocument()
  })

  it('renders with empty string value', () => {
    render(<SummaryCard title="Status" value="" />)
    // The component renders but with empty text
    const card = screen.getByTestId('card')
    expect(card).toBeInTheDocument()
  })

  it('renders with empty title', () => {
    render(<SummaryCard title="" value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  // ─── Styling ───────────────────────────────────────────────────

  it('has primary color styling by default', () => {
    render(<SummaryCard title="Items" value={10} />)
    const card = screen.getByTestId('card')
    expect(card.className).toContain('bg-primary/5')
    expect(card.className).toContain('border-primary/20')
  })

  it('value has large bold styling', () => {
    render(<SummaryCard title="Items" value={42} />)
    const valueEl = screen.getByText('42')
    expect(valueEl.className).toContain('text-3xl')
    expect(valueEl.className).toContain('font-bold')
  })

  // ─── Multiple Details ──────────────────────────────────────────

  it('renders multiple detail items side by side', () => {
    const details = [
      { label: 'A', value: 1 },
      { label: 'B', value: 2 },
      { label: 'C', value: 3 },
    ]
    render(<SummaryCard title="Items" value={6} details={details} />)
    expect(screen.getByText('A:')).toBeInTheDocument()
    expect(screen.getByText('B:')).toBeInTheDocument()
    expect(screen.getByText('C:')).toBeInTheDocument()
  })

  // ─── Keyboard Accessibility ────────────────────────────────────

  it('clickable card has role="button"', () => {
    const handleClick = vi.fn()
    render(<SummaryCard title="Items" value={10} onClick={handleClick} />)
    const card = screen.getByTestId('card')
    expect(card.getAttribute('role')).toBe('button')
  })

  it('non-clickable card has no role attribute', () => {
    render(<SummaryCard title="Items" value={10} />)
    const card = screen.getByTestId('card')
    expect(card.getAttribute('role')).toBeNull()
  })

  it('clickable card has tabIndex={0}', () => {
    const handleClick = vi.fn()
    render(<SummaryCard title="Items" value={10} onClick={handleClick} />)
    const card = screen.getByTestId('card')
    expect(card.getAttribute('tabindex')).toBe('0')
  })

  it('non-clickable card has no tabIndex', () => {
    render(<SummaryCard title="Items" value={10} />)
    const card = screen.getByTestId('card')
    expect(card.getAttribute('tabindex')).toBeNull()
  })

  it('triggers onClick on Enter key press', () => {
    const handleClick = vi.fn()
    render(<SummaryCard title="Items" value={10} onClick={handleClick} />)
    const card = screen.getByTestId('card')
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('triggers onClick on Space key press', () => {
    const handleClick = vi.fn()
    render(<SummaryCard title="Items" value={10} onClick={handleClick} />)
    const card = screen.getByTestId('card')
    fireEvent.keyDown(card, { key: ' ' })
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not trigger onClick on other key presses', () => {
    const handleClick = vi.fn()
    render(<SummaryCard title="Items" value={10} onClick={handleClick} />)
    const card = screen.getByTestId('card')
    fireEvent.keyDown(card, { key: 'Tab' })
    expect(handleClick).not.toHaveBeenCalled()
  })
})
