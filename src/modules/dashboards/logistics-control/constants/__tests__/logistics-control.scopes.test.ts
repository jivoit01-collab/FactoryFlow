import { describe, expect, it } from 'vitest';

import { COMPANY_CODES } from '@/config/constants';

import {
  LOGISTICS_CONTROL_DISPATCH_COMPANIES,
  LOGISTICS_CONTROL_WAREHOUSE,
  LOGISTICS_CONTROL_WAREHOUSE_COMPANY,
} from '../logistics-control.constants';
import {
  LOGISTICS_CONTROL_BEVERAGES_SCOPE,
  LOGISTICS_CONTROL_OIL_SCOPE,
  LOGISTICS_CONTROL_SCOPES,
} from '../logistics-control.scopes';

describe('logistics control scopes', () => {
  describe('the Oil scope is the board as it was', () => {
    /*
     * The whole point of the split is that the existing wall does not change.
     * These pin the Oil scope to the constants the board was hard-wired to
     * before it took a scope at all — so a future edit to the Beverages side
     * cannot quietly move BH-BT's board with it.
     */
    it('keeps the warehouse, its company and the companies it adds', () => {
      expect(LOGISTICS_CONTROL_OIL_SCOPE.warehouse).toBe(LOGISTICS_CONTROL_WAREHOUSE);
      expect(LOGISTICS_CONTROL_OIL_SCOPE.warehouseCompany).toBe(
        LOGISTICS_CONTROL_WAREHOUSE_COMPANY,
      );
      expect(LOGISTICS_CONTROL_OIL_SCOPE.dispatchCompanies).toEqual(
        LOGISTICS_CONTROL_DISPATCH_COMPANIES,
      );
    });

    it('has every tile sourced', () => {
      expect(LOGISTICS_CONTROL_OIL_SCOPE.absent).toEqual({});
    });

    it('reads its typed-in figures as the warehouse company, not the viewer', () => {
      // The bug this replaced: an empty JIVO_MART settings row, created the
      // first time somebody signed into Mart opened an Oil warehouse's board.
      expect(LOGISTICS_CONTROL_OIL_SCOPE.settingsCompany).toBe(
        LOGISTICS_CONTROL_WAREHOUSE_COMPANY,
      );
    });
  });

  describe('the Beverages scope', () => {
    it('reads BH-FG through the Beverages schema', () => {
      // Both halves matter. Beverages has its own BH-PF and its own BH-WST, so
      // a warehouse code read through the wrong company answers empty rather
      // than erroring — which on a wall is far harder to notice.
      expect(LOGISTICS_CONTROL_BEVERAGES_SCOPE.warehouse).toBe('BH-FG');
      expect(LOGISTICS_CONTROL_BEVERAGES_SCOPE.warehouseCompany).toBe(
        COMPANY_CODES.JIVO_BEVERAGES,
      );
    });

    it('adds one company and no others', () => {
      // "Beverages only" is the whole ask. Anything else here would put another
      // plant's tonnage under a Beverages heading.
      expect(LOGISTICS_CONTROL_BEVERAGES_SCOPE.dispatchCompanies).toEqual([
        COMPANY_CODES.JIVO_BEVERAGES,
      ]);
    });

    it('counts its own floor labour, not the basement or Gupta', () => {
      expect(LOGISTICS_CONTROL_BEVERAGES_SCOPE.sectionDepartments.warehouse).toEqual([
        'Warehouse Beverage',
      ]);
      expect(LOGISTICS_CONTROL_BEVERAGES_SCOPE.sectionDepartments.warehouse).not.toContain(
        'Warehouse Basement',
      );
    });

    it('states a reason for each tile it cannot source', () => {
      // A reason, never a bare flag: the board's one hard rule is that a figure
      // with no source behind it does not look like a figure, and "no data" is
      // not a reason somebody can act on.
      const { absent } = LOGISTICS_CONTROL_BEVERAGES_SCOPE;
      expect(Object.keys(absent).sort()).toEqual([
        'barcodeScanning',
        'palletSpace',
        'stockInTransit',
      ]);
      for (const reason of Object.values(absent)) {
        expect(reason).toMatch(/\S/);
        expect(reason).not.toMatch(/^no data$/i);
      }
    });
  });

  it('gives every scope its own routes', () => {
    // Two boards on two wall screens: a shared path would mean one of them
    // could not be opened, and a shared settings path would mean configuring
    // one silently reconfigured the other.
    const paths = LOGISTICS_CONTROL_SCOPES.flatMap((scope) => [
      scope.boardPath,
      scope.settingsPath,
    ]);
    expect(new Set(paths).size).toBe(paths.length);

    const keys = LOGISTICS_CONTROL_SCOPES.map((scope) => scope.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
