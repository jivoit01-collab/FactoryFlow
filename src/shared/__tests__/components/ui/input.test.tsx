import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// Input Component — File Content Verification
// ═══════════════════════════════════════════════════════════════════════════════
// Validates the Input component's structure, type handling, styles, and exports
// without importing it directly (heavy dep chain hangs Vite resolution).
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs')
  const path = require('node:path')
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/input.tsx'),
    'utf-8',
  )
}

describe('shared/components/ui/input.tsx — file content verification', () => {
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

    it('does NOT depend on Radix UI or class-variance-authority', () => {
      expect(source).not.toContain('@radix-ui')
      expect(source).not.toContain('class-variance-authority')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // InputProps type
  // ═══════════════════════════════════════════════════════════════════════════
  describe('InputProps type', () => {
    it('exports InputProps as a type alias', () => {
      expect(source).toMatch(/export\s+type\s+InputProps/)
    })

    it('extends React.InputHTMLAttributes<HTMLInputElement>', () => {
      expect(source).toContain('React.InputHTMLAttributes<HTMLInputElement>')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Component definition
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Input component', () => {
    it('is created with React.forwardRef targeting HTMLInputElement', () => {
      expect(source).toMatch(
        /const\s+Input\s*=\s*React\.forwardRef<HTMLInputElement\s*,\s*InputProps>/,
      )
    })

    it('destructures className and type from props', () => {
      expect(source).toMatch(/\{\s*className\s*,\s*type\s*,\s*\.\.\.props\s*\}/)
    })

    it('renders an <input> element', () => {
      expect(source).toMatch(/<input[\s\n]/)
    })

    it('passes the type prop through to the native input', () => {
      expect(source).toContain('type={type}')
    })

    it('sets displayName to "Input"', () => {
      expect(source).toContain("Input.displayName = 'Input'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Styling
  // ═══════════════════════════════════════════════════════════════════════════
  describe('styling', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // Layout & dimensions
    // ─────────────────────────────────────────────────────────────────────────
    it('uses flex layout with h-10 height and full width', () => {
      expect(source).toContain('flex h-10 w-full')
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
    // File input & placeholder
    // ─────────────────────────────────────────────────────────────────────────
    it('styles file input to be borderless and transparent', () => {
      expect(source).toContain('file:border-0')
      expect(source).toContain('file:bg-transparent')
    })

    it('styles placeholder text with muted foreground color', () => {
      expect(source).toContain('placeholder:text-muted-foreground')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Exports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('exports', () => {
    it('exports Input as a named export', () => {
      expect(source).toMatch(/export\s*\{\s*Input\s*\}/)
    })

    it('exports InputProps at the type level', () => {
      expect(source).toMatch(/export\s+type\s+InputProps\s*=/)
    })
  })
})
