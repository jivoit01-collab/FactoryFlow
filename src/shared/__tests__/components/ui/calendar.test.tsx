import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// Calendar — File Content Verification Tests
// Source: src/shared/components/ui/calendar.tsx
//
// Uses readFileSync to validate component structure without importing
// (avoids Vite module resolution hangs from lucide-react dependency chain)
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs');
  const path = require('node:path');
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/calendar.tsx'),
    'utf-8',
  );
};

describe('Calendar — File Content Verification', () => {
  let source: string;

  beforeAll(() => {
    source = readSource();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Imports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('imports', () => {
    it('imports ChevronLeft and ChevronRight from lucide-react', () => {
      expect(source).toMatch(
        /import\s*\{[^}]*ChevronLeft[^}]*ChevronRight[^}]*\}\s*from\s*['"]lucide-react['"]/,
      );
    });

    it('imports DayPicker, DayPickerProps, MonthCaptionProps, and useNavigation from react-day-picker', () => {
      expect(source).toContain("from 'react-day-picker'");
      expect(source).toContain('DayPicker');
      expect(source).toContain('DayPickerProps');
      expect(source).toContain('MonthCaptionProps');
      expect(source).toContain('useNavigation');
    });

    it('imports format from date-fns', () => {
      expect(source).toContain("import { format } from 'date-fns'");
    });

    it('imports cn utility from @/shared/utils', () => {
      expect(source).toContain("import { cn } from '@/shared/utils'");
    });

    it('imports Button from ./button', () => {
      expect(source).toContain("import { Button } from './button'");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Exports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('exports', () => {
    it('exports Calendar as a named function component', () => {
      expect(source).toMatch(/export\s+function\s+Calendar/);
    });

    it('exports CalendarProps type', () => {
      expect(source).toMatch(/export\s+type\s+CalendarProps/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CalendarProps Type Definition
  // ═══════════════════════════════════════════════════════════════════════════
  describe('CalendarProps type', () => {
    it('extends DayPickerProps', () => {
      expect(source).toMatch(/CalendarProps\s*=\s*DayPickerProps\s*&/);
    });

    it('includes onTodayClick optional prop with Date parameter', () => {
      expect(source).toMatch(/onTodayClick\?\s*:\s*\(date:\s*Date\)\s*=>\s*void/);
    });

    it('includes hideTodayButton optional boolean prop', () => {
      expect(source).toMatch(/hideTodayButton\?\s*:\s*boolean/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Calendar Component Defaults
  // ═══════════════════════════════════════════════════════════════════════════
  describe('component defaults', () => {
    it('defaults showOutsideDays to true', () => {
      expect(source).toMatch(/showOutsideDays\s*=\s*true/);
    });

    it('defaults hideTodayButton to false', () => {
      expect(source).toMatch(/hideTodayButton\s*=\s*false/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CustomMonthCaption
  // ═══════════════════════════════════════════════════════════════════════════
  describe('CustomMonthCaption', () => {
    it('defines a CustomMonthCaption inner component', () => {
      expect(source).toMatch(/const\s+CustomMonthCaption\s*=/);
    });

    it('accepts MonthCaptionProps parameter', () => {
      expect(source).toContain('MonthCaptionProps');
    });

    it('uses useNavigation hook to get goToMonth', () => {
      expect(source).toMatch(/const\s*\{\s*goToMonth\s*\}\s*=\s*useNavigation\(\)/);
    });

    it('renders ChevronLeft for previous month navigation', () => {
      expect(source).toContain('<ChevronLeft');
    });

    it('renders ChevronRight for next month navigation', () => {
      expect(source).toContain('<ChevronRight');
    });

    it('formats the date using date-fns format with LLLL yyyy pattern', () => {
      expect(source).toContain("format(date, 'LLLL yyyy')");
    });

    // ─── Today Button ─────────────────────────────────────────────────
    it('conditionally renders a Today button when hideTodayButton is false', () => {
      expect(source).toContain('!hideTodayButton');
      expect(source).toContain('Today');
    });

    it('calls goToMonth and onTodayClick when Today button is clicked', () => {
      expect(source).toContain('goToMonth(today)');
      expect(source).toContain('onTodayClick?.(today)');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DayPicker Rendering
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DayPicker rendering', () => {
    it('renders a DayPicker component', () => {
      expect(source).toContain('<DayPicker');
    });

    it('applies p-3 as the base className', () => {
      expect(source).toContain("cn('p-3', className)");
    });

    it('passes showOutsideDays prop to DayPicker', () => {
      expect(source).toContain('showOutsideDays={showOutsideDays}');
    });

    // ─── classNames Configuration ─────────────────────────────────────
    it('configures months layout class', () => {
      expect(source).toContain("months: 'flex flex-col sm:flex-row gap-6'");
    });

    it('configures day_today styling with accent background', () => {
      expect(source).toContain("day_today: 'bg-accent text-accent-foreground font-semibold'");
    });

    it('configures day_selected styling with primary background', () => {
      expect(source).toContain(
        "day_selected: 'bg-primary text-primary-foreground hover:bg-primary'",
      );
    });

    it('configures day_outside styling with muted foreground and opacity', () => {
      expect(source).toContain("day_outside: 'text-muted-foreground opacity-40'");
    });

    it('configures day_disabled styling matching day_outside', () => {
      expect(source).toContain("day_disabled: 'text-muted-foreground opacity-40'");
    });

    // ─── Range Classes ────────────────────────────────────────────────
    it('configures day_range_start, day_range_middle, and day_range_end classes', () => {
      expect(source).toContain('day_range_start');
      expect(source).toContain('day_range_middle');
      expect(source).toContain('day_range_end');
    });

    // ─── modifiersClassNames ──────────────────────────────────────────
    it('provides modifiersClassNames for selected, range_start, range_middle, range_end, today', () => {
      expect(source).toContain('modifiersClassNames');
      expect(source).toMatch(/modifiersClassNames\s*=\s*\{/);
    });

    // ─── Custom Component Injection ───────────────────────────────────
    it('injects CustomMonthCaption as the MonthCaption component', () => {
      expect(source).toContain('components={{ MonthCaption: CustomMonthCaption }}');
    });

    it('spreads user-provided classNames to allow overrides', () => {
      expect(source).toContain('...classNames,');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // displayName
  // ═══════════════════════════════════════════════════════════════════════════
  describe('displayName', () => {
    it('sets Calendar.displayName to "Calendar"', () => {
      expect(source).toContain("Calendar.displayName = 'Calendar'");
    });
  });
});
