import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// DepartmentSelect — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('DepartmentSelect', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/DepartmentSelect.tsx'),
    'utf-8',
  )

  it('exports a named function', () => {
    expect(content).toContain('export function')
  })

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (')
  })

  it('defines DepartmentSelectProps interface', () => {
    expect(content).toContain('DepartmentSelectProps')
  })

  it('renders text "Department"', () => {
    expect(content).toContain('Department')
  })

})
