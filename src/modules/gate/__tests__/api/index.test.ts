// ═══════════════════════════════════════════════════════════════
// Gate Module API Barrel Export Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that the top-level api/index.ts barrel re-exports all
// feature API services and React Query hooks from sub-modules.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// File Content Analysis
// ═══════════════════════════════════════════════════════════════

describe('Gate API barrel export (api/index.ts)', () => {
  const indexPath = resolve(process.cwd(), 'src/modules/gate/api/index.ts');
  const content = readFileSync(indexPath, 'utf-8');

  // ═══════════════════════════════════════════════════════════════
  // Arrival Slip re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports arrivalSlip API', () => {
    expect(content).toContain("export * from './arrivalSlip/arrivalSlip.api'");
  });

  it('re-exports arrivalSlip queries', () => {
    expect(content).toContain("export * from './arrivalSlip/arrivalSlip.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Construction re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports construction API', () => {
    expect(content).toContain("export * from './construction/construction.api'");
  });

  it('re-exports construction queries', () => {
    expect(content).toContain("export * from './construction/construction.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Daily Needs re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports dailyNeed API', () => {
    expect(content).toContain("export * from './dailyNeed/dailyNeed.api'");
  });

  it('re-exports dailyNeed queries', () => {
    expect(content).toContain("export * from './dailyNeed/dailyNeed.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Department re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports department API', () => {
    expect(content).toContain("export * from './department/department.api'");
  });

  it('re-exports department queries', () => {
    expect(content).toContain("export * from './department/department.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Driver re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports driver API', () => {
    expect(content).toContain("export * from './driver/driver.api'");
  });

  it('re-exports driver queries', () => {
    expect(content).toContain("export * from './driver/driver.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Gate Entry Full View re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports gateEntryFullView API', () => {
    expect(content).toContain("export * from './gateEntryFullView/gateEntryFullView.api'");
  });

  it('re-exports gateEntryFullView queries', () => {
    expect(content).toContain("export * from './gateEntryFullView/gateEntryFullView.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Maintenance re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports maintenance API', () => {
    expect(content).toContain("export * from './maintenance/maintenance.api'");
  });

  it('re-exports maintenance queries', () => {
    expect(content).toContain("export * from './maintenance/maintenance.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Person Gate In re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports personGateIn API', () => {
    expect(content).toContain("export * from './personGateIn/personGateIn.api'");
  });

  it('re-exports personGateIn queries', () => {
    expect(content).toContain("export * from './personGateIn/personGateIn.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Purchase Orders re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports po API', () => {
    expect(content).toContain("export * from './po/po.api'");
  });

  it('re-exports po queries', () => {
    expect(content).toContain("export * from './po/po.queries'");
  });

  it('re-exports poReceipt queries', () => {
    expect(content).toContain("export * from './po/poReceipt.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Security Check re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports securityCheck API', () => {
    expect(content).toContain("export * from './securityCheck/securityCheck.api'");
  });

  it('re-exports securityCheck queries', () => {
    expect(content).toContain("export * from './securityCheck/securityCheck.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Transporter re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports transporter API', () => {
    expect(content).toContain("export * from './transporter/transporter.api'");
  });

  it('re-exports transporter queries', () => {
    expect(content).toContain("export * from './transporter/transporter.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Vehicle re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports vehicle API', () => {
    expect(content).toContain("export * from './vehicle/vehicle.api'");
  });

  it('re-exports vehicle queries', () => {
    expect(content).toContain("export * from './vehicle/vehicle.queries'");
  });

  it('re-exports vehicleEntry queries', () => {
    expect(content).toContain("export * from './vehicle/vehicleEntry.queries'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Weighment re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports weighment API', () => {
    expect(content).toContain("export * from './weighment/weighment.api'");
  });

  it('re-exports weighment queries', () => {
    expect(content).toContain("export * from './weighment/weighment.queries'");
  });
});
