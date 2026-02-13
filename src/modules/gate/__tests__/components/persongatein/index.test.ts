import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// Tests — components/persongatein/index.ts barrel re-exports (FCV)
// ═══════════════════════════════════════════════════════════════
// Dynamic import of persongatein components triggers deep dependency
// chains that hang Vite's module graph resolver. File-content
// verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('persongatein/index barrel exports', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/persongatein/index.ts'),
    'utf-8',
  );

  it('exports VisitorSelect', () => {
    expect(content).toContain("export { VisitorSelect } from './VisitorSelect'");
  });

  it('exports LabourSelect', () => {
    expect(content).toContain("export { LabourSelect } from './LabourSelect'");
  });

  it('exports GateSelect', () => {
    expect(content).toContain("export { GateSelect } from './GateSelect'");
  });

  it('exports CreateVisitorDialog', () => {
    expect(content).toContain("export { CreateVisitorDialog } from './CreateVisitorDialog'");
  });

  it('exports CreateLabourDialog', () => {
    expect(content).toContain("export { CreateLabourDialog } from './CreateLabourDialog'");
  });
});
