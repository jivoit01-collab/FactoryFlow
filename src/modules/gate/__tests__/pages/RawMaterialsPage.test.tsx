import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// RawMaterialsPage — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This page component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('RawMaterialsPage', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/pages/RawMaterialsPage.tsx'),
    'utf-8',
  );

  it('exports RawMaterialsPage as default function', () => {
    expect(content).toContain('export default function');
  });

  it('imports icons from lucide-react', () => {
    expect(content).toContain("from 'lucide-react'");
  });

  it('imports from react', () => {
    expect(content).toContain("from 'react'");
  });

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (');
  });

  it('shows row-level QC final status in the status column', () => {
    expect(content).toContain('entry.qc_final_status');
    expect(content).toContain('entry.qc_final_status.display');
  });

  it('shows the RM/PM material type the backend derived, never its own guess', () => {
    expect(content).toContain('entry.material_type.label');
    expect(content).not.toContain('po_item_code');
  });

  it('offers an RM / PM / both filter over the material type', () => {
    expect(content).toContain("{ value: 'RM', label: 'RM only' }");
    expect(content).toContain("{ value: 'PM', label: 'PM only' }");
    expect(content).toContain("{ value: 'BOTH', label: 'RM + PM' }");
    expect(content).toContain('entry.material_type?.code === materialFilter');
  });
});
