import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DashboardHeader } from '../../../components/dashboard/DashboardHeader'

// Mock UI components to render simple HTML equivalents
vi.mock('@/shared/components/ui', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}))

// Mock cn utility to just concatenate classes
vi.mock('@/shared/utils', () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}))

describe('DashboardHeader', () => {
  // ─── Basic Rendering ───────────────────────────────────────────

  it('renders the title correctly', () => {
    render(<DashboardHeader title="Test Dashboard" />)
    expect(screen.getByText('Test Dashboard')).toBeInTheDocument()
  })

  it('renders the title as an h2 element', () => {
    render(<DashboardHeader title="Dashboard Title" />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Dashboard Title')
  })

  it('renders with correct heading classes', () => {
    render(<DashboardHeader title="Styled Title" />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.className).toContain('text-3xl')
    expect(heading.className).toContain('font-bold')
    expect(heading.className).toContain('tracking-tight')
  })

  // ─── Description ───────────────────────────────────────────────

  it('renders description when provided', () => {
    render(
      <DashboardHeader title="Title" description="A helpful description" />
    )
    expect(screen.getByText('A helpful description')).toBeInTheDocument()
  })

  it('does not render description paragraph when not provided', () => {
    const { container } = render(<DashboardHeader title="Title" />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs.length).toBe(0)
  })

  it('description has muted foreground styling', () => {
    render(
      <DashboardHeader title="Title" description="Description text" />
    )
    const desc = screen.getByText('Description text')
    expect(desc.tagName).toBe('P')
    expect(desc.className).toContain('text-muted-foreground')
  })

  // ─── Primary Action ────────────────────────────────────────────

  it('renders primary action button when provided', () => {
    const handleClick = vi.fn()
    render(
      <DashboardHeader
        title="Title"
        primaryAction={{ label: 'Create New', onClick: handleClick }}
      />
    )
    const button = screen.getByText('Create New')
    expect(button).toBeInTheDocument()
  })

  it('calls primary action onClick when button is clicked', () => {
    const handleClick = vi.fn()
    render(
      <DashboardHeader
        title="Title"
        primaryAction={{ label: 'Add Item', onClick: handleClick }}
      />
    )
    fireEvent.click(screen.getByText('Add Item'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders primary action with icon when provided', () => {
    const MockIcon = () => <span data-testid="mock-icon">+</span>
    const handleClick = vi.fn()
    render(
      <DashboardHeader
        title="Title"
        primaryAction={{
          label: 'Add',
          icon: <MockIcon />,
          onClick: handleClick,
        }}
      />
    )
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument()
    expect(screen.getByText('Add')).toBeInTheDocument()
  })

  it('does not render action button when primaryAction is not provided', () => {
    const { container } = render(<DashboardHeader title="Title" />)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(0)
  })

  // ─── Children ──────────────────────────────────────────────────

  it('renders children in the actions area', () => {
    render(
      <DashboardHeader title="Title">
        <span data-testid="child-element">Custom Action</span>
      </DashboardHeader>
    )
    expect(screen.getByTestId('child-element')).toBeInTheDocument()
  })

  it('renders children alongside primary action', () => {
    const handleClick = vi.fn()
    render(
      <DashboardHeader
        title="Title"
        primaryAction={{ label: 'Primary', onClick: handleClick }}
      >
        <button>Secondary</button>
      </DashboardHeader>
    )
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('Secondary')).toBeInTheDocument()
  })

  // ─── Custom className ─────────────────────────────────────────

  it('applies custom className to the container', () => {
    const { container } = render(
      <DashboardHeader title="Title" className="custom-class" />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('custom-class')
  })

  // ─── Accessibility ────────────────────────────────────────────

  it('has accessible heading role', () => {
    render(<DashboardHeader title="Dashboard" />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('uses semantic <header> element as container', () => {
    const { container } = render(<DashboardHeader title="Dashboard" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.tagName).toBe('HEADER')
  })

  // ─── Edge Cases ────────────────────────────────────────────────

  it('renders with empty string title', () => {
    render(<DashboardHeader title="" />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading.textContent).toBe('')
  })

  it('renders with very long title', () => {
    const longTitle = 'A'.repeat(500)
    render(<DashboardHeader title={longTitle} />)
    expect(screen.getByText(longTitle)).toBeInTheDocument()
  })

  it('renders with special characters in title', () => {
    render(<DashboardHeader title="Dashboard & Reports <2024>" />)
    expect(screen.getByText('Dashboard & Reports <2024>')).toBeInTheDocument()
  })
})
