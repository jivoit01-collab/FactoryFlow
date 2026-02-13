import { describe, it, expect, vi } from 'vitest';

// Mock ALL heavy dependencies to prevent resolution hangs
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

const DummyIcon = () => null;
vi.mock(
  'lucide-react',
  () =>
    new Proxy(
      { __esModule: true },
      {
        get: (_t, p) => (p === '__esModule' ? true : DummyIcon),
      },
    ),
);

vi.mock('@/config/constants', () => ({
  DEBOUNCE_DELAY: { search: 300, input: 150, resize: 100 },
  APP_DEFAULTS: { dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm' },
}));

// Mock ALL individual UI sub-module files to prevent Radix UI resolution
const mkProxy = () =>
  new Proxy(
    { __esModule: true },
    {
      get: (_t: any, p: string) => (p === '__esModule' ? true : () => null),
    },
  );
vi.mock('@/shared/components/ui/button', () => mkProxy());
vi.mock('@/shared/components/ui/card', () => mkProxy());
vi.mock('@/shared/components/ui/input', () => mkProxy());
vi.mock('@/shared/components/ui/label', () => mkProxy());
vi.mock('@/shared/components/ui/sheet', () => mkProxy());
vi.mock('@/shared/components/ui/separator', () => mkProxy());
vi.mock('@/shared/components/ui/avatar', () => mkProxy());
vi.mock('@/shared/components/ui/dialog', () => mkProxy());
vi.mock('@/shared/components/ui/dropdown-menu', () => mkProxy());
vi.mock('@/shared/components/ui/tooltip', () => mkProxy());
vi.mock('@/shared/components/ui/badge', () => mkProxy());
vi.mock('@/shared/components/ui/collapsible', () => mkProxy());
vi.mock('@/shared/components/ui/popover', () => mkProxy());
vi.mock('@/shared/components/ui/calendar', () => mkProxy());
vi.mock('@/shared/components/ui/switch', () => mkProxy());
vi.mock('@/shared/components/ui/checkbox', () => mkProxy());
vi.mock('@/shared/components/ui/textarea', () => mkProxy());

describe('Shared Components Index structure', () => {
  it('shared/components/index.ts contains expected re-export statements', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const content = readFileSync(resolve(process.cwd(), 'src/shared/components/index.ts'), 'utf-8');

    // Verify dashboard re-export
    expect(content).toContain("export * from './dashboard'");
    // Verify UI re-export
    expect(content).toContain("export * from './ui'");
    // Verify ErrorBoundary
    expect(content).toContain('ErrorBoundary');
    // Verify PageLoadError
    expect(content).toContain('PageLoadError');
    // Verify SearchableSelect
    expect(content).toContain('SearchableSelect');
  });
});
