import { useCallback, useState } from 'react';

import { DEFAULT_OVERSCAN_PERCENT, OVERSCAN_CHOICES, OVERSCAN_STORAGE_KEY } from '../constants';

/** The stored setting, or none. Kiosk browsers can throw on the accessor itself. */
function read(): number {
  try {
    const raw = window.localStorage.getItem(OVERSCAN_STORAGE_KEY);
    const parsed = raw === null ? NaN : Number(raw);
    // Only a value actually on the menu. A hand-edited 40 would shrink the board
    // to a postage stamp on a screen nobody is standing at to undo it.
    return OVERSCAN_CHOICES.includes(parsed) ? parsed : DEFAULT_OVERSCAN_PERCENT;
  } catch {
    return DEFAULT_OVERSCAN_PERCENT;
  }
}

export interface Overscan {
  /** How much of each edge the panel is eating, as a percentage. 0 is off. */
  percent: number;
  /** What the board is scaled by to fit inside what is actually shown. */
  scale: number;
  setPercent: (percent: number) => void;
}

/**
 * Compensation for a television that crops the picture it is sent.
 *
 * See `OVERSCAN_CHOICES` for what overscan is and why the real fix is on the TV.
 * This is the fallback for sets that cannot be told to stop.
 *
 * The scale takes the inset off BOTH sides — losing 3% of the left edge and 3%
 * of the right means the board has 94% of the width to live in, not 97%. Get
 * that wrong and the compensation is half of what was asked for, which looks
 * like it did not work.
 */
export function useOverscan(): Overscan {
  const [percent, setStored] = useState(read);

  const setPercent = useCallback((next: number) => {
    setStored(next);
    try {
      window.localStorage.setItem(OVERSCAN_STORAGE_KEY, String(next));
    } catch {
      // A screen that cannot remember the setting still honours it until reload.
    }
  }, []);

  return { percent, scale: (100 - percent * 2) / 100, setPercent };
}
