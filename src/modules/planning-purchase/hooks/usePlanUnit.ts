import { useCallback, useEffect, useState } from 'react';

import { storage } from '@/shared/utils';

import type { PlanUnit } from '../types';

const STORAGE_KEY = 'planning-purchase:unit';
const CHANGE_EVENT = 'planning-purchase:unit-changed';

const VALID: PlanUnit[] = ['LITRES', 'PIECES', 'CASES'];

/** Litres: this is an oil business, and litres is what a plan is discussed in. */
const DEFAULT_UNIT: PlanUnit = 'LITRES';

function read(): PlanUnit {
  const stored = storage.get<PlanUnit>(STORAGE_KEY);
  return stored && VALID.includes(stored) ? stored : DEFAULT_UNIT;
}

/**
 * The unit every quantity in the module is displayed in.
 *
 * Module-wide and sticky rather than per-page state, for two reasons. Someone who
 * reads litres reads litres on every screen, so making them re-pick after each
 * navigation is just friction. And a unit that silently resets to the default is
 * worse than friction: the numbers change by a factor of twenty between pieces
 * and litres, and a planner who does not notice the reset reads the wrong figure
 * with no indication anything moved.
 *
 * Backed by localStorage, with a window event so every mounted consumer — the
 * header toggle and the tables below it — updates together instead of drifting
 * apart. `storage` swallows its own errors, so a browser with site data blocked
 * simply gets the default rather than a crash.
 */
export function usePlanUnit(): [PlanUnit, (unit: PlanUnit) => void] {
  const [unit, setUnitState] = useState<PlanUnit>(read);

  useEffect(() => {
    const sync = () => setUnitState(read());
    window.addEventListener(CHANGE_EVENT, sync);
    // `storage` fires only for OTHER tabs, which is exactly what it is wanted
    // for here: change the unit in one tab and the others follow.
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setUnit = useCallback((next: PlanUnit) => {
    storage.set(STORAGE_KEY, next);
    setUnitState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [unit, setUnit];
}
