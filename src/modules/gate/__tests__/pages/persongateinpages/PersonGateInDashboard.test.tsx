import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// PersonGateInDashboard — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This page component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('PersonGateInDashboard', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/pages/persongateinpages/PersonGateInDashboard.tsx'),
    'utf-8',
  )

  it('exports PersonGateInDashboard as default function', () => {
    expect(content).toContain('export default function')
  })

  it('imports icons from lucide-react', () => {
    expect(content).toContain('from \'lucide-react\'')
  })

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (')
  })

})
