import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('dark mode form control visibility', () => {
  it('keeps native form fields on theme-aware background and text colors', () => {
    const css = readFileSync(resolve(root, 'src/index.css'), 'utf8');

    expect(css).toContain("input:not([type='checkbox']):not([type='radio'])");
    expect(css).toContain('textarea,');
    expect(css).toContain('select {');
    expect(css).toContain('@apply bg-background text-foreground;');
    // Native controls must track the app's manual theme (light by default, dark
    // under `.dark`) rather than the OS `prefers-color-scheme`, so the native
    // date-picker text/icon stays visible in light mode.
    expect(css).toContain('color-scheme: light;');
    expect(css).toContain('color-scheme: dark;');
    expect(css).not.toContain('color-scheme: light dark;');
    expect(css).toContain(".dark input:not([type='checkbox']):not([type='radio'])");
    expect(css).toContain('option {');
  });

  it('uses theme-aware styling for shared native and radix select controls', () => {
    const nativeSelect = readFileSync(
      resolve(root, 'src/shared/components/ui/native-select.tsx'),
      'utf8',
    );
    const radixSelect = readFileSync(resolve(root, 'src/shared/components/ui/select.tsx'), 'utf8');

    expect(nativeSelect).toContain('bg-background');
    expect(nativeSelect).toContain('text-foreground');
    expect(radixSelect).toContain('bg-background');
    expect(radixSelect).toContain('text-foreground');
  });
});
