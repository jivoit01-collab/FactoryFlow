import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CONTROLLED_DOCUMENTS } from '@/config/constants';

import { useEtpPrintDocument } from '../usePrintDocument';

const FACTORY_WIDE = {
  id: 1,
  document_key: 'ETP_SLUDGE_GENERATION',
  document_key_label: 'Sludge Generation Record',
  company: null,
  company_code: null,
  form_name: 'SLUDGE GENERATION RECORD',
  document_code: 'QA-FRM-14-00-08-06',
  revision: '01',
  issue_date: '2026-08-25',
  document_id: '',
  notes: '',
  is_active: true,
};

const OIL_OVERRIDE = {
  ...FACTORY_WIDE,
  id: 2,
  company: 3,
  company_code: 'JIVO_OIL',
  document_code: 'OIL-SLUDGE-01',
  revision: '02',
  document_id: 'COPY-7',
};

const rows = vi.hoisted(() => ({ current: [] as unknown[] }));

vi.mock('../api', () => ({
  useEtpPrintDocuments: () => ({ data: rows.current, isLoading: false }),
}));

vi.mock('@/core/auth', () => ({
  useAuth: () => ({ currentCompany: { company_code: 'JIVO_OIL' } }),
}));

describe('resolving a register’s document number', () => {
  it('prints the number stored for the whole factory', () => {
    rows.current = [FACTORY_WIDE];
    const { result } = renderHook(() => useEtpPrintDocument());

    const resolved = result.current('ETP_SLUDGE_GENERATION');
    expect(resolved.fromDatabase).toBe(true);
    expect(resolved.doc.code).toBe('QA-FRM-14-00-08-06');
    expect(resolved.doc.revision).toBe('01');
    // Stored as an ISO date, printed the way the controlled documents read.
    expect(resolved.doc.issueDate).toBe('25-08-2026');
  });

  it('lets one company override the factory-wide number', () => {
    rows.current = [FACTORY_WIDE, OIL_OVERRIDE];
    const { result } = renderHook(() => useEtpPrintDocument());

    const resolved = result.current('ETP_SLUDGE_GENERATION');
    expect(resolved.doc.code).toBe('OIL-SLUDGE-01');
    expect(resolved.doc.revision).toBe('02');
    expect(resolved.documentId).toBe('COPY-7');
  });

  it('falls back to the built-in code for a form nobody has configured', () => {
    rows.current = [FACTORY_WIDE];
    const { result } = renderHook(() => useEtpPrintDocument());

    const resolved = result.current('ETP_CALIBRATION_RECORD');
    expect(resolved.fromDatabase).toBe(false);
    expect(resolved.doc.code).toBe(CONTROLLED_DOCUMENTS.ETP_CALIBRATION_RECORD.code);
  });

  it('ignores a row that was deactivated', () => {
    rows.current = [{ ...FACTORY_WIDE, is_active: false }];
    const { result } = renderHook(() => useEtpPrintDocument());

    expect(result.current('ETP_SLUDGE_GENERATION').fromDatabase).toBe(false);
  });
});
