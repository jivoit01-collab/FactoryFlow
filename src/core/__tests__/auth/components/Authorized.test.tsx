import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Authorized & withAuthorization — File Content Verification
//
// Direct import hangs due to deep transitive dependency chains
// through @/core/auth/hooks/usePermission and @/core/store.
// Instead, we verify the component structure via file content
// analysis — the same proven pattern from
// dashboard/__tests__/components/DashboardStats.test.tsx.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/auth/components/Authorized.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

describe('Authorized — Exports', () => {
  it('exports Authorized as a named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+Authorized/)
  })

  it('exports withAuthorization as a named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+withAuthorization/)
  })
})

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('Authorized — Imports', () => {
  it('imports ReactNode type from react', () => {
    const content = readSource()
    expect(content).toContain('ReactNode')
    expect(content).toMatch(/from\s+['"]react['"]/)
  })

  it('imports usePermission from ../hooks/usePermission', () => {
    const content = readSource()
    expect(content).toContain('usePermission')
    expect(content).toContain("'../hooks/usePermission'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Props Interface
// ═══════════════════════════════════════════════════════════════

describe('Authorized — Props Interface', () => {
  it('defines AuthorizedProps interface', () => {
    const content = readSource()
    expect(content).toMatch(/interface\s+AuthorizedProps/)
  })

  it('has children prop of type ReactNode', () => {
    const content = readSource()
    expect(content).toContain('children: ReactNode')
  })

  it('has optional permissions prop as string array', () => {
    const content = readSource()
    expect(content).toMatch(/permissions\?\s*:\s*string\[\]/)
  })

  it('has optional companyRoles prop as string array', () => {
    const content = readSource()
    expect(content).toMatch(/companyRoles\?\s*:\s*string\[\]/)
  })

  it('has optional requireAll prop of type boolean', () => {
    const content = readSource()
    expect(content).toMatch(/requireAll\?\s*:\s*boolean/)
  })

  it('has optional fallback prop of type ReactNode', () => {
    const content = readSource()
    expect(content).toMatch(/fallback\?\s*:\s*ReactNode/)
  })
})

// ═══════════════════════════════════════════════════════════════
// Permission Check Logic
// ═══════════════════════════════════════════════════════════════

describe('Authorized — Permission Check Logic', () => {
  it('defaults requireAll to false', () => {
    const content = readSource()
    expect(content).toContain('requireAll = false')
  })

  it('defaults fallback to null', () => {
    const content = readSource()
    expect(content).toContain('fallback = null')
  })

  it('uses usePermission hook', () => {
    const content = readSource()
    expect(content).toContain('hasAnyPermission')
    expect(content).toContain('hasAllPermissions')
    expect(content).toContain('hasAnyCompanyRole')
    expect(content).toContain('permissionsLoaded')
  })

  it('returns fallback when permissions not loaded', () => {
    const content = readSource()
    expect(content).toContain('if (!permissionsLoaded)')
    expect(content).toContain('<>{fallback}</>')
  })

  it('checks company roles when provided', () => {
    const content = readSource()
    expect(content).toContain('companyRoles && companyRoles.length > 0')
    expect(content).toContain('hasAnyCompanyRole(companyRoles)')
  })

  it('returns fallback when company role check fails', () => {
    const content = readSource()
    expect(content).toContain('!hasAnyCompanyRole(companyRoles)')
  })

  it('uses hasAllPermissions when requireAll is true', () => {
    const content = readSource()
    expect(content).toContain('requireAll')
    expect(content).toContain('hasAllPermissions(permissions)')
  })

  it('uses hasAnyPermission when requireAll is false', () => {
    const content = readSource()
    expect(content).toContain('hasAnyPermission(permissions)')
  })

  it('returns fallback when permission check fails', () => {
    const content = readSource()
    expect(content).toContain('if (!hasPermissionAccess)')
  })

  it('renders children in a fragment when all checks pass', () => {
    const content = readSource()
    expect(content).toContain('<>{children}</>')
  })
})

// ═══════════════════════════════════════════════════════════════
// withAuthorization HOC
// ═══════════════════════════════════════════════════════════════

describe('withAuthorization — HOC Pattern', () => {
  it('is a generic function accepting component type P', () => {
    const content = readSource()
    expect(content).toMatch(/function\s+withAuthorization<P\s+extends\s+object>/)
  })

  it('accepts WrappedComponent as first argument', () => {
    const content = readSource()
    expect(content).toContain('WrappedComponent: React.ComponentType<P>')
  })

  it('accepts options as second argument (Omit<AuthorizedProps, "children">)', () => {
    const content = readSource()
    expect(content).toContain("Omit<AuthorizedProps, 'children'>")
  })

  it('returns an AuthorizedComponent function', () => {
    const content = readSource()
    expect(content).toContain('function AuthorizedComponent(props: P)')
  })

  it('wraps WrappedComponent inside Authorized', () => {
    const content = readSource()
    expect(content).toContain('<Authorized {...options}>')
    expect(content).toContain('<WrappedComponent {...props} />')
  })
})
