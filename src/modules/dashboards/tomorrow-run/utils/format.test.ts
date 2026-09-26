import { describe, expect, it } from 'vitest';

import type { MenuRow, Plan } from '../types';
import { finTxt, grp, hOf, nice, T, Tl } from './format';
import { facts } from './plan';

describe('the page words', () => {
  it('writes tons the way the board did: 1 T = 1,000 L, one decimal', () => {
    expect(T(135564)).toBe('135.6 T');
    expect(T(null)).toBe('—');
    expect(Tl(32)).toBe('32 L');
    expect(Tl(19950)).toBe('20.0 T');
  });

  it('turns an SAP name into the floor name', () => {
    expect(nice('MUSTARD KACHI GHANI 1 LTR 20 PCS')).toBe('Mustard Kachi Ghani 1 L');
    expect(nice('EXTRA VIRGIN OLIVE 250 MLS 4 PCS')).toBe('Extra Virgin Olive 250 ml');
  });

  it('reads the engine clock from 7:30', () => {
    expect(hOf('07:30')).toBe(0);
    expect(hOf('19:30')).toBe(12);
    expect(hOf('04:50 +1 day')).toBeCloseTo(21.333, 2);
    expect(finTxt('18:46')).toBe('6:46 pm');
    expect(finTxt('04:50 +1 day')).toBe('4:50 am (overnight)');
  });

  it('colours by pack, a tin never as a 5 L bottle', () => {
    expect(grp({ pack: '5 L', type: 'tin' }).k).toBe('tin');
    expect(grp({ pack: '5 L', type: 'bottle' }).k).toBe('5l');
    expect(grp({ pack: '200 ml', type: 'bottle' }).k).toBe('small');
    expect(grp({ pack: 'pouch', type: 'pouch' }).k).toBe('pouch');
  });
});

describe('the story of one option', () => {
  const plan = { rules: { start: '07:30' } } as unknown as Plan;
  const base = {
    held: false,
    on_plan_here_l: 0,
    can_pick: true,
    first_fits: true,
    first_finish: '13:29',
    first_l: 35965,
    change_h: 1,
    waits_l: 35965,
    made_elsewhere_on: [],
    sheet_left_l: 46000,
    sheet_says: ['Clear Pack'],
    sheet_says_here: true,
    via: null,
    material: null,
  } as unknown as MenuRow;

  it('says when it would run if it went first', () => {
    expect(facts(plan, base)).toEqual([
      'If it goes first: 7:30 am to 1:29 pm',
      '1 h changeover, inside these times',
      '36.0 T of it still waits',
      'The sheet still needs 46.0 T of it',
      'The sheet puts it on this machine',
    ]);
  });

  it('says who took the oil a held item is short of', () => {
    const held = {
      ...base,
      held: true,
      change_h: 6,
      waits_l: 11277,
      material: {
        kind: 'oil',
        code: 'RM0000009',
        name: 'REFINED SUNFLOWER OIL',
        unit: 'L',
        left: 0,
        went_to: [
          {
            code: 'FG0000091',
            name: 'COLD PRESS SUNFLOWER 1 LTR +1 LTR COMBO 10 SET PLAIN',
            picked: false,
          },
        ],
      },
    } as unknown as MenuRow;
    expect(facts(plan, held)[0]).toBe(
      'No oil for it. Refined Sunflower Oil: went to Cold Press Sunflower 1 L +1 L Combo 10 Set Plain',
    );
  });
});
