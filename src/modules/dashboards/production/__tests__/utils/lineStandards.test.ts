import { describe, expect, it } from 'vitest';

import type { LineSkuConfig } from '@/modules/production/execution/types';

import {
  configForRun,
  indexLineConfigs,
  standardOf,
  standingSpeed,
} from '../../utils/lineStandards';

function config(overrides: Partial<LineSkuConfig> = {}): LineSkuConfig {
  return {
    id: 1,
    line: 3,
    line_name: 'JP Machine',
    config_name: '1 L preset',
    sku_code: 'FG001',
    sku_name: 'MUSTARD KACHI GHANI 1 LTR',
    rated_speed: '4000',
    pieces_per_case: 20,
    labour_count: 8,
    other_manpower_count: 2,
    supervisor: 'R. Kumar',
    operators: 'Two',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('indexLineConfigs', () => {
  it('leaves a switched-off preset out — a line is not still rated at it', () => {
    const index = indexLineConfigs([config(), config({ id: 2, is_active: false })]);

    expect(index.get(3)).toHaveLength(1);
    expect(index.get(3)?.[0].id).toBe(1);
  });
});

describe('configForRun', () => {
  it('matches the SKU, so a 1 L preset never rates a 5 L run', () => {
    const index = indexLineConfigs([
      config({ id: 1, sku_code: 'FG001', rated_speed: '4000' }),
      config({ id: 2, sku_code: 'FG005', rated_speed: '900' }),
    ]);

    expect(configForRun(index, 3, 'FG005')?.rated_speed).toBe('900');
  });

  it('uses a line’s only preset whatever the SKU — that preset IS its rating', () => {
    const index = indexLineConfigs([config({ sku_code: 'FG001' })]);

    expect(configForRun(index, 3, 'FG999')?.id).toBe(1);
  });

  it('refuses to pick between presets that do not match the SKU', () => {
    const index = indexLineConfigs([
      config({ id: 1, sku_code: 'FG001' }),
      config({ id: 2, sku_code: 'FG005' }),
    ]);

    expect(configForRun(index, 3, 'FG999')).toBeNull();
  });

  it('matches case-insensitively and ignores surrounding space', () => {
    const index = indexLineConfigs([
      config({ id: 1, sku_code: ' fg001 ' }),
      config({ id: 2, sku_code: 'FG005' }),
    ]);

    expect(configForRun(index, 3, 'FG001')?.id).toBe(1);
  });

  it('has nothing to say about a line with no presets', () => {
    expect(configForRun(indexLineConfigs([]), 3, 'FG001')).toBeNull();
  });
});

describe('standardOf', () => {
  it('hands the metrics helper the two figures it converts between', () => {
    expect(standardOf(config())).toEqual({ ratedSpeed: 4_000, piecesPerCase: 20 });
  });

  it('treats a zero or missing speed as no rating rather than as zero', () => {
    expect(standardOf(config({ rated_speed: '0', pieces_per_case: null }))).toEqual({
      ratedSpeed: null,
      piecesPerCase: null,
    });
  });

  it('is undefined without a preset, so the run’s own snapshot stands alone', () => {
    expect(standardOf(null)).toBeUndefined();
  });
});

describe('standingSpeed', () => {
  it('states the speed when the line’s presets agree', () => {
    const index = indexLineConfigs([
      config({ id: 1, sku_code: 'FG001' }),
      config({ id: 2, sku_code: 'FG002' }),
    ]);

    expect(standingSpeed(index, 3)).toBe(4_000);
  });

  it('refuses one when they disagree — an idle line has no single speed', () => {
    const index = indexLineConfigs([
      config({ id: 1, sku_code: 'FG001', rated_speed: '4000' }),
      config({ id: 2, sku_code: 'FG005', rated_speed: '900' }),
    ]);

    expect(standingSpeed(index, 3)).toBeNull();
  });

  it('is null for a line nobody has configured', () => {
    expect(standingSpeed(indexLineConfigs([]), 9)).toBeNull();
  });
});
