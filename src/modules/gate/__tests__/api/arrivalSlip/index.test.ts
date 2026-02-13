// ═══════════════════════════════════════════════════════════════
// Arrival Slip Barrel Export Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that the arrivalSlip/index.ts barrel re-exports both
// the API service and React Query hooks.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// File Content Analysis
// ═══════════════════════════════════════════════════════════════

describe('arrivalSlip barrel export (arrivalSlip/index.ts)', () => {
  const indexPath = path.resolve(__dirname, '../../../api/arrivalSlip/index.ts');
  const content = fs.readFileSync(indexPath, 'utf-8');

  it('re-exports arrivalSlip API', () => {
    expect(content).toContain("export * from './arrivalSlip.api'");
  });

  it('re-exports arrivalSlip queries', () => {
    expect(content).toContain("export * from './arrivalSlip.queries'");
  });
});
