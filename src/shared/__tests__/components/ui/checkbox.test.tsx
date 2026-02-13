import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// Checkbox — File Content Verification Tests
// Source: src/shared/components/ui/checkbox.tsx
//
// Uses readFileSync to validate component structure without importing
// (avoids Vite module resolution hangs from lucide-react dependency chain)
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs');
  const path = require('node:path');
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/checkbox.tsx'),
    'utf-8',
  );
};

describe('Checkbox — File Content Verification', () => {
  let source: string;

  beforeAll(() => {
    source = readSource();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Imports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('imports', () => {
    it('imports React', () => {
      expect(source).toContain("import * as React from 'react'");
    });

    it('imports Check icon from lucide-react', () => {
      expect(source).toMatch(/import\s*\{[^}]*Check[^}]*\}\s*from\s*['"]lucide-react['"]/);
    });

    it('imports cn utility from @/shared/utils', () => {
      expect(source).toContain("import { cn } from '@/shared/utils'");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Exports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('exports', () => {
    it('exports Checkbox as a named export', () => {
      expect(source).toMatch(/export\s*\{[^}]*Checkbox[^}]*\}/);
    });

    it('exports CheckboxProps interface', () => {
      expect(source).toMatch(/export\s+interface\s+CheckboxProps/);
    });

    it('does not use default exports', () => {
      expect(source).not.toMatch(/export\s+default/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CheckboxProps Interface
  // ═══════════════════════════════════════════════════════════════════════════
  describe('CheckboxProps interface', () => {
    it('includes optional checked boolean prop', () => {
      expect(source).toMatch(/checked\?\s*:\s*boolean/);
    });

    it('includes optional onCheckedChange callback with boolean parameter', () => {
      expect(source).toMatch(/onCheckedChange\?\s*:\s*\(checked:\s*boolean\)\s*=>\s*void/);
    });

    it('includes optional disabled prop', () => {
      expect(source).toMatch(/disabled\?\s*:\s*boolean/);
    });

    it('includes optional className prop', () => {
      expect(source).toMatch(/className\?\s*:\s*string/);
    });

    it('includes optional id prop', () => {
      expect(source).toMatch(/id\?\s*:\s*string/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Checkbox Component Structure
  // ═══════════════════════════════════════════════════════════════════════════
  describe('component structure', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+Checkbox\s*=\s*React\.forwardRef/);
    });

    it('forwards ref to HTMLButtonElement', () => {
      expect(source).toContain('React.forwardRef<HTMLButtonElement, CheckboxProps>');
    });

    // ─── Rendered Element ─────────────────────────────────────────────
    it('renders a <button> element', () => {
      expect(source).toContain('<button');
    });

    it('sets type="button" on the button element', () => {
      expect(source).toContain('type="button"');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessibility
  // ═══════════════════════════════════════════════════════════════════════════
  describe('accessibility', () => {
    it('sets role="checkbox" for screen readers', () => {
      expect(source).toContain('role="checkbox"');
    });

    it('sets aria-checked to the checked state', () => {
      expect(source).toContain('aria-checked={checked}');
    });

    it('passes disabled prop to the button', () => {
      expect(source).toContain('disabled={disabled}');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Behavior
  // ═══════════════════════════════════════════════════════════════════════════
  describe('behavior', () => {
    it('toggles checked state via onClick calling onCheckedChange with inverted value', () => {
      expect(source).toContain('onClick={() => onCheckedChange?.(!checked)}');
    });

    it('defaults checked to false', () => {
      expect(source).toMatch(/checked\s*=\s*false/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Check Icon
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Check icon rendering', () => {
    it('conditionally renders Check icon only when checked is true', () => {
      expect(source).toContain('{checked && (');
    });

    it('renders Check icon inside a centering span wrapper', () => {
      expect(source).toContain('flex items-center justify-center');
      expect(source).toContain('<Check');
    });

    it('sizes the Check icon as h-3 w-3', () => {
      expect(source).toContain('<Check className="h-3 w-3"');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Styling
  // ═══════════════════════════════════════════════════════════════════════════
  describe('styling', () => {
    it('applies base sizing and border classes', () => {
      expect(source).toContain('h-4 w-4 shrink-0 rounded-sm border border-primary');
    });

    it('applies focus-visible ring styles', () => {
      expect(source).toContain(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      );
    });

    it('applies disabled cursor and opacity styles', () => {
      expect(source).toContain('disabled:cursor-not-allowed disabled:opacity-50');
    });

    it('applies primary background and foreground when checked', () => {
      expect(source).toContain("checked && 'bg-primary text-primary-foreground'");
    });

    it('uses cn() to merge custom className', () => {
      // The cn() call merges base classes, checked conditional, and className
      expect(source).toMatch(/cn\(\s*['"][^'"]*['"],\s*checked\s*&&/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // displayName
  // ═══════════════════════════════════════════════════════════════════════════
  describe('displayName', () => {
    it('sets displayName to "Checkbox"', () => {
      expect(source).toContain("Checkbox.displayName = 'Checkbox'");
    });
  });
});
