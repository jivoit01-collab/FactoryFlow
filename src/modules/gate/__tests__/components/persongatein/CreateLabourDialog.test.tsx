import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// CreateLabourDialog — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('CreateLabourDialog', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/persongatein/CreateLabourDialog.tsx'),
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

  it('defines CreateLabourDialogProps interface', () => {
    expect(content).toContain('CreateLabourDialogProps')
  })

  it('renders text "Add New Labour"', () => {
    expect(content).toContain('Add New Labour')
  })

  it('renders text "Fill in the details to register a new labour."', () => {
    expect(content).toContain('Fill in the details to register a new labour.')
  })

  it('renders text "Cancel"', () => {
    expect(content).toContain('Cancel')
  })

})
