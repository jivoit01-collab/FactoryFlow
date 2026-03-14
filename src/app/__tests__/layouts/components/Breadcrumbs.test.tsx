import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Breadcrumbs — File Content Verification
//
// Imports lucide-react (ChevronRight, Home), so direct import
// would hang Vite's module graph.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
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

  it('imports Link and useLocation from react-router-dom', () => {
    const content = readSource();
    expect(content).toMatch(/import\s*\{[^}]*Link[^}]*\}\s*from\s*['"]react-router-dom['"]/);
    expect(content).toMatch(/import\s*\{[^}]*useLocation[^}]*\}\s*from\s*['"]react-router-dom['"]/);
  });

  it('imports ChevronRight and Home from lucide-react', () => {
    const content = readSource();
    expect(content).toMatch(
      /import\s*\{[^}]*ChevronRight[^}]*Home[^}]*\}\s*from\s*['"]lucide-react['"]/,
    );
  });

  it('does not import from @/core/auth (no permission logic)', () => {
    const content = readSource();
    expect(content).not.toContain('@/core/auth');
  });

  // ─── SEGMENT_LABELS Mapping ─────────────────────────────

  it('defines SEGMENT_LABELS record constant', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+SEGMENT_LABELS:\s*Record<string,\s*string>/);
  });

  it("maps 'raw-materials' to 'Raw Materials'", () => {
    const content = readSource();
    expect(content).toMatch(/'raw-materials':\s*'Raw Materials'/);
  });

  it("maps 'daily-needs' to 'Daily Needs'", () => {
    const content = readSource();
    expect(content).toMatch(/'daily-needs':\s*'Daily Needs'/);
  });

  it("maps 'quality-check' to 'QC'", () => {
    const content = readSource();
    expect(content).toMatch(/'quality-check':\s*'QC'/);
  });

  it("maps 'grpo' to 'GRPO'", () => {
    const content = readSource();
    expect(content).toMatch(/grpo:\s*'GRPO'/);
  });

  it("maps step keys to 'Step N' format", () => {
    const content = readSource();
    expect(content).toMatch(/step1:\s*'Step 1'/);
    expect(content).toMatch(/step2:\s*'Step 2'/);
    expect(content).toMatch(/step3:\s*'Step 3'/);
    expect(content).toMatch(/step4:\s*'Step 4'/);
    expect(content).toMatch(/step5:\s*'Step 5'/);
  });

  it("maps 'material-types' to 'Material Types'", () => {
    const content = readSource();
    expect(content).toMatch(/'material-types':\s*'Material Types'/);
  });

  it("maps 'maintenance' to 'Maintenance'", () => {
    const content = readSource();
    expect(content).toMatch(/maintenance:\s*'Maintenance'/);
  });

  it("maps production module segments", () => {
    const content = readSource();
    expect(content).toMatch(/production:\s*'Production'/);
    expect(content).toMatch(/planning:\s*'Planning'/);
    expect(content).toMatch(/execution:\s*'Execution'/);
    expect(content).toMatch(/breakdowns:\s*'Breakdowns'/);
    expect(content).toMatch(/'line-clearance':\s*'Line Clearance'/);
    expect(content).toMatch(/'machine-checklists':\s*'Machine Checklists'/);
  });

  // ─── NAVIGABLE_PATHS ────────────────────────────────────

  it('defines NAVIGABLE_PATHS as a Set', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+NAVIGABLE_PATHS\s*=\s*new\s+Set\(\[/);
  });

  it("includes root path '/'", () => {
    const content = readSource();
    expect(content).toContain("'/'");
  });

  it('includes all gate paths', () => {
    const content = readSource();
    expect(content).toContain("'/gate'");
    expect(content).toContain("'/gate/raw-materials'");
    expect(content).toContain("'/gate/raw-materials/all'");
    expect(content).toContain("'/gate/daily-needs'");
    expect(content).toContain("'/gate/maintenance'");
    expect(content).toContain("'/gate/construction'");
    expect(content).toContain("'/gate/visitor-labour'");
    expect(content).toContain("'/gate/visitor-labour/all'");
    expect(content).toContain("'/gate/visitor-labour/inside'");
    expect(content).toContain("'/gate/visitor-labour/visitors'");
    expect(content).toContain("'/gate/visitor-labour/labours'");
    expect(content).toContain("'/gate/visitor-labour/contractors'");
  });

  it('includes QC and GRPO paths', () => {
    const content = readSource();
    expect(content).toContain("'/qc'");
    expect(content).toContain("'/qc/pending'");
    expect(content).toContain("'/qc/approvals'");
    expect(content).toContain("'/grpo'");
    expect(content).toContain("'/grpo/pending'");
    expect(content).toContain("'/grpo/history'");
  });

  it('includes all production paths', () => {
    const content = readSource();
    expect(content).toContain("'/production'");
    expect(content).toContain("'/production/planning'");
    expect(content).toContain("'/production/execution'");
    expect(content).toContain("'/production/execution/breakdowns'");
    expect(content).toContain("'/production/execution/line-clearance'");
    expect(content).toContain("'/production/execution/machine-checklists'");
    expect(content).toContain("'/production/execution/waste'");
    expect(content).toContain("'/production/execution/reports'");
  });

  // ─── Helper Functions ────────────────────────────────────

  it('defines getLabel function with numeric ID check', () => {
    const content = readSource();
    expect(content).toMatch(/function\s+getLabel\(segment:\s*string\)/);
    expect(content).toContain('/^\\d+$/.test(segment)');
    expect(content).toContain('`#${segment}`');
  });

  it('defines resolveTarget function', () => {
    const content = readSource();
    expect(content).toMatch(/function\s+resolveTarget\(path:\s*string,\s*segments:\s*string\[\]\)/);
  });

  it('resolveTarget uses NAVIGABLE_PATHS.has', () => {
    const content = readSource();
    expect(content).toContain('NAVIGABLE_PATHS.has(path)');
  });

  it('handles edit workflows by redirecting to parent list', () => {
    const content = readSource();
    expect(content).toContain("segments.indexOf('edit')");
  });

  it('redirects /qc/inspections to /qc/pending', () => {
    const content = readSource();
    expect(content).toContain("'/qc/inspections'");
    expect(content).toContain("'/qc/pending'");
  });

  it('redirects /grpo/preview to /grpo/pending', () => {
    const content = readSource();
    expect(content).toContain("'/grpo/preview'");
    expect(content).toContain("'/grpo/pending'");
  });

  it('redirects production/execution/runs to execution dashboard', () => {
    const content = readSource();
    expect(content).toContain("'/production/execution/runs'");
    expect(content).toContain("'/production/execution'");
  });

  // ─── Rendering ───────────────────────────────────────────

  it('renders Home icon as first breadcrumb with Link to /', () => {
    const content = readSource();
    expect(content).toContain('<Home className="h-4 w-4"');
    expect(content).toMatch(/<Link[\s\S]*?to="\/"/m);
  });

  it('renders aria-current="page" on the last segment', () => {
    const content = readSource();
    expect(content).toContain('aria-current="page"');
  });

  it('has aria-label on the nav element', () => {
    const content = readSource();
    expect(content).toContain('aria-label="Breadcrumb"');
  });

  it('returns null for root path (no segments to display)', () => {
    const content = readSource();
    expect(content).toContain('if (segments.length === 0) return null');
  });
});
