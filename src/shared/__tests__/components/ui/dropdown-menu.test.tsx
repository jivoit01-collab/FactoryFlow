import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// DropdownMenu — File Content Verification Tests
// Source: src/shared/components/ui/dropdown-menu.tsx
//
// Uses readFileSync to validate component structure without importing
// (avoids Vite module resolution hangs from lucide-react dependency chain)
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs');
  const path = require('node:path');
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/dropdown-menu.tsx'),
    'utf-8',
  );
};

describe('DropdownMenu — File Content Verification', () => {
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

    it('imports DropdownMenuPrimitive from @radix-ui/react-dropdown-menu', () => {
      expect(source).toContain(
        "import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'",
      );
    });

    it('imports Check, ChevronRight, and Circle from lucide-react', () => {
      expect(source).toMatch(/import\s*\{[^}]*Check[^}]*\}\s*from\s*['"]lucide-react['"]/);
      expect(source).toMatch(/import\s*\{[^}]*ChevronRight[^}]*\}\s*from\s*['"]lucide-react['"]/);
      expect(source).toMatch(/import\s*\{[^}]*Circle[^}]*\}\s*from\s*['"]lucide-react['"]/);
    });

    it('imports cn utility from @/shared/utils', () => {
      expect(source).toContain("import { cn } from '@/shared/utils'");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Exports (15 components)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('exports', () => {
    const expectedExports = [
      'DropdownMenu',
      'DropdownMenuTrigger',
      'DropdownMenuContent',
      'DropdownMenuItem',
      'DropdownMenuCheckboxItem',
      'DropdownMenuRadioItem',
      'DropdownMenuLabel',
      'DropdownMenuSeparator',
      'DropdownMenuShortcut',
      'DropdownMenuGroup',
      'DropdownMenuPortal',
      'DropdownMenuSub',
      'DropdownMenuSubContent',
      'DropdownMenuSubTrigger',
      'DropdownMenuRadioGroup',
    ];

    expectedExports.forEach((exportName) => {
      it(`exports ${exportName}`, () => {
        expect(source).toMatch(new RegExp(`export\\s*\\{[^}]*\\b${exportName}\\b[^}]*\\}`));
      });
    });

    it('exports exactly 15 components in the export block', () => {
      const exportMatch = source.match(/export\s*\{([^}]+)\}/);
      expect(exportMatch).not.toBeNull();
      const exportedNames = exportMatch![1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      expect(exportedNames).toHaveLength(15);
    });

    it('does not use default exports', () => {
      expect(source).not.toMatch(/export\s+default/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Direct Primitive Assignments
  // ═══════════════════════════════════════════════════════════════════════════
  describe('primitive assignments', () => {
    it('assigns DropdownMenu to DropdownMenuPrimitive.Root', () => {
      expect(source).toMatch(/const\s+DropdownMenu\s*=\s*DropdownMenuPrimitive\.Root/);
    });

    it('assigns DropdownMenuTrigger to DropdownMenuPrimitive.Trigger', () => {
      expect(source).toMatch(/const\s+DropdownMenuTrigger\s*=\s*DropdownMenuPrimitive\.Trigger/);
    });

    it('assigns DropdownMenuGroup to DropdownMenuPrimitive.Group', () => {
      expect(source).toMatch(/const\s+DropdownMenuGroup\s*=\s*DropdownMenuPrimitive\.Group/);
    });

    it('assigns DropdownMenuPortal to DropdownMenuPrimitive.Portal', () => {
      expect(source).toMatch(/const\s+DropdownMenuPortal\s*=\s*DropdownMenuPrimitive\.Portal/);
    });

    it('assigns DropdownMenuSub to DropdownMenuPrimitive.Sub', () => {
      expect(source).toMatch(/const\s+DropdownMenuSub\s*=\s*DropdownMenuPrimitive\.Sub/);
    });

    it('assigns DropdownMenuRadioGroup to DropdownMenuPrimitive.RadioGroup', () => {
      expect(source).toMatch(
        /const\s+DropdownMenuRadioGroup\s*=\s*DropdownMenuPrimitive\.RadioGroup/,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DropdownMenuSubTrigger — forwardRef with inset
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DropdownMenuSubTrigger', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DropdownMenuSubTrigger\s*=\s*React\.forwardRef/);
    });

    it('wraps DropdownMenuPrimitive.SubTrigger', () => {
      expect(source).toContain('<DropdownMenuPrimitive.SubTrigger');
    });

    it('accepts an inset prop for left padding', () => {
      expect(source).toMatch(/inset\?\s*:\s*boolean/);
      expect(source).toContain("inset && 'pl-8'");
    });

    it('renders a ChevronRight icon with ml-auto positioning', () => {
      expect(source).toContain('<ChevronRight className="ml-auto h-4 w-4"');
    });

    it('sets displayName to DropdownMenuPrimitive.SubTrigger.displayName', () => {
      expect(source).toContain(
        'DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DropdownMenuSubContent — forwardRef
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DropdownMenuSubContent', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DropdownMenuSubContent\s*=\s*React\.forwardRef/);
    });

    it('wraps DropdownMenuPrimitive.SubContent', () => {
      expect(source).toContain('<DropdownMenuPrimitive.SubContent');
    });

    it('includes animation classes for open/close states', () => {
      expect(source).toMatch(/DropdownMenuSubContent[\s\S]*data-\[state=open\]:animate-in/);
      expect(source).toMatch(/DropdownMenuSubContent[\s\S]*data-\[state=closed\]:animate-out/);
    });

    it('sets displayName to DropdownMenuPrimitive.SubContent.displayName', () => {
      expect(source).toContain(
        'DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DropdownMenuContent — forwardRef with Portal
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DropdownMenuContent', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DropdownMenuContent\s*=\s*React\.forwardRef/);
    });

    it('wraps content inside DropdownMenuPrimitive.Portal', () => {
      expect(source).toContain('<DropdownMenuPrimitive.Portal>');
    });

    it('wraps DropdownMenuPrimitive.Content', () => {
      expect(source).toContain('<DropdownMenuPrimitive.Content');
    });

    it('has default sideOffset of 4', () => {
      expect(source).toMatch(/sideOffset\s*=\s*4/);
    });

    it('applies z-50 min-w-[8rem] base classes', () => {
      expect(source).toContain('z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover');
    });

    it('includes directional slide-in animations', () => {
      expect(source).toContain('data-[side=bottom]:slide-in-from-top-2');
      expect(source).toContain('data-[side=left]:slide-in-from-right-2');
      expect(source).toContain('data-[side=right]:slide-in-from-left-2');
      expect(source).toContain('data-[side=top]:slide-in-from-bottom-2');
    });

    it('sets displayName to DropdownMenuPrimitive.Content.displayName', () => {
      expect(source).toContain(
        'DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DropdownMenuItem — forwardRef with inset
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DropdownMenuItem', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DropdownMenuItem\s*=\s*React\.forwardRef/);
    });

    it('wraps DropdownMenuPrimitive.Item', () => {
      expect(source).toContain('<DropdownMenuPrimitive.Item');
    });

    it('accepts an inset prop for left padding', () => {
      // Verify it appears in the DropdownMenuItem context (prop type definition)
      expect(source).toMatch(/DropdownMenuPrimitive\.Item[\s\S]*?inset\?\s*:\s*boolean/);
    });

    it('applies focus:bg-accent styles for keyboard navigation', () => {
      expect(source).toContain('focus:bg-accent focus:text-accent-foreground');
    });

    it('applies data-[disabled] styles for disabled state', () => {
      expect(source).toContain('data-[disabled]:pointer-events-none data-[disabled]:opacity-50');
    });

    it('sets displayName to DropdownMenuPrimitive.Item.displayName', () => {
      expect(source).toContain(
        'DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DropdownMenuCheckboxItem — forwardRef with Check icon
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DropdownMenuCheckboxItem', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DropdownMenuCheckboxItem\s*=\s*React\.forwardRef/);
    });

    it('wraps DropdownMenuPrimitive.CheckboxItem', () => {
      expect(source).toContain('<DropdownMenuPrimitive.CheckboxItem');
    });

    it('uses DropdownMenuPrimitive.ItemIndicator to wrap the Check icon', () => {
      expect(source).toContain('<DropdownMenuPrimitive.ItemIndicator>');
    });

    it('renders a Check icon with h-4 w-4 sizing', () => {
      expect(source).toContain('<Check className="h-4 w-4"');
    });

    it('positions the indicator at absolute left-2', () => {
      expect(source).toContain('absolute left-2 flex h-3.5 w-3.5 items-center justify-center');
    });

    it('sets displayName to DropdownMenuPrimitive.CheckboxItem.displayName', () => {
      expect(source).toContain(
        'DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DropdownMenuRadioItem — forwardRef with Circle icon
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DropdownMenuRadioItem', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DropdownMenuRadioItem\s*=\s*React\.forwardRef/);
    });

    it('wraps DropdownMenuPrimitive.RadioItem', () => {
      expect(source).toContain('<DropdownMenuPrimitive.RadioItem');
    });

    it('renders a Circle icon with h-2 w-2 fill-current styling', () => {
      expect(source).toContain('<Circle className="h-2 w-2 fill-current"');
    });

    it('sets displayName to DropdownMenuPrimitive.RadioItem.displayName', () => {
      expect(source).toContain(
        'DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DropdownMenuLabel — forwardRef with inset
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DropdownMenuLabel', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DropdownMenuLabel\s*=\s*React\.forwardRef/);
    });

    it('wraps DropdownMenuPrimitive.Label', () => {
      expect(source).toContain('<DropdownMenuPrimitive.Label');
    });

    it('applies font-semibold styling', () => {
      expect(source).toContain('px-2 py-1.5 text-sm font-semibold');
    });

    it('accepts an inset prop for left padding', () => {
      expect(source).toMatch(/DropdownMenuPrimitive\.Label[\s\S]*?inset\?\s*:\s*boolean/);
    });

    it('sets displayName to DropdownMenuPrimitive.Label.displayName', () => {
      expect(source).toContain(
        'DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DropdownMenuSeparator — forwardRef
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DropdownMenuSeparator', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DropdownMenuSeparator\s*=\s*React\.forwardRef/);
    });

    it('wraps DropdownMenuPrimitive.Separator', () => {
      expect(source).toContain('<DropdownMenuPrimitive.Separator');
    });

    it('applies negative margin and muted background', () => {
      expect(source).toContain('-mx-1 my-1 h-px bg-muted');
    });

    it('sets displayName to DropdownMenuPrimitive.Separator.displayName', () => {
      expect(source).toContain(
        'DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DropdownMenuShortcut — Plain Function Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DropdownMenuShortcut', () => {
    it('is a plain function component (not forwardRef)', () => {
      expect(source).toMatch(/const\s+DropdownMenuShortcut\s*=\s*\(/);
      expect(source).not.toMatch(/const\s+DropdownMenuShortcut\s*=\s*React\.forwardRef/);
    });

    it('renders a span element', () => {
      expect(source).toMatch(/DropdownMenuShortcut[\s\S]*?<span/);
    });

    it('applies ml-auto text-xs tracking-widest opacity-60 classes', () => {
      expect(source).toContain('ml-auto text-xs tracking-widest opacity-60');
    });

    it('sets displayName to "DropdownMenuShortcut"', () => {
      expect(source).toContain("DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'");
    });
  });
});
