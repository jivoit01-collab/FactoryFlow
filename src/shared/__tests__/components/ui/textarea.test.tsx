import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// Textarea Component — File Content Verification
// ═══════════════════════════════════════════════════════════════════════════════
// Validates the Textarea component's structure, minimum height constraint,
// styles, and exports without importing it directly.
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs')
  const path = require('node:path')
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/textarea.tsx'),
    'utf-8',
  )
}

describe('shared/components/ui/textarea.tsx — file content verification', () => {
  const source = readSource()

  // ═══════════════════════════════════════════════════════════════════════════
  // Imports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('imports', () => {
    it('imports React', () => {
      expect(source).toMatch(/import\s+\*\s+as\s+React\s+from\s+['"]react['"]/)
    })

    it('imports cn utility from @/shared/utils', () => {
      expect(source).toMatch(/import\s*\{\s*cn\s*\}\s*from\s*['"]@\/shared\/utils['"]/)
    })

    it('has no external dependencies beyond React and cn', () => {
      expect(source).not.toContain('@radix-ui')
      expect(source).not.toContain('class-variance-authority')
      expect(source).not.toContain('lucide-react')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // TextareaProps type
  // ═══════════════════════════════════════════════════════════════════════════
  describe('TextareaProps type', () => {
    it('exports TextareaProps as a type alias', () => {
      expect(source).toMatch(/export\s+type\s+TextareaProps/)
    })

    it('extends React.TextareaHTMLAttributes<HTMLTextAreaElement>', () => {
      expect(source).toContain('React.TextareaHTMLAttributes<HTMLTextAreaElement>')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Component definition
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Textarea component', () => {
    it('is created with React.forwardRef targeting HTMLTextAreaElement', () => {
      expect(source).toMatch(
        /const\s+Textarea\s*=\s*React\.forwardRef<HTMLTextAreaElement\s*,\s*TextareaProps>/,
      )
    })

    it('renders a <textarea> element', () => {
      expect(source).toMatch(/<textarea[\s\n]/)
    })

    it('sets displayName to "Textarea"', () => {
      expect(source).toContain("Textarea.displayName = 'Textarea'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Styling
  // ═══════════════════════════════════════════════════════════════════════════
  describe('styling', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // Layout & dimensions
    // ─────────────────────────────────────────────────────────────────────────
    it('enforces minimum height of 80px via min-h-[80px]', () => {
      expect(source).toContain('min-h-[80px]')
    })

    it('uses full width with flex layout', () => {
      expect(source).toContain('flex min-h-[80px] w-full')
    })

    it('applies rounded-md border border-input', () => {
      expect(source).toContain('rounded-md border border-input')
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Focus & disabled states
    // ─────────────────────────────────────────────────────────────────────────
    it('includes focus-visible ring styles', () => {
      expect(source).toContain('focus-visible:outline-none')
      expect(source).toContain('focus-visible:ring-2')
      expect(source).toContain('focus-visible:ring-ring')
    })

    it('disables cursor and reduces opacity when disabled', () => {
      expect(source).toContain('disabled:cursor-not-allowed')
      expect(source).toContain('disabled:opacity-50')
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Text & background
    // ─────────────────────────────────────────────────────────────────────────
    it('uses bg-background with text-sm', () => {
      expect(source).toContain('bg-background')
      expect(source).toContain('text-sm')
    })

    it('styles placeholder text with muted foreground color', () => {
      expect(source).toContain('placeholder:text-muted-foreground')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Structural comparison to Input
  // ═══════════════════════════════════════════════════════════════════════════
  describe('structural comparison to Input', () => {
    it('shares the same focus ring, disabled, and border patterns as Input', () => {
      // Both components use the same tailwind focus/disabled recipe
      expect(source).toContain('ring-offset-background')
      expect(source).toContain('focus-visible:ring-offset-2')
      expect(source).toContain('border border-input')
    })

    it('does NOT destructure a type prop (unlike Input)', () => {
      // Textarea has no type attribute, only className + ...props
      expect(source).toMatch(/\{\s*className\s*,\s*\.\.\.props\s*\}/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Exports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('exports', () => {
    it('exports Textarea as a named export', () => {
      expect(source).toMatch(/export\s*\{\s*Textarea\s*\}/)
    })

    it('exports TextareaProps at the type level', () => {
      expect(source).toMatch(/export\s+type\s+TextareaProps\s*=/)
    })
  })
})
