import { describe, expect, it } from 'vitest';

import type { SalesDispatchGateOut } from '@/modules/gate/api';

import { resolveScanGate } from '../../pages/customerSalesFlow/salesDispatchFlow.helpers';

/**
 * One truck, several dockings: the scan step is walked load-wide, but each admin approval
 * is filed against the single docking it was raised from.
 *
 * Regression (truck HR55AK6402, 22 Aug 2026): a Mart docking with all 872 boxes scanned
 * rode with an Oil docking for a bill of PM cartons, which carry no box barcode at all.
 * The page locked both dockings — and the approval, once an admin gave it, sat on the Oil
 * docking where the operator standing on the Mart one never saw it.
 */
function docking(readiness: Partial<NonNullable<SalesDispatchGateOut['gatepass_readiness']>>) {
  return { id: 1, gatepass_readiness: readiness } as unknown as SalesDispatchGateOut;
}

describe('resolveScanGate', () => {
  it('releases a fully scanned load', () => {
    const gate = resolveScanGate({
      boxScanOptional: false,
      scannedCount: 872,
      isPartialScan: false,
    });
    expect(gate.satisfied).toBe(true);
  });

  it('holds a partly scanned load with no approval', () => {
    const gate = resolveScanGate({
      boxScanOptional: false,
      scannedCount: 872,
      isPartialScan: true,
    });
    expect(gate.satisfied).toBe(false);
  });

  it('holds a partly scanned load while its own request is only pending', () => {
    const gate = resolveScanGate({
      boxScanOptional: false,
      scannedCount: 872,
      isPartialScan: true,
      ownPartialStatus: 'PENDING',
    });
    expect(gate.partialApproved).toBe(false);
    expect(gate.satisfied).toBe(false);
  });

  it('releases the load on a partial approval filed against a sibling docking', () => {
    const gate = resolveScanGate({
      boxScanOptional: false,
      scannedCount: 872,
      isPartialScan: true,
      ownPartialStatus: null,
      loadDockings: [
        docking({ partial_scan_approved: false }),
        docking({ partial_scan_approved: true }),
      ],
    });
    expect(gate.partialApproved).toBe(true);
    expect(gate.satisfied).toBe(true);
  });

  it('releases a nothing-scanned load on a scan skip filed against a sibling docking', () => {
    const gate = resolveScanGate({
      boxScanOptional: false,
      scannedCount: 0,
      isPartialScan: false,
      loadDockings: [docking({ scan_skip_approved: true })],
    });
    expect(gate.skipApproved).toBe(true);
    expect(gate.satisfied).toBe(true);
  });

  it('does not let a sibling scan skip stand in for a partial approval', () => {
    const gate = resolveScanGate({
      boxScanOptional: false,
      scannedCount: 400,
      isPartialScan: true,
      loadDockings: [docking({ scan_skip_approved: true })],
    });
    expect(gate.satisfied).toBe(false);
  });

  it('never gates a company that does not scan boxes at the factory', () => {
    const gate = resolveScanGate({
      boxScanOptional: true,
      scannedCount: 0,
      isPartialScan: false,
    });
    expect(gate.satisfied).toBe(true);
  });
});
