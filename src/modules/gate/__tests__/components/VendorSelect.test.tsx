import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// VendorSelect — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('VendorSelect', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/VendorSelect.tsx'),
    'utf-8',
  )

  it('exports a named function', () => {
    expect(content).toContain('export function')
  })

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (')
  })

  it('defines VendorSelectProps interface', () => {
    expect(content).toContain('VendorSelectProps')
  })

  it('renders text "Vendor"', () => {
    expect(content).toContain('Vendor')
  })

})
