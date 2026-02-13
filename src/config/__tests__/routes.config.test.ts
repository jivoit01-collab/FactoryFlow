import { describe, it, expect } from 'vitest';
import { ROUTES } from '@/config/routes.config';

// ═══════════════════════════════════════════════════════════════
// ROUTES — Structure
// ═══════════════════════════════════════════════════════════════

describe('ROUTES — Structure', () => {
  it('has all expected top-level route keys', () => {
    expect(ROUTES).toHaveProperty('LOGIN');
    expect(ROUTES).toHaveProperty('COMPANY_SELECTION');
    expect(ROUTES).toHaveProperty('LOADING_USER');
    expect(ROUTES).toHaveProperty('UNAUTHORIZED');
    expect(ROUTES).toHaveProperty('DASHBOARD');
    expect(ROUTES).toHaveProperty('GATE');
    expect(ROUTES).toHaveProperty('NOTIFICATIONS');
    expect(ROUTES).toHaveProperty('PROFILE');
  });
});

// ═══════════════════════════════════════════════════════════════
// Public routes
// ═══════════════════════════════════════════════════════════════

describe('ROUTES — Public routes', () => {
  it('LOGIN path is "/login" and showInSidebar is false', () => {
    expect(ROUTES.LOGIN.path).toBe('/login');
    expect(ROUTES.LOGIN.showInSidebar).toBe(false);
  });

  it('COMPANY_SELECTION path is "/select-company"', () => {
    expect(ROUTES.COMPANY_SELECTION.path).toBe('/select-company');
  });

  it('LOADING_USER path is "/loading-user"', () => {
    expect(ROUTES.LOADING_USER.path).toBe('/loading-user');
  });

  it('UNAUTHORIZED path is "/unauthorized"', () => {
    expect(ROUTES.UNAUTHORIZED.path).toBe('/unauthorized');
  });
});

// ═══════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════

describe('ROUTES — Dashboard', () => {
  it('path is "/"', () => {
    expect(ROUTES.DASHBOARD.path).toBe('/');
  });

  it('has permissions array', () => {
    expect(Array.isArray(ROUTES.DASHBOARD.permissions)).toBe(true);
    expect(ROUTES.DASHBOARD.permissions!.length).toBeGreaterThan(0);
  });

  it('has icon and showInSidebar true', () => {
    expect(ROUTES.DASHBOARD.icon).toBeDefined();
    expect(ROUTES.DASHBOARD.showInSidebar).toBe(true);
  });

  it('has modulePrefix "gatein"', () => {
    expect(ROUTES.DASHBOARD.modulePrefix).toBe('gatein');
  });
});

// ═══════════════════════════════════════════════════════════════
// Gate
// ═══════════════════════════════════════════════════════════════

describe('ROUTES — Gate', () => {
  it('path is "/gate"', () => {
    expect(ROUTES.GATE.path).toBe('/gate');
  });

  it('has hasSubmenu true', () => {
    expect(ROUTES.GATE.hasSubmenu).toBe(true);
  });

  it('has children object', () => {
    expect(ROUTES.GATE.children).toBeDefined();
    expect(typeof ROUTES.GATE.children).toBe('object');
  });

  it('children has RAW_MATERIALS', () => {
    expect(ROUTES.GATE.children).toHaveProperty('RAW_MATERIALS');
  });

  it('children has DAILY_NEEDS', () => {
    expect(ROUTES.GATE.children).toHaveProperty('DAILY_NEEDS');
  });

  it('children has MAINTENANCE', () => {
    expect(ROUTES.GATE.children).toHaveProperty('MAINTENANCE');
  });

  it('children has CONSTRUCTION', () => {
    expect(ROUTES.GATE.children).toHaveProperty('CONSTRUCTION');
  });

  it('children has CONTRACTOR_LABOR', () => {
    expect(ROUTES.GATE.children).toHaveProperty('CONTRACTOR_LABOR');
  });

  it('all GATE children paths start with "/gate/"', () => {
    const children = ROUTES.GATE.children!;
    for (const [, child] of Object.entries(children)) {
      expect(child.path).toMatch(/^\/gate\//);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS & PROFILE
// ═══════════════════════════════════════════════════════════════

describe('ROUTES — Other routes', () => {
  it('NOTIFICATIONS path is "/notifications"', () => {
    expect(ROUTES.NOTIFICATIONS.path).toBe('/notifications');
  });

  it('PROFILE path is "/profile"', () => {
    expect(ROUTES.PROFILE.path).toBe('/profile');
  });
});

// ═══════════════════════════════════════════════════════════════
// Path Integrity
// ═══════════════════════════════════════════════════════════════

describe('ROUTES — Path Integrity', () => {
  it('all top-level routes have a path property', () => {
    for (const [, route] of Object.entries(ROUTES)) {
      expect(route).toHaveProperty('path');
    }
  });

  it('all paths are strings starting with "/"', () => {
    for (const [, route] of Object.entries(ROUTES)) {
      expect(typeof route.path).toBe('string');
      expect(route.path).toMatch(/^\//);
    }
  });

  it('all routes have a title property', () => {
    for (const [, route] of Object.entries(ROUTES)) {
      expect(route).toHaveProperty('title');
      expect(typeof route.title).toBe('string');
      expect(route.title.length).toBeGreaterThan(0);
    }
  });

  it('no duplicate top-level paths', () => {
    const paths = Object.values(ROUTES).map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('no duplicate child paths within GATE', () => {
    const children = ROUTES.GATE.children!;
    const childPaths = Object.values(children).map((c) => c.path);
    expect(new Set(childPaths).size).toBe(childPaths.length);
  });
});
