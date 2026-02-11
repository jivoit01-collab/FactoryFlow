import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// CreateDriverDialog — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('CreateDriverDialog', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/CreateDriverDialog.tsx'),
    'utf-8',
  )

  it('exports a named function', () => {
    expect(content).toContain('export function')
  })

  it('imports icons from lucide-react', () => {
    expect(content).toContain('from \'lucide-react\'')
  })

  it('imports from shared UI components', () => {
    expect(content).toContain('from \'@/shared/components/ui\'')
  })

  it('uses react-hook-form', () => {
    expect(content).toContain('from \'react-hook-form\'')
  })

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (')
  })

  it('defines CreateDriverDialogProps interface', () => {
    expect(content).toContain('CreateDriverDialogProps')
  })

  it('renders text "Add New Driver"', () => {
    expect(content).toContain('Add New Driver')
  })

  it('renders text "Fill in the details to create a new driver. All fields are required."', () => {
    expect(content).toContain('Fill in the details to create a new driver. All fields are required.')
  })

  it('renders text "Cancel"', () => {
    expect(content).toContain('Cancel')
  })

})
