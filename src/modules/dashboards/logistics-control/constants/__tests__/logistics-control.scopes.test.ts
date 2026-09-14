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
  logisticsControlScopeForCompany,
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

    it('has every tile sourced, and hides none of them', () => {
      expect(LOGISTICS_CONTROL_OIL_SCOPE.absent).toEqual({});
      expect(LOGISTICS_CONTROL_OIL_SCOPE.hidden).toEqual([]);
    });

    it('reads its typed-in figures as the warehouse company, not the viewer', () => {
      // The bug this replaced: an empty JIVO_MART settings row, created the
      // first time somebody signed into Mart opened an Oil warehouse's board.
      expect(LOGISTICS_CONTROL_OIL_SCOPE.settingsCompany).toBe(LOGISTICS_CONTROL_WAREHOUSE_COMPANY);
    });
  });

  describe('the Beverages scope', () => {
    it('reads BH-FG through the Beverages schema', () => {
      // Both halves matter. Beverages has its own BH-PF and its own BH-WST, so
      // a warehouse code read through the wrong company answers empty rather
      // than erroring — which on a wall is far harder to notice.
      expect(LOGISTICS_CONTROL_BEVERAGES_SCOPE.warehouse).toBe('BH-FG');
      expect(LOGISTICS_CONTROL_BEVERAGES_SCOPE.warehouseCompany).toBe(COMPANY_CODES.JIVO_BEVERAGES);
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

    it('drops the two tiles that ask an Oil question, rather than zeroing them', () => {
      // Allocated stock reads the oil floor's godown register and the beverages
      // floor scans no barcodes, so both tiles could only ever print a nought —
      // which on a wall reads as a clean day rather than as no such practice.
      expect([...LOGISTICS_CONTROL_BEVERAGES_SCOPE.hidden].sort()).toEqual([
        'allocated',
        'unscanned',
      ]);
      // And a hidden tile is not also given a reason to print: the two are
      // alternatives, and a tile that is gone cannot say anything.
      expect(LOGISTICS_CONTROL_BEVERAGES_SCOPE.absent.barcodeScanning).toBeUndefined();
    });

    it('states a reason for each tile it cannot source', () => {
      // A reason, never a bare flag: the board's one hard rule is that a figure
      // with no source behind it does not look like a figure, and "no data" is
      // not a reason somebody can act on.
      const { absent } = LOGISTICS_CONTROL_BEVERAGES_SCOPE;
      expect(Object.keys(absent).sort()).toEqual(['palletSpace', 'stockInTransit']);
      for (const reason of Object.values(absent)) {
        expect(reason).toMatch(/\S/);
        expect(reason).not.toMatch(/^no data$/i);
      }
    });
  });

  it('gives every scope its own key', () => {
    const keys = LOGISTICS_CONTROL_SCOPES.map((scope) => scope.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  describe('the company decides which board a viewer gets', () => {
    it('sends Beverages to the beverages plant', () => {
      expect(logisticsControlScopeForCompany(COMPANY_CODES.JIVO_BEVERAGES)).toBe(
        LOGISTICS_CONTROL_BEVERAGES_SCOPE,
      );
    });

    it('sends Oil and Mart to the BH-BT board', () => {
      // Mart on purpose: Mart's dispatch is one of the two halves that board
      // adds up, so a Mart user opening it is reading their own shipments.
      expect(logisticsControlScopeForCompany(COMPANY_CODES.JIVO_OIL)).toBe(
        LOGISTICS_CONTROL_OIL_SCOPE,
      );
      expect(logisticsControlScopeForCompany(COMPANY_CODES.JIVO_MART)).toBe(
        LOGISTICS_CONTROL_OIL_SCOPE,
      );
    });

    it('falls back to the Oil board while no company is known', () => {
      // What the single board showed before the split, and so the safe answer
      // in the moment between sign-in and the company loading.
      expect(logisticsControlScopeForCompany(undefined)).toBe(LOGISTICS_CONTROL_OIL_SCOPE);
      expect(logisticsControlScopeForCompany(null)).toBe(LOGISTICS_CONTROL_OIL_SCOPE);
    });

    it('puts both boards on the one route, so the switcher is the only control', () => {
      // The pair used to hold two addresses. They share one now: a second URL
      // is a second way to be looking at the wrong plant's tonnage.
      expect(LOGISTICS_CONTROL_BEVERAGES_SCOPE.boardPath).toBe(
        LOGISTICS_CONTROL_OIL_SCOPE.boardPath,
      );
      expect(LOGISTICS_CONTROL_BEVERAGES_SCOPE.settingsPath).toBe(
        LOGISTICS_CONTROL_OIL_SCOPE.settingsPath,
      );
    });
  });
});
