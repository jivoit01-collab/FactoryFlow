import { describe, it, expect } from 'vitest';

describe('Auth Module Index Exports', () => {
  it('index.ts contains expected re-export statements', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const content = readFileSync(resolve(process.cwd(), 'src/modules/auth/index.ts'), 'utf-8');

    // Verify LoginPage re-export
    expect(content).toContain('LoginPage');
    // Verify LoginForm re-export
    expect(content).toContain('LoginForm');
    // Verify loginSchema re-export
    expect(content).toContain('loginSchema');
    // Verify LoginFormData type re-export
    expect(content).toContain('LoginFormData');
  });
});
