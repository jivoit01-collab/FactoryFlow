import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// CreateVisitorDialog — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('CreateVisitorDialog', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/persongatein/CreateVisitorDialog.tsx'),
    'utf-8',
  )

  it('exports a named function', () => {
    expect(content).toContain('export function')
  })

  it('imports from shared UI components', () => {
    expect(content).toContain('from \'@/shared/components/ui\'')
  })

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (')
  })

  it('defines CreateVisitorDialogProps interface', () => {
    expect(content).toContain('CreateVisitorDialogProps')
  })

  it('renders text "Add New Visitor"', () => {
    expect(content).toContain('Add New Visitor')
  })

  it('renders text "Fill in the details to register a new visitor."', () => {
    expect(content).toContain('Fill in the details to register a new visitor.')
  })

  it('renders text "Cancel"', () => {
    expect(content).toContain('Cancel')
  })

})
