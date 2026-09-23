import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Production module config — structure verification.
//
// Read as source rather than imported: the config pulls in
// lucide-react and every lazy page chain, which hangs Vite's
// module graph in a unit test. Same pattern as the other
// module.config tests.
// ═══════════════════════════════════════════════════════════════

function readModuleConfig(): string {
  return readFileSync(resolve(process.cwd(), 'src/modules/production/module.config.tsx'), 'utf-8');
}

/** The config text from `path:` up to the end of that entry. */
function entriesFor(path: string): string[] {
  const content = readModuleConfig();
  return content
    .split(new RegExp(`path:\\s*'${path.replace(/\//g, '\\/')}'`))
    .slice(1)
    .map((rest) => rest.slice(0, rest.indexOf('},')));
}

describe('productionModuleConfig — filling cost', () => {
  it('keeps the filling cost sheet to Jivo Beverages', () => {
    const content = readModuleConfig();
    expect(content).toContain('const FILLING_COST_COMPANIES = [COMPANY_CODES.JIVO_BEVERAGES]');

    // Both the route and the sidebar entry, so another unit neither sees the
    // page nor reaches it by typing the URL.
    const entries = entriesFor('/production/execution/filling-cost');
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry).toContain('companies: FILLING_COST_COMPANIES');
      expect(entry).toContain('permissions: FILLING_COST_PERMISSIONS');
    }
  });

  it('holds the page behind the filling cost permissions', () => {
    const content = readModuleConfig();
    expect(content).toContain('EXECUTION_PERMISSIONS.VIEW_FILLING_COST');
    expect(content).toContain('EXECUTION_PERMISSIONS.MANAGE_FILLING_COST');
  });

  it('leaves the rest of production open to every unit', () => {
    // The gate is on the one page, not on the module — Beverages-only must not
    // quietly become "production is Beverages-only".
    const content = readModuleConfig();
    const routes = content.slice(content.indexOf('routes: ['), content.indexOf('navigation: ['));
    const gated = routes.match(/companies:/g) ?? [];
    expect(gated).toHaveLength(1);
  });
});
