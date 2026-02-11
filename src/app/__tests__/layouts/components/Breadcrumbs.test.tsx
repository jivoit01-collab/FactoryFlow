import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Breadcrumbs — File Content Verification
//
// Imports lucide-react (ChevronRight, Home), so direct import
// would hang Vite's module graph.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/layouts/components/Breadcrumbs.tsx'),
    'utf-8',
  )
}

describe('Breadcrumbs', () => {
  // ─── Exports & Dependencies ──────────────────────────────

  it('exports Breadcrumbs as named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+Breadcrumbs/)
  })

  it('imports Link, useLocation, useNavigate from react-router-dom', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*Link[^}]*useLocation[^}]*useNavigate[^}]*\}\s*from\s*['"]react-router-dom['"]/,
    )
  })

  it('imports ChevronRight and Home from lucide-react', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*ChevronRight[^}]*Home[^}]*\}\s*from\s*['"]lucide-react['"]/,
    )
  })

  it('does not import from @/core/auth (no permission logic)', () => {
    const content = readSource()
    expect(content).not.toContain('@/core/auth')
  })

  // ─── SHORT_NAMES Mapping ────────────────────────────────

  it('defines SHORT_NAMES record constant', () => {
    const content = readSource()
    expect(content).toMatch(/const\s+SHORT_NAMES:\s*Record<string,\s*string>/)
  })

  it("maps 'raw-materials' to 'RM'", () => {
    const content = readSource()
    expect(content).toMatch(/'raw-materials':\s*'RM'/)
  })

  it("maps 'daily-needs' to 'Daily'", () => {
    const content = readSource()
    expect(content).toMatch(/'daily-needs':\s*'Daily'/)
  })

  it("maps 'quality-check' to 'QC'", () => {
    const content = readSource()
    expect(content).toMatch(/'quality-check':\s*'QC'/)
  })

  it("maps 'grpo' to 'GRPO'", () => {
    const content = readSource()
    expect(content).toMatch(/grpo:\s*'GRPO'/)
  })

  it("maps step keys to 'Step N' format", () => {
    const content = readSource()
    expect(content).toMatch(/step1:\s*'Step 1'/)
    expect(content).toMatch(/step2:\s*'Step 2'/)
    expect(content).toMatch(/step3:\s*'Step 3'/)
    expect(content).toMatch(/step4:\s*'Step 4'/)
    expect(content).toMatch(/step5:\s*'Step 5'/)
  })

  it("maps 'material-types' to 'Materials'", () => {
    const content = readSource()
    expect(content).toMatch(/'material-types':\s*'Materials'/)
  })

  it("maps 'maintenance' to 'Maint.'", () => {
    const content = readSource()
    expect(content).toMatch(/'maintenance':\s*'Maint\.'/)
  })

  // ─── NAVIGABLE_PATHS ────────────────────────────────────

  it('defines NAVIGABLE_PATHS array', () => {
    const content = readSource()
    expect(content).toMatch(/const\s+NAVIGABLE_PATHS\s*=\s*\[/)
  })

  it("includes root path '/'", () => {
    const content = readSource()
    expect(content).toMatch(/NAVIGABLE_PATHS\s*=\s*\[[\s\S]*?'\/'/)
  })

  it('includes gate paths', () => {
    const content = readSource()
    expect(content).toContain("'/gate'")
    expect(content).toContain("'/gate/raw-materials'")
  })

  it('includes QC and GRPO paths', () => {
    const content = readSource()
    expect(content).toContain("'/qc'")
    expect(content).toContain("'/grpo'")
  })

  // ─── Helper Functions ────────────────────────────────────

  it('defines getDisplayName function with numeric ID check', () => {
    const content = readSource()
    expect(content).toMatch(/function\s+getDisplayName\(segment:\s*string\)/)
    expect(content).toContain('/^\\d+$/.test(segment)')
    expect(content).toContain('`#${segment}`')
  })

  it('defines isNavigablePath function', () => {
    const content = readSource()
    expect(content).toMatch(/function\s+isNavigablePath\(path:\s*string\)/)
    expect(content).toContain('NAVIGABLE_PATHS.includes(path)')
  })

  it('defines getRedirectPath function handling /edit and /new paths', () => {
    const content = readSource()
    expect(content).toMatch(/function\s+getRedirectPath/)
    expect(content).toContain("path.includes('/edit')")
    expect(content).toContain("path.includes('/new')")
  })

  it('redirects /inspections to /qc/pending', () => {
    const content = readSource()
    expect(content).toContain("path.includes('/inspections')")
    expect(content).toContain("'/qc/pending'")
  })

  it('redirects /grpo/preview to /grpo/pending', () => {
    const content = readSource()
    expect(content).toContain("path === '/grpo/preview'")
    expect(content).toContain("'/grpo/pending'")
  })

  // ─── Rendering ───────────────────────────────────────────

  it('renders Home icon as first breadcrumb with Link to /', () => {
    const content = readSource()
    expect(content).toContain('<Home className="h-4 w-4"')
    expect(content).toMatch(/<Link[\s\S]*?to="\/"/m)
  })
})
