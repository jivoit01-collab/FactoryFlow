import { describe, expect, it } from 'vitest';

import { GATE_PERMISSIONS } from '@/config/permissions';

import {
  findGateEntryType,
  GATE_ENTRY_CREATE_PERMISSIONS,
  GATE_ENTRY_TYPES,
  GATE_ENTRY_VIEW_PERMISSIONS,
} from '../../constants/gateEntryTypes';

const returnableOut = findGateEntryType('returnable-out');
const returnableIn = findGateEntryType('returnable-in');

describe('returnable gate entry types', () => {
  it('registers both returnable cards', () => {
    expect(returnableOut).toBeDefined();
    expect(returnableIn).toBeDefined();
  });

  it('puts Returnable Out in the Gate Out section', () => {
    // The dashboard groups by direction: 'out' -> Gate Out.
    expect(returnableOut!.direction).toBe('out');
    expect(returnableOut!.dashboardRoute).toBe('/gate/return-out');
  });

  it('puts Returnable In in the Gate In section', () => {
    // Both 'in' and 'return' land under Gate In on the dashboard.
    expect(returnableIn!.direction).toBe('return');
    expect(returnableIn!.dashboardRoute).toBe('/gate/return-in');
  });

  it('hides both from the New Entry picker — the gate never raises a pass', () => {
    expect(returnableOut!.hideFromNewEntry).toBe(true);
    expect(returnableIn!.hideFromNewEntry).toBe(true);
  });

  it('gates each card behind its own permission', () => {
    expect(returnableOut!.viewPermissions).toContain(GATE_PERMISSIONS.RETURNABLE.GATE_OUT);
    expect(returnableIn!.viewPermissions).toContain(GATE_PERMISSIONS.RETURNABLE.GATE_IN);
  });

  it('feeds the derived permission arrays, so the Gate menu appears for returnable-only users', () => {
    expect(GATE_ENTRY_VIEW_PERMISSIONS).toContain(GATE_PERMISSIONS.RETURNABLE.GATE_OUT);
    expect(GATE_ENTRY_VIEW_PERMISSIONS).toContain(GATE_PERMISSIONS.RETURNABLE.GATE_IN);
    expect(GATE_ENTRY_CREATE_PERMISSIONS).toContain(GATE_PERMISSIONS.RETURNABLE.GATE_OUT);
  });

  it('keeps every entry type id unique', () => {
    const ids = GATE_ENTRY_TYPES.map((entryType) => entryType.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
