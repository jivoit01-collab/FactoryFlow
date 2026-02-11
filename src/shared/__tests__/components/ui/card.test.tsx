import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// Card Component Family — File Content Verification
// ═══════════════════════════════════════════════════════════════════════════════
// Validates structure, semantic HTML elements, styling, and exports for all
// six Card sub-components without importing them directly.
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs')
  const path = require('node:path')
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/card.tsx'),
    'utf-8',
  )
}

describe('shared/components/ui/card.tsx — file content verification', () => {
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

    it('does NOT import any Radix UI primitives', () => {
      expect(source).not.toContain('@radix-ui')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Card (root)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Card component', () => {
    it('is created with React.forwardRef targeting HTMLDivElement', () => {
      expect(source).toMatch(
        /const\s+Card\s*=\s*React\.forwardRef<HTMLDivElement/,
      )
    })

    it('renders a <div> with rounded-lg border bg-card', () => {
      expect(source).toContain('rounded-lg border bg-card')
    })

    it('includes text-card-foreground and shadow-sm classes', () => {
      expect(source).toContain('text-card-foreground shadow-sm')
    })

    it('sets displayName to "Card"', () => {
      expect(source).toContain("Card.displayName = 'Card'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CardHeader
  // ═══════════════════════════════════════════════════════════════════════════
  describe('CardHeader component', () => {
    it('is created with React.forwardRef targeting HTMLDivElement', () => {
      expect(source).toMatch(
        /const\s+CardHeader\s*=\s*React\.forwardRef<HTMLDivElement/,
      )
    })

    it('uses flex column layout with space-y-1.5 and p-6', () => {
      expect(source).toContain('flex flex-col space-y-1.5 p-6')
    })

    it('sets displayName to "CardHeader"', () => {
      expect(source).toContain("CardHeader.displayName = 'CardHeader'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CardTitle
  // ═══════════════════════════════════════════════════════════════════════════
  describe('CardTitle component', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+CardTitle\s*=\s*React\.forwardRef/)
    })

    it('renders an <h3> element (semantic heading)', () => {
      expect(source).toMatch(/<h3[\s\n]/)
    })

    it('applies text-2xl font-semibold styles', () => {
      expect(source).toContain('text-2xl font-semibold')
    })

    it('includes leading-none tracking-tight for typography', () => {
      expect(source).toContain('leading-none tracking-tight')
    })

    it('sets displayName to "CardTitle"', () => {
      expect(source).toContain("CardTitle.displayName = 'CardTitle'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CardDescription
  // ═══════════════════════════════════════════════════════════════════════════
  describe('CardDescription component', () => {
    it('is created with React.forwardRef targeting HTMLParagraphElement', () => {
      expect(source).toMatch(
        /const\s+CardDescription\s*=\s*React\.forwardRef<\s*\n?\s*HTMLParagraphElement/,
      )
    })

    it('renders a <p> element', () => {
      expect(source).toMatch(/<p\s+ref=/)
    })

    it('applies text-sm text-muted-foreground styles', () => {
      expect(source).toContain('text-sm text-muted-foreground')
    })

    it('sets displayName to "CardDescription"', () => {
      expect(source).toContain("CardDescription.displayName = 'CardDescription'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CardContent
  // ═══════════════════════════════════════════════════════════════════════════
  describe('CardContent component', () => {
    it('is created with React.forwardRef targeting HTMLDivElement', () => {
      expect(source).toMatch(
        /const\s+CardContent\s*=\s*React\.forwardRef<HTMLDivElement/,
      )
    })

    it('applies p-6 pt-0 padding (no top padding to avoid double-spacing)', () => {
      expect(source).toContain('p-6 pt-0')
    })

    it('sets displayName to "CardContent"', () => {
      expect(source).toContain("CardContent.displayName = 'CardContent'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CardFooter
  // ═══════════════════════════════════════════════════════════════════════════
  describe('CardFooter component', () => {
    it('is created with React.forwardRef targeting HTMLDivElement', () => {
      expect(source).toMatch(
        /const\s+CardFooter\s*=\s*React\.forwardRef<HTMLDivElement/,
      )
    })

    it('uses flex with items-center alignment', () => {
      expect(source).toContain('flex items-center p-6 pt-0')
    })

    it('sets displayName to "CardFooter"', () => {
      expect(source).toContain("CardFooter.displayName = 'CardFooter'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Exports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('exports', () => {
    it('exports all six sub-components in a single export statement', () => {
      expect(source).toMatch(
        /export\s*\{\s*Card\s*,\s*CardHeader\s*,\s*CardFooter\s*,\s*CardTitle\s*,\s*CardDescription\s*,\s*CardContent\s*\}/,
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Structural consistency
  // ═══════════════════════════════════════════════════════════════════════════
  describe('structural consistency', () => {
    it('every sub-component uses forwardRef', () => {
      const forwardRefCount = (source.match(/React\.forwardRef/g) ?? []).length
      expect(forwardRefCount).toBe(6)
    })

    it('every sub-component has a displayName', () => {
      const displayNameCount = (source.match(/\.displayName\s*=/g) ?? []).length
      expect(displayNameCount).toBe(6)
    })

    it('every sub-component uses the cn() utility', () => {
      const cnCallCount = (source.match(/cn\(/g) ?? []).length
      expect(cnCallCount).toBeGreaterThanOrEqual(6)
    })
  })
})
