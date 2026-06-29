import { describe, expect, it } from 'vitest';

import type { PipelineCard, PipelineStage } from '../../types';
import { buildExpectedVehicles } from '../expectedVehicles';

function card(overrides: Partial<PipelineCard> & { stage: PipelineStage }): PipelineCard {
  return {
    plan_id: Math.floor(Math.random() * 1e6),
    stage_label: overrides.stage,
    stage_at: null,
    module: '',
    module_status: '',
    module_label: overrides.stage,
    sap_invoice_doc_entry: null,
    sap_doc_num: '',
    invoice_number: '',
    vehicle_no: 'DL01AA0001',
    vehicle_id: 1,
    transporter_name: '',
    driver_name: '',
    driver_mobile_no: '',
    dispatch_date: null,
    place_of_supply: '',
    customer_name: '',
    empty_gate_in_entry_no: null,
    gate_out_id: null,
    gate_out_entry_no: null,
    gate_out_status: null,
    gate_out_vehicle_entry_id: null,
    ...overrides,
  };
}

describe('buildExpectedVehicles', () => {
  it('groups bills by vehicle and dedupes docs/customers', () => {
    const rows = buildExpectedVehicles(
      [
        card({ stage: 'READY_TO_DOCK', vehicle_id: 1, sap_doc_num: 'A', customer_name: 'Acme' }),
        card({ stage: 'READY_TO_DOCK', vehicle_id: 1, sap_doc_num: 'B', customer_name: 'Acme' }),
      ],
      ['READY_TO_DOCK'],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].billCount).toBe(2);
    expect(rows[0].docNums).toEqual(['A', 'B']);
    expect(rows[0].customers).toEqual(['Acme']);
    expect(rows[0].startable).toBe(true);
  });

  it('headline is the least-advanced bill (the bottleneck)', () => {
    const rows = buildExpectedVehicles(
      [
        card({ stage: 'DOCKED', vehicle_id: 7, module_label: 'docked at dock' }),
        card({ stage: 'READY_TO_DOCK', vehicle_id: 7, module_label: 'pending at dock' }),
      ],
      ['READY_TO_DOCK'],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].stage).toBe('READY_TO_DOCK');
    expect(rows[0].moduleLabel).toBe('pending at dock');
    expect(rows[0].startable).toBe(true);
  });

  it('separate vehicles stay separate; non-startable stages flagged false', () => {
    const rows = buildExpectedVehicles(
      [
        card({ stage: 'BOOKED', vehicle_id: 1, dispatch_date: '2026-06-21' }),
        card({ stage: 'EMPTY_IN', vehicle_id: 2, dispatch_date: '2026-06-20' }),
      ],
      ['READY_TO_DOCK'],
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.startable === false)).toBe(true);
    // sorted by dispatch date when neither is startable
    expect(rows[0].vehicleId).toBe(2);
  });

  it('falls back to vehicle_no when vehicle_id is null', () => {
    const rows = buildExpectedVehicles(
      [
        card({ stage: 'BOOKED', vehicle_id: null, vehicle_no: 'DL9' }),
        card({ stage: 'BOOKED', vehicle_id: null, vehicle_no: 'DL9' }),
      ],
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].billCount).toBe(2);
  });
});
