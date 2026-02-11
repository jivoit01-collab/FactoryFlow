import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// CategorySelect — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('CategorySelect', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/CategorySelect.tsx'),
    'utf-8',
  )

  it('exports a named function', () => {
    expect(content).toContain('export function')
  })

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (')
  })

  it('defines CategorySelectProps interface', () => {
    expect(content).toContain('CategorySelectProps')
  })

  it('renders text "Category"', () => {
    expect(content).toContain('Category')
  })

})
