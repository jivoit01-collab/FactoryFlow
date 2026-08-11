import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Config is verified by reading the file rather than importing it: a direct
// import pulls lucide-react's whole icon graph through Vite and hangs. Same
// approach as the other module.config tests here.
function read(file: string): string {
  return readFileSync(resolve(process.cwd(), `src/modules/order-processing/${file}`), 'utf-8');
}

describe('orderProcessingModuleConfig', () => {
  it('is a top-level module, not nested under dashboards', () => {
    const content = read('module.config.tsx');
    expect(content).toContain('export const orderProcessingModuleConfig');
    expect(content).toMatch(/name:\s*['"]order-processing['"]/);
  });

  it('hides itself from the sidebar for users with no order_processing permission', () => {
    // Without modulePrefix the entry shows for everyone, including people who
    // cannot open a single page behind it.
    expect(read('module.config.tsx')).toContain('modulePrefix: ORDER_PROCESSING_MODULE_PREFIX');
  });

  it('gates every route on the view permission', () => {
    // One `element:` per route, one VIEW permission per route. An ungated route
    // is reachable by URL even when the sidebar hides the module.
    const content = read('module.config.tsx');
    const routes = content.split('element:').length - 1;
    const gated = content.split('permissions: [ORDER_PROCESSING_PERMISSIONS.VIEW]').length - 1;
    expect(routes).toBeGreaterThan(0);
    expect(gated).toBe(routes);
  });

  it('routes the four screens', () => {
    const content = read('module.config.tsx');
    for (const path of [
      "'/order-processing'",
      "'/order-processing/orders'",
      "'/order-processing/orders/:orderId'",
      "'/order-processing/planning'",
      "'/order-processing/data-quality'",
    ]) {
      expect(content).toContain(path);
    }
  });
});

describe('order-processing permissions', () => {
  function readPerms(): string {
    return readFileSync(
      resolve(process.cwd(), 'src/config/permissions/order-processing.permissions.ts'),
      'utf-8',
    );
  }

  it('has no trailing dot on the module prefix', () => {
    // hasModulePermission appends one itself; a prefix written as
    // "order_processing." becomes "order_processing.." and matches nothing, so
    // the sidebar entry would be invisible even to users who hold the permission.
    // This exact bug shipped once in the supply-chain module.
    expect(readPerms()).toMatch(/ORDER_PROCESSING_MODULE_PREFIX\s*=\s*'order_processing'/);
  });

  it('separates read from the actions that hit OMS and SAP', () => {
    const content = readPerms();
    expect(content).toContain('VIEW:');
    expect(content).toContain('SYNC:');
    expect(content).toContain('PLAN_PRODUCTION:');
    expect(content).toContain('PLAN_PROCUREMENT:');
  });
});

describe('order-processing API surface', () => {
  it('declares every endpoint the pages call', () => {
    const content = readFileSync(
      resolve(process.cwd(), 'src/config/constants/api.constants.ts'), 'utf-8',
    );
    for (const key of [
      'DASHBOARD:', 'ORDERS:', 'ORDER_DETAIL:', 'ORDER_TIMELINE:',
      'ORDER_CHECK_STOCK:', 'PRODUCTION:', 'MATERIALS:', 'MATERIALS_PLAN:',
      'PROCUREMENT:', 'LINE_ISSUES:', 'SYNC:',
    ]) {
      expect(content).toContain(key);
    }
    expect(content).toContain("'/order-processing/dashboard/'");
  });
});

describe('quantity handling', () => {
  it('keeps quantities as strings', () => {
    // They are DECIMAL(18,4) server-side; a JS number cannot carry that range
    // without silently rounding, and a rounded order quantity is a wrong order.
    const types = readFileSync(
      resolve(process.cwd(), 'src/modules/order-processing/types/index.ts'), 'utf-8',
    );
    expect(types).toMatch(/quantity:\s*string/);
    expect(types).toMatch(/net_required:\s*string/);
    expect(types).not.toMatch(/quantity:\s*number/);
  });

  it('models a missing warehouse as a stated label, not an empty string', () => {
    const types = readFileSync(
      resolve(process.cwd(), 'src/modules/order-processing/types/index.ts'), 'utf-8',
    );
    expect(types).toMatch(/warehouse_label:\s*string/);
    expect(types).toMatch(/has_warehouse:\s*boolean/);
  });
});
