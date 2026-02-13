import { describe, it, expect } from 'vitest';
import {
  APP_NAME,
  APP_VERSION,
  APP_DESCRIPTION,
  APP_DEFAULTS,
  THEME_OPTIONS,
} from '@/config/constants/app.constants';

// ═══════════════════════════════════════════════════════════════
// APP_NAME
// ═══════════════════════════════════════════════════════════════

describe('APP_NAME', () => {
  it('is "Sampooran"', () => {
    expect(APP_NAME).toBe('Sampooran');
  });

  it('is a non-empty string', () => {
    expect(typeof APP_NAME).toBe('string');
    expect(APP_NAME.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// APP_VERSION
// ═══════════════════════════════════════════════════════════════

describe('APP_VERSION', () => {
  it('is "1.0.0"', () => {
    expect(APP_VERSION).toBe('1.0.0');
  });

  it('matches semantic version format (x.y.z)', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ═══════════════════════════════════════════════════════════════
// APP_DESCRIPTION
// ═══════════════════════════════════════════════════════════════

describe('APP_DESCRIPTION', () => {
  it('is a non-empty string', () => {
    expect(typeof APP_DESCRIPTION).toBe('string');
    expect(APP_DESCRIPTION.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// APP_DEFAULTS
// ═══════════════════════════════════════════════════════════════

describe('APP_DEFAULTS', () => {
  it('language is "en"', () => {
    expect(APP_DEFAULTS.language).toBe('en');
  });

  it('theme is "system"', () => {
    expect(APP_DEFAULTS.theme).toBe('system');
  });

  it('dateFormat is "DD/MM/YYYY"', () => {
    expect(APP_DEFAULTS.dateFormat).toBe('DD/MM/YYYY');
  });

  it('timeFormat is "HH:mm"', () => {
    expect(APP_DEFAULTS.timeFormat).toBe('HH:mm');
  });

  it('timezone is "Asia/Kolkata"', () => {
    expect(APP_DEFAULTS.timezone).toBe('Asia/Kolkata');
  });
});

// ═══════════════════════════════════════════════════════════════
// THEME_OPTIONS
// ═══════════════════════════════════════════════════════════════

describe('THEME_OPTIONS', () => {
  it('has LIGHT, DARK, and SYSTEM keys', () => {
    expect(THEME_OPTIONS).toHaveProperty('LIGHT');
    expect(THEME_OPTIONS).toHaveProperty('DARK');
    expect(THEME_OPTIONS).toHaveProperty('SYSTEM');
  });

  it('LIGHT is "light", DARK is "dark", SYSTEM is "system"', () => {
    expect(THEME_OPTIONS.LIGHT).toBe('light');
    expect(THEME_OPTIONS.DARK).toBe('dark');
    expect(THEME_OPTIONS.SYSTEM).toBe('system');
  });

  it('default theme matches one of the THEME_OPTIONS values', () => {
    const validThemes = Object.values(THEME_OPTIONS);
    expect(validThemes).toContain(APP_DEFAULTS.theme);
  });
});
