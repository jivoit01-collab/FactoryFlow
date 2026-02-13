import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// Switch Component — File Content Verification
// ═══════════════════════════════════════════════════════════════════════════════
// Validates the Switch component's structure, accessibility attributes, toggle
// behavior, animation classes, and exports without importing it directly.
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs');
  const path = require('node:path');
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/switch.tsx'),
    'utf-8',
  );
};

describe('shared/components/ui/switch.tsx — file content verification', () => {
  const source = readSource();

  // ═══════════════════════════════════════════════════════════════════════════
  // Imports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('imports', () => {
    it('imports React', () => {
      expect(source).toMatch(/import\s+\*\s+as\s+React\s+from\s+['"]react['"]/);
    });

    it('imports cn utility from @/shared/utils', () => {
      expect(source).toMatch(/import\s*\{\s*cn\s*\}\s*from\s*['"]@\/shared\/utils['"]/);
    });

    it('does NOT depend on Radix UI (custom implementation)', () => {
      expect(source).not.toContain('@radix-ui');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SwitchProps interface
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SwitchProps interface', () => {
    it('exports SwitchProps as an interface', () => {
      expect(source).toMatch(/export\s+interface\s+SwitchProps/);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Required props
    // ─────────────────────────────────────────────────────────────────────────
    it('requires checked: boolean', () => {
      expect(source).toMatch(/checked:\s*boolean/);
    });

    it('requires onChange callback that receives checked state', () => {
      expect(source).toMatch(/onChange:\s*\(checked:\s*boolean\)\s*=>\s*void/);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Optional props
    // ─────────────────────────────────────────────────────────────────────────
    it('declares optional disabled prop', () => {
      expect(source).toMatch(/disabled\?:\s*boolean/);
    });

    it('declares optional className prop', () => {
      expect(source).toMatch(/className\?:\s*string/);
    });

    it('declares optional id prop', () => {
      expect(source).toMatch(/id\?:\s*string/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Component definition
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Switch component', () => {
    it('is created with React.forwardRef targeting HTMLButtonElement', () => {
      expect(source).toMatch(
        /const\s+Switch\s*=\s*React\.forwardRef<HTMLButtonElement\s*,\s*SwitchProps>/,
      );
    });

    it('renders a <button> element as the root', () => {
      expect(source).toMatch(/<button[\s\n]/);
    });

    it('sets type="button" to prevent form submission', () => {
      expect(source).toContain('type="button"');
    });

    it('sets displayName to "Switch"', () => {
      expect(source).toContain("Switch.displayName = 'Switch'");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessibility (ARIA)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('accessibility', () => {
    it('assigns role="switch" for screen readers', () => {
      expect(source).toContain('role="switch"');
    });

    it('binds aria-checked to the checked prop', () => {
      expect(source).toContain('aria-checked={checked}');
    });

    it('supports disabled state via the disabled prop', () => {
      expect(source).toContain('disabled={disabled}');
    });

    it('passes id for label association', () => {
      expect(source).toContain('id={id}');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Toggle behavior
  // ═══════════════════════════════════════════════════════════════════════════
  describe('toggle behavior', () => {
    it('inverts checked state on click via onChange(!checked)', () => {
      expect(source).toMatch(/onClick=\{.*onChange\(!checked\).*\}/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Styling — track (outer button)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('track styling', () => {
    it('has pill shape with h-6 w-11 rounded-full', () => {
      expect(source).toContain('h-6 w-11');
      expect(source).toContain('rounded-full');
    });

    it('uses bg-primary when checked, bg-input when unchecked', () => {
      expect(source).toMatch(/checked\s*\?\s*['"]bg-primary['"]/);
      expect(source).toContain("'bg-input'");
    });

    it('applies cursor-not-allowed and opacity-50 when disabled', () => {
      expect(source).toContain('cursor-not-allowed');
      expect(source).toContain('opacity-50');
    });

    it('includes smooth transition with duration-200 ease-in-out', () => {
      expect(source).toContain('transition-colors duration-200 ease-in-out');
    });

    it('includes focus-visible ring for keyboard navigation', () => {
      expect(source).toContain('focus-visible:ring-2');
      expect(source).toContain('focus-visible:ring-ring');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Styling — thumb (inner span)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('thumb styling', () => {
    it('renders an inner <span> for the thumb', () => {
      expect(source).toMatch(/<span[\s\n]/);
    });

    it('has circular shape with h-5 w-5 rounded-full', () => {
      expect(source).toContain('h-5 w-5');
      // Both track and thumb use rounded-full
      expect((source.match(/rounded-full/g) ?? []).length).toBeGreaterThanOrEqual(2);
    });

    it('translates right (translate-x-5) when checked', () => {
      expect(source).toContain('translate-x-5');
    });

    it('stays at origin (translate-x-0) when unchecked', () => {
      expect(source).toContain('translate-x-0');
    });

    it('conditionally applies translation based on checked state', () => {
      expect(source).toMatch(/checked\s*\?\s*['"]translate-x-5['"]\s*:\s*['"]translate-x-0['"]/);
    });

    it('uses pointer-events-none so clicks pass through to the button', () => {
      expect(source).toContain('pointer-events-none');
    });

    it('includes shadow-lg for elevation', () => {
      expect(source).toContain('shadow-lg');
    });

    it('uses bg-background for the thumb color', () => {
      expect(source).toContain('bg-background');
    });

    it('includes smooth transition with duration-200 ease-in-out', () => {
      // The thumb has its own transition
      const thumbSection = source.substring(source.indexOf('<span'));
      expect(thumbSection).toContain('transition duration-200 ease-in-out');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Exports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('exports', () => {
    it('exports Switch as a named export', () => {
      expect(source).toMatch(/export\s*\{\s*Switch\s*\}/);
    });

    it('exports SwitchProps at the interface level', () => {
      expect(source).toMatch(/export\s+interface\s+SwitchProps/);
    });
  });
});
