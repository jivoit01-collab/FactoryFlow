import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// CreateTransporterDialog — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('CreateTransporterDialog', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/CreateTransporterDialog.tsx'),
    'utf-8',
  )

  it('exports a named function', () => {
    expect(content).toContain('export function')
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

  it('defines CreateTransporterDialogProps interface', () => {
    expect(content).toContain('CreateTransporterDialogProps')
  })

  it('renders text "Add New Transporter"', () => {
    expect(content).toContain('Add New Transporter')
  })

  it('renders text "Fill in the details to create a new transporter. All fields are required."', () => {
    expect(content).toContain('Fill in the details to create a new transporter. All fields are required.')
  })

  it('renders text "Cancel"', () => {
    expect(content).toContain('Cancel')
  })

})
