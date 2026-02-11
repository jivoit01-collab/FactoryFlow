import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// UI Barrel Index — File Content Verification
// ═══════════════════════════════════════════════════════════════════════════════
// Validates that the shared/components/ui/index.ts barrel re-exports every
// expected symbol from every UI sub-module.  Direct import is avoided because
// Radix UI / shadcn primitives pull in a heavy dependency graph that causes
// Vite to hang during test resolution.
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs')
  const path = require('node:path')
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/index.ts'),
    'utf-8',
  )
}

describe('shared/components/ui/index.ts — barrel re-exports', () => {
  const source = readSource()

  // ═══════════════════════════════════════════════════════════════════════════
  // Button
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Button exports', () => {
    it('re-exports Button, buttonVariants, and ButtonProps from ./button', () => {
      expect(source).toContain('Button')
      expect(source).toContain('buttonVariants')
      expect(source).toContain('type ButtonProps')
      expect(source).toMatch(/export\s*\{[^}]*Button[^}]*\}\s*from\s*['"]\.\/button['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Card
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Card exports', () => {
    it('re-exports all Card sub-components from ./card', () => {
      const cardExports = [
        'Card',
        'CardHeader',
        'CardFooter',
        'CardTitle',
        'CardDescription',
        'CardContent',
      ]
      for (const name of cardExports) {
        expect(source).toContain(name)
      }
      expect(source).toMatch(/export\s*\{[^}]*Card[^}]*\}\s*from\s*['"]\.\/card['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Input
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Input exports', () => {
    it('re-exports Input and InputProps from ./input', () => {
      expect(source).toContain('Input')
      expect(source).toContain('type InputProps')
      expect(source).toMatch(/export\s*\{[^}]*Input[^}]*\}\s*from\s*['"]\.\/input['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Label
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Label exports', () => {
    it('re-exports Label from ./label', () => {
      expect(source).toMatch(/export\s*\{\s*Label\s*\}\s*from\s*['"]\.\/label['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Sheet
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Sheet exports', () => {
    it('re-exports all Sheet sub-components from ./sheet', () => {
      const sheetExports = [
        'Sheet',
        'SheetPortal',
        'SheetOverlay',
        'SheetTrigger',
        'SheetClose',
        'SheetContent',
        'SheetHeader',
        'SheetFooter',
        'SheetTitle',
        'SheetDescription',
      ]
      for (const name of sheetExports) {
        expect(source).toContain(name)
      }
      expect(source).toMatch(/from\s*['"]\.\/sheet['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Separator
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Separator exports', () => {
    it('re-exports Separator from ./separator', () => {
      expect(source).toMatch(/export\s*\{\s*Separator\s*\}\s*from\s*['"]\.\/separator['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Avatar
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Avatar exports', () => {
    it('re-exports Avatar, AvatarImage, AvatarFallback from ./avatar', () => {
      const avatarExports = ['Avatar', 'AvatarImage', 'AvatarFallback']
      for (const name of avatarExports) {
        expect(source).toContain(name)
      }
      expect(source).toMatch(/export\s*\{[^}]*Avatar[^}]*\}\s*from\s*['"]\.\/avatar['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Dialog
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Dialog exports', () => {
    it('re-exports all Dialog sub-components from ./dialog', () => {
      const dialogExports = [
        'Dialog',
        'DialogPortal',
        'DialogOverlay',
        'DialogClose',
        'DialogTrigger',
        'DialogContent',
        'DialogHeader',
        'DialogFooter',
        'DialogTitle',
        'DialogDescription',
      ]
      for (const name of dialogExports) {
        expect(source).toContain(name)
      }
      expect(source).toMatch(/from\s*['"]\.\/dialog['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // DropdownMenu
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DropdownMenu exports', () => {
    it('re-exports all DropdownMenu sub-components from ./dropdown-menu', () => {
      const dropdownExports = [
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
      ]
      for (const name of dropdownExports) {
        expect(source).toContain(name)
      }
      expect(source).toMatch(/from\s*['"]\.\/dropdown-menu['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Tooltip
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Tooltip exports', () => {
    it('re-exports Tooltip, TooltipTrigger, TooltipContent, TooltipProvider from ./tooltip', () => {
      const tooltipExports = ['Tooltip', 'TooltipTrigger', 'TooltipContent', 'TooltipProvider']
      for (const name of tooltipExports) {
        expect(source).toContain(name)
      }
      expect(source).toMatch(/export\s*\{[^}]*Tooltip[^}]*\}\s*from\s*['"]\.\/tooltip['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Badge
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Badge exports', () => {
    it('re-exports Badge, badgeVariants, and BadgeProps from ./badge', () => {
      expect(source).toContain('Badge')
      expect(source).toContain('badgeVariants')
      expect(source).toContain('type BadgeProps')
      expect(source).toMatch(/export\s*\{[^}]*Badge[^}]*\}\s*from\s*['"]\.\/badge['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Collapsible
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Collapsible exports', () => {
    it('re-exports Collapsible, CollapsibleTrigger, CollapsibleContent from ./collapsible', () => {
      const collapsibleExports = ['Collapsible', 'CollapsibleTrigger', 'CollapsibleContent']
      for (const name of collapsibleExports) {
        expect(source).toContain(name)
      }
      expect(source).toMatch(
        /export\s*\{[^}]*Collapsible[^}]*\}\s*from\s*['"]\.\/collapsible['"]/,
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Popover
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Popover exports', () => {
    it('re-exports Popover, PopoverTrigger, PopoverContent from ./popover', () => {
      const popoverExports = ['Popover', 'PopoverTrigger', 'PopoverContent']
      for (const name of popoverExports) {
        expect(source).toContain(name)
      }
      expect(source).toMatch(/export\s*\{[^}]*Popover[^}]*\}\s*from\s*['"]\.\/popover['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Calendar
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Calendar exports', () => {
    it('re-exports Calendar and CalendarProps from ./calendar', () => {
      expect(source).toContain('Calendar')
      expect(source).toContain('type CalendarProps')
      expect(source).toMatch(/export\s*\{[^}]*Calendar[^}]*\}\s*from\s*['"]\.\/calendar['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Switch
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Switch exports', () => {
    it('re-exports Switch and SwitchProps from ./switch', () => {
      expect(source).toContain('Switch')
      expect(source).toContain('type SwitchProps')
      expect(source).toMatch(/export\s*\{[^}]*Switch[^}]*\}\s*from\s*['"]\.\/switch['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Checkbox
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Checkbox exports', () => {
    it('re-exports Checkbox and CheckboxProps from ./checkbox', () => {
      expect(source).toContain('Checkbox')
      expect(source).toContain('type CheckboxProps')
      expect(source).toMatch(/export\s*\{[^}]*Checkbox[^}]*\}\s*from\s*['"]\.\/checkbox['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Textarea
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Textarea exports', () => {
    it('re-exports Textarea and TextareaProps from ./textarea', () => {
      expect(source).toContain('Textarea')
      expect(source).toContain('type TextareaProps')
      expect(source).toMatch(/export\s*\{[^}]*Textarea[^}]*\}\s*from\s*['"]\.\/textarea['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Structural integrity
  // ═══════════════════════════════════════════════════════════════════════════
  describe('structural integrity', () => {
    it('contains only re-export statements (no logic or side effects)', () => {
      const nonEmptyLines = source
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0)
      for (const line of nonEmptyLines) {
        expect(line).toMatch(/^export\s*\{|^\s*\w|^\}\s*from/)
      }
    })

    it('re-exports from exactly 17 sub-modules', () => {
      const fromClauses = source.match(/from\s*['"]\.\/[^'"]+['"]/g) ?? []
      expect(fromClauses).toHaveLength(17)
    })
  })
})
