import { describe, expect, it } from 'vitest';

import {
  PRODUCTION_ORDERS_ACCESS,
  PRODUCTION_ORDERS_CREATE_ACCESS,
  PRODUCTION_ORDERS_PERMISSIONS,
} from '@/config/permissions';
import { productionModuleConfig } from '@/modules/production/module.config';

import { productionOrdersModuleConfig } from '../module.config';
import { batchesAddUp, boxesLabel, dateLabel, qty, releasedStage } from '../utils/format';
import { pathAfterPosting, stepAfter, stepPath } from '../utils/steps';

describe('production-orders module config', () => {
  it("has the list, SAP's own orders, the new-entry Plan page, the entry and one page per SAP step", () => {
    expect(productionOrdersModuleConfig.routes.map((route) => route.path)).toEqual([
      '/production-orders',
      '/production-orders/entries',
      '/production-orders/in-sap',
      '/production-orders/new',
      '/production-orders/entries/:id',
      '/production-orders/entries/:id/plan',
      '/production-orders/entries/:id/release',
      '/production-orders/entries/:id/issue',
      '/production-orders/entries/:id/receipt',
      '/production-orders/entries/:id/close',
    ]);
  });

  it('stays out of the production execution screens', () => {
    for (const route of productionOrdersModuleConfig.routes) {
      expect(route.path.startsWith('/production-orders')).toBe(true);
      expect(route.path).not.toContain('/production/');
    }
    expect(PRODUCTION_ORDERS_ACCESS.every((p) => p.startsWith('production_orders.'))).toBe(true);
  });

  it('opens a new entry only to those who may plan, every other page to any right, in Oil only', () => {
    for (const route of productionOrdersModuleConfig.routes) {
      const expected =
        route.path === '/production-orders/new'
          ? PRODUCTION_ORDERS_CREATE_ACCESS
          : PRODUCTION_ORDERS_ACCESS;
      expect(route.permissions).toEqual(expected);
      expect(route.companies).toEqual(['JIVO_OIL']);
    }
    expect(PRODUCTION_ORDERS_CREATE_ACCESS).toEqual([PRODUCTION_ORDERS_PERMISSIONS.CREATE]);
    expect(PRODUCTION_ORDERS_PERMISSIONS.RELEASE).toBe(
      'production_orders.can_release_production_orders',
    );
  });

  it('has no sidebar group of its own: its menu entry is under Production, for Oil', () => {
    expect(productionOrdersModuleConfig.navigation ?? []).toEqual([]);
    const [production] = productionModuleConfig.navigation ?? [];
    expect(production.modulePrefix).toContain('production_orders');
    const entry = production.children?.find((child) => child.path === '/production-orders');
    expect(entry?.title).toBe('Production Orders');
    expect(entry?.permissions).toEqual(PRODUCTION_ORDERS_ACCESS);
    expect(entry?.companies).toEqual(['JIVO_OIL']);
  });
});

describe('moving between steps', () => {
  const step = (key: 'PLAN' | 'RELEASE' | 'ISSUE' | 'RECEIPT' | 'CLOSE', can_take: boolean) => ({
    step: key,
    label: key,
    done: false,
    is_next: false,
    by: '',
    at: null,
    sap_doc_num: null,
    can_take,
    posting: null,
  });

  it('names each step page and the step after it', () => {
    expect(stepPath(7, 'RECEIPT')).toBe('/production-orders/entries/7/receipt');
    expect(stepAfter('PLAN')).toBe('RELEASE');
    expect(stepAfter('CLOSE')).toBeNull();
  });

  it('goes on to the next step once a step posts, if the person may take it', () => {
    const steps = [step('PLAN', true), step('RELEASE', false), step('ISSUE', true)];
    expect(pathAfterPosting({ id: 7, steps }, 'PLAN')).toBe('/production-orders/entries/7');
    expect(pathAfterPosting({ id: 7, steps }, 'RELEASE')).toBe(
      '/production-orders/entries/7/issue',
    );
    expect(pathAfterPosting({ id: 7, steps }, 'CLOSE')).toBe('/production-orders/entries/7');
  });
});

describe('formatting', () => {
  it('counts what was made the way the floor does', () => {
    expect(boxesLabel(120, 3)).toBe('120 boxes + 3 pcs');
    expect(boxesLabel(1, 0)).toBe('1 box');
    expect(boxesLabel(0, 5)).toBe('5 pcs');
  });

  it('reads dates without time-zone drift and quantities without trailing zeros', () => {
    expect(dateLabel('2026-10-08')).toBe('08-10-2026');
    expect(qty('3202.000000')).toBe('3,202');
    expect(qty(null)).toBe('—');
  });

  it('checks that batch picks add up to six places', () => {
    expect(batchesAddUp('210.000000', [{ quantity: '30' }, { quantity: '180' }])).toBe(true);
    expect(batchesAddUp('210', [{ quantity: '30' }])).toBe(false);
  });
});

describe("SAP's own orders", () => {
  const order = (
    status: 'P' | 'R' | 'L' | 'C',
    received: string,
    issued: string,
    type: 'S' | 'D' = 'S',
  ) =>
    ({
      status,
      type,
      planned_quantity: '4',
      completed_quantity: received,
      issued_quantity: issued,
    }) as Parameters<typeof releasedStage>[0];

  it('says how far a released order has got, since SAP keeps it Released until closed', () => {
    expect(releasedStage(order('R', '0', '0'))).toBe('Nothing issued yet');
    expect(releasedStage(order('R', '0', '42.26'))).toBe('Issued, nothing received');
    expect(releasedStage(order('R', '2', '42.26'))).toBe('Part received');
    expect(releasedStage(order('R', '4', '42.26'))).toBe('FG created, not closed');
    expect(releasedStage(order('R', '4', '42.26', 'D'))).toBe('Received, not closed');
    expect(releasedStage(order('L', '4', '42.26'))).toBeNull();
    expect(releasedStage(order('P', '0', '0'))).toBeNull();
  });
});
