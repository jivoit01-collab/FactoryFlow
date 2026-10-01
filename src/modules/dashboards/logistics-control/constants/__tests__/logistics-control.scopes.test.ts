import { describe, expect, it } from 'vitest';

import { COMPANY_CODES } from '@/config/constants';

import {
  LOGISTICS_CONTROL_DISPATCH_COMPANIES,
  LOGISTICS_CONTROL_SETTINGS_COMPANY,
} from '../logistics-control.constants';
import {
  LOGISTICS_CONTROL_BEVERAGES_SCOPE,
  LOGISTICS_CONTROL_OIL_SCOPE,
  LOGISTICS_CONTROL_SCOPES,
  logisticsControlScopeForCompany,
} from '../logistics-control.scopes';

describe('logistics control scopes', () => {
  describe('the Oil scope', () => {
    it('reads the warehouse band as Oil then Mart, each through its own company', () => {
      // The order is the order they print in, Oil | Mart, and each half's
      // warehouses are the ones ticked for THAT company — Oil and Mart each
      // have a BH-GR.
      expect(LOGISTICS_CONTROL_OIL_SCOPE.warehouseSides.map((side) => side.companyCode)).toEqual([
        COMPANY_CODES.JIVO_OIL,
        COMPANY_CODES.JIVO_MART,
      ]);
      expect(LOGISTICS_CONTROL_OIL_SCOPE.dispatchCompanies).toEqual(
        LOGISTICS_CONTROL_DISPATCH_COMPANIES,
      );
    });

    it("puts the basement's labour on Oil and the Gupta godown's on Mart", () => {
      const [oil, mart] = LOGISTICS_CONTROL_OIL_SCOPE.warehouseSides;
      expect(oil.labourDepartments).toEqual(['Warehouse Basement']);
      expect(mart.labourDepartments).toEqual(['Warehouse Gupta']);
      // Beverages' floor is another plant.
      for (const side of LOGISTICS_CONTROL_OIL_SCOPE.warehouseSides) {
        expect(side.labourDepartments).not.toContain('Warehouse Beverage');
      }
    });

    it('has every tile sourced, and hides none of them', () => {
      expect(LOGISTICS_CONTROL_OIL_SCOPE.absent).toEqual({});
      expect(LOGISTICS_CONTROL_OIL_SCOPE.hidden).toEqual([]);
    });

    it('reads its typed-in figures as the warehouse company, not the viewer', () => {
      // The bug this replaced: an empty JIVO_MART settings row, created the
      // first time somebody signed into Mart opened an Oil warehouse's board.
      expect(LOGISTICS_CONTROL_OIL_SCOPE.settingsCompany).toBe(LOGISTICS_CONTROL_SETTINGS_COMPANY);
      expect(LOGISTICS_CONTROL_SETTINGS_COMPANY).toBe(COMPANY_CODES.JIVO_OIL);
    });
  });

  describe('the Beverages scope', () => {
    it('reads one warehouse side, through the Beverages schema', () => {
      // Beverages has its own BH-PF and its own BH-WST, so a warehouse code
      // read through the wrong company answers empty rather than erroring —
      // which on a wall is far harder to notice. Which of its warehouses is
      // the ticked list; BH-FG was ticked when the list shipped.
      expect(LOGISTICS_CONTROL_BEVERAGES_SCOPE.warehouseSides.map((side) => side.companyCode)).toEqual(
        [COMPANY_CODES.JIVO_BEVERAGES],
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
      const [side] = LOGISTICS_CONTROL_BEVERAGES_SCOPE.warehouseSides;
      expect(side.labourDepartments).toEqual(['Warehouse Beverage']);
      expect(side.labourDepartments).not.toContain('Warehouse Basement');
      expect(side.labourDepartments).not.toContain('Warehouse Gupta');
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
