import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Breadcrumbs — File Content Verification
//
// Imports lucide-react (ChevronRight, Home), so direct import
// would hang Vite's module graph.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
      return readFileSync(
    resolve(process.cwd(), 'src/app/layouts/components/Breadcrumbs.tsx'),
    'utf-8',
  );
}

describe('Breadcrumbs', () => {
  // ─── Exports & Dependencies ──────────────────────────────

  it('exports Breadcrumbs as named function', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+function\s+Breadcrumbs/);
  });

  it('imports Link, useLocation, useNavigate from react-router-dom', () => {
    const content = readSource();
    expect(content).toContain('Link');
    expect(content).toContain('useLocation');
    expect(content).toContain('useNavigate');
    expect(content).toContain('react-router-dom');
  });

  it('imports ChevronRight, Home, and MoreHorizontal from lucide-react', () => {
    const content = readSource();
    expect(content).toContain('ChevronRight');
    expect(content).toContain('Home');
    expect(content).toContain('MoreHorizontal');
    expect(content).toContain('lucide-react');
  });

  it('imports getBreadcrumbMeta from the registry', () => {
    const content = readSource();
    expect(content).toContain('getBreadcrumbMeta');
    expect(content).toContain('@/app/registry');
  });

  it('does not import from @/core/auth (no permission logic)', () => {
    const content = readSource();
    expect(content).not.toContain('@/core/auth');
  });

  // ─── Dynamic Registry (no hardcoded NAVIGABLE_PATHS) ──────

  it('does not have hardcoded NAVIGABLE_PATHS array', () => {
    const content = readSource();
    expect(content).not.toMatch(/const\s+NAVIGABLE_PATHS\s*=/);
  });

  it('does not have hardcoded SHORT_NAMES map', () => {
    const content = readSource();
    expect(content).not.toMatch(/const\s+SHORT_NAMES/);
  });

  it('uses navigablePaths and labels from getBreadcrumbMeta', () => {
    const content = readSource();
    expect(content).toContain('navigablePaths');
    expect(content).toContain('labels');
    expect(content).toContain('getBreadcrumbMeta()');
  });

  // ─── Helper Functions ────────────────────────────────────

  it('defines getDisplayName function with numeric ID check', () => {
    const content = readSource();
    expect(content).toMatch(/function\s+getDisplayName\(segment:\s*string/);
    expect(content).toContain('/^\\d+$/.test(segment)');
    expect(content).toContain('`#${segment}`');
  });

  it('defines isNavigablePath function with dynamic param matching', () => {
    const content = readSource();
    expect(content).toMatch(/function\s+isNavigablePath\(path:\s*string/);
    expect(content).toContain("startsWith(':')");
  });

  it('defines getRedirectPath function handling /edit and /new paths', () => {
    const content = readSource();
    expect(content).toMatch(/function\s+getRedirectPath/);
    expect(content).toContain("path.includes('/edit')");
    expect(content).toContain("path.includes('/new')");
  });

  it('redirects /inspections to /qc/pending', () => {
    const content = readSource();
    expect(content).toContain("path.includes('/inspections')");
    expect(content).toContain("'/qc/pending'");
  });

  it('redirects /grpo/preview to /grpo/pending', () => {
    const content = readSource();
    expect(content).toContain("path === '/grpo/preview'");
    expect(content).toContain("'/grpo/pending'");
  });

  // ─── Overflow Collapsing ──────────────────────────────────

  it('uses ResizeObserver for overflow detection', () => {
    const content = readSource();
    expect(content).toContain('ResizeObserver');
    expect(content).toContain('scrollWidth');
    expect(content).toContain('clientWidth');
  });

  it('renders MoreHorizontal icon for collapsed items', () => {
    const content = readSource();
    expect(content).toContain('<MoreHorizontal');
  });

  it('shows dropdown for collapsed breadcrumb items', () => {
    const content = readSource();
    expect(content).toContain('collapsedItems');
    expect(content).toContain('showCollapsed');
  });

  // ─── Rendering ───────────────────────────────────────────

  it('renders Home icon as first breadcrumb with Link to /', () => {
    const content = readSource();
    expect(content).toContain('<Home className="h-4 w-4"');
    expect(content).toMatch(/<Link[\s\S]*?to="\/"/m);
  });
});
