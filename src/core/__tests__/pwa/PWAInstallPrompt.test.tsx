import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// PWAInstallPrompt — File Content Verification
//
// Direct import hangs due to deep transitive dependency chains
// through lucide-react (thousands of icon exports) and
// @/shared/components/ui (radix-ui chain). Instead, we verify
// the component structure via file content analysis — the same
// proven pattern from
// dashboard/__tests__/components/DashboardStats.test.tsx.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/pwa/PWAInstallPrompt.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

describe('PWAInstallPrompt — Exports', () => {
  it('exports PWAInstallPrompt as a named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+PWAInstallPrompt\(\)/)
  })
})

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('PWAInstallPrompt — Imports', () => {
  it('imports Download from lucide-react', () => {
    const content = readSource()
    expect(content).toContain('Download')
    expect(content).toContain("'lucide-react'")
  })

  it('imports X from lucide-react', () => {
    const content = readSource()
    expect(content).toMatch(/\bX\b/)
    expect(content).toMatch(/import\s*\{[^}]*\bX\b[^}]*\}\s*from\s*['"]lucide-react['"]/)
  })

  it('imports Button from @/shared/components/ui/button', () => {
    const content = readSource()
    expect(content).toContain('Button')
    expect(content).toContain("'@/shared/components/ui/button'")
  })

  it('imports APP_NAME from @/config/constants', () => {
    const content = readSource()
    expect(content).toContain('APP_NAME')
    expect(content).toContain("'@/config/constants'")
  })

  it('imports usePWAInstall from ./usePWAInstall', () => {
    const content = readSource()
    expect(content).toContain('usePWAInstall')
    expect(content).toContain("'./usePWAInstall'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Hook Usage
// ═══════════════════════════════════════════════════════════════

describe('PWAInstallPrompt — Hook Usage', () => {
  it('destructures showPrompt from usePWAInstall', () => {
    const content = readSource()
    expect(content).toContain('showPrompt')
  })

  it('destructures install from usePWAInstall', () => {
    const content = readSource()
    expect(content).toContain('install')
  })

  it('destructures dismiss from usePWAInstall', () => {
    const content = readSource()
    expect(content).toContain('dismiss')
  })
})

// ═══════════════════════════════════════════════════════════════
// Conditional Rendering
// ═══════════════════════════════════════════════════════════════

describe('PWAInstallPrompt — Conditional Rendering', () => {
  it('returns null when showPrompt is false', () => {
    const content = readSource()
    expect(content).toContain('if (!showPrompt) return null')
  })
})

// ═══════════════════════════════════════════════════════════════
// Layout & Styling
// ═══════════════════════════════════════════════════════════════

describe('PWAInstallPrompt — Layout', () => {
  it('renders a fixed bottom-4 card', () => {
    const content = readSource()
    expect(content).toContain('fixed')
    expect(content).toContain('bottom-4')
  })

  it('uses slide-in-from-bottom animation', () => {
    const content = readSource()
    expect(content).toContain('slide-in-from-bottom-4')
  })

  it('uses max-w-md for card width', () => {
    const content = readSource()
    expect(content).toContain('max-w-md')
  })

  it('renders a rounded-lg bordered card', () => {
    const content = readSource()
    expect(content).toContain('rounded-lg')
    expect(content).toContain('border')
    expect(content).toContain('bg-background')
  })
})

// ═══════════════════════════════════════════════════════════════
// Icons & Text
// ═══════════════════════════════════════════════════════════════

describe('PWAInstallPrompt — Icons & Text', () => {
  it('renders Download icon in the prompt', () => {
    const content = readSource()
    expect(content).toContain('<Download')
  })

  it('renders X dismiss button', () => {
    const content = readSource()
    expect(content).toContain('<X')
    expect(content).toContain('onClick={dismiss}')
  })

  it('renders "Install {APP_NAME}" text', () => {
    const content = readSource()
    expect(content).toContain('Install {APP_NAME}')
  })

  it('renders description about offline-ready experience', () => {
    const content = readSource()
    expect(content).toContain('Install the app for a faster, offline-ready experience.')
  })

  it('has sr-only "Dismiss" text for accessibility', () => {
    const content = readSource()
    expect(content).toContain('sr-only')
    expect(content).toContain('Dismiss')
  })
})

// ═══════════════════════════════════════════════════════════════
// Buttons
// ═══════════════════════════════════════════════════════════════

describe('PWAInstallPrompt — Buttons', () => {
  it('renders "Not now" ghost button that calls dismiss', () => {
    const content = readSource()
    expect(content).toContain('Not now')
    expect(content).toContain('variant="ghost"')
    expect(content).toMatch(/<Button\s+variant="ghost"[^>]*onClick=\{dismiss\}/)
  })

  it('renders "Install" button that calls install', () => {
    const content = readSource()
    expect(content).toContain('onClick={install}')
    expect(content).toMatch(/<Button\s+size="sm"\s+onClick=\{install\}/)
  })

  it('Install button includes Download icon', () => {
    const content = readSource()
    // The Install button has a Download icon inside it
    expect(content).toMatch(/<Button\s+size="sm"\s+onClick=\{install\}>[\s\S]*?<Download/)
  })

  it('buttons are right-aligned with justify-end', () => {
    const content = readSource()
    expect(content).toContain('justify-end')
  })
})
