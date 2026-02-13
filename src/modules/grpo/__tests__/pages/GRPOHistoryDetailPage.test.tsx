import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// GRPOHistoryDetailPage — File Content Verification
//
// Direct import hangs because GRPOHistoryDetailPage imports
// icons from lucide-react and @/shared/components/ui.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/pages/GRPOHistoryDetailPage.tsx'),
    'utf-8',
  );
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryDetailPage — Exports', () => {
  it('default exports GRPOHistoryDetailPage function', () => {
    const content = readSource();
    expect(content).toContain('export default function GRPOHistoryDetailPage()');
  });

  it('imports icons from lucide-react', () => {
    const content = readSource();
    expect(content).toContain("from 'lucide-react'");
    expect(content).toContain('ArrowLeft');
    expect(content).toContain('AlertCircle');
    expect(content).toContain('ShieldX');
    expect(content).toContain('RefreshCw');
  });

  it('imports UI components from @/shared/components/ui', () => {
    const content = readSource();
    expect(content).toContain("from '@/shared/components/ui'");
    expect(content).toContain('Button');
    expect(content).toContain('Card');
    expect(content).toContain('CardContent');
  });

  it('imports useGRPODetail from api', () => {
    const content = readSource();
    expect(content).toContain('useGRPODetail');
    expect(content).toContain("from '../api'");
  });

  it('imports GRPO_STATUS_CONFIG from constants', () => {
    const content = readSource();
    expect(content).toContain('GRPO_STATUS_CONFIG');
    expect(content).toContain("from '../constants'");
  });

  it('imports useNavigate and useParams from react-router-dom', () => {
    const content = readSource();
    expect(content).toContain('useNavigate');
    expect(content).toContain('useParams');
    expect(content).toContain("from 'react-router-dom'");
  });

  it('imports ApiError type', () => {
    const content = readSource();
    expect(content).toContain('ApiError');
    expect(content).toContain("from '@/core/api/types'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryDetailPage — Header', () => {
  it('renders "Posting Detail" heading', () => {
    const content = readSource();
    expect(content).toContain('>Posting Detail</h2>');
  });

  it('has back button navigating to /grpo/history', () => {
    const content = readSource();
    expect(content).toContain("navigate('/grpo/history')");
  });
});

// ═══════════════════════════════════════════════════════════════
// Posting Information
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryDetailPage — Posting Info', () => {
  it('shows Posting Information section', () => {
    const content = readSource();
    expect(content).toContain('Posting Information');
  });

  it('displays entry_no field', () => {
    const content = readSource();
    expect(content).toContain('Entry No');
    expect(content).toContain('{posting.entry_no}');
  });

  it('displays po_number field', () => {
    const content = readSource();
    expect(content).toContain('PO Number');
    expect(content).toContain('{posting.po_number}');
  });

  it('displays SAP Doc Number field', () => {
    const content = readSource();
    expect(content).toContain('SAP Doc Number');
    expect(content).toContain('{posting.sap_doc_num');
  });

  it('displays SAP Doc Entry field', () => {
    const content = readSource();
    expect(content).toContain('SAP Doc Entry');
    expect(content).toContain('{posting.sap_doc_entry');
  });

  it('displays Total Value with currency formatting', () => {
    const content = readSource();
    expect(content).toContain('Total Value');
    expect(content).toContain('parseFloat(posting.sap_doc_total)');
    expect(content).toContain("currency: 'INR'");
  });

  it('displays Posted At with formatted date', () => {
    const content = readSource();
    expect(content).toContain('Posted At');
    expect(content).toContain('formatDateTime(posting.posted_at)');
  });

  it('uses status config for status badge', () => {
    const content = readSource();
    expect(content).toContain('GRPO_STATUS_CONFIG[posting.status]');
    expect(content).toContain('statusConfig.label');
  });
});

// ═══════════════════════════════════════════════════════════════
// Line Items
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryDetailPage — Line Items', () => {
  it('shows Posted Items section', () => {
    const content = readSource();
    expect(content).toContain('Posted Items');
  });

  it('renders line items with item_code and item_name', () => {
    const content = readSource();
    expect(content).toContain('{line.item_code}');
    expect(content).toContain('{line.item_name}');
  });

  it('shows quantity_posted for each line', () => {
    const content = readSource();
    expect(content).toContain('{line.quantity_posted}');
  });

  it('renders posting.lines.map', () => {
    const content = readSource();
    expect(content).toContain('posting.lines.map');
  });
});

// ═══════════════════════════════════════════════════════════════
// States
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryDetailPage — States', () => {
  it('shows loading spinner', () => {
    const content = readSource();
    expect(content).toContain('isLoading');
    expect(content).toContain('animate-spin');
  });

  it('handles permission error (403)', () => {
    const content = readSource();
    expect(content).toContain('isPermissionError');
    expect(content).toContain('Permission Denied');
  });

  it('handles general error with Failed to Load', () => {
    const content = readSource();
    expect(content).toContain('Failed to Load');
  });

  it('shows error message for failed postings', () => {
    const content = readSource();
    expect(content).toContain('posting.error_message');
    expect(content).toContain('>Error</p>');
  });

  it('has Back to History button', () => {
    const content = readSource();
    expect(content).toContain('Back to History');
  });

  it('parses postingId from URL params', () => {
    const content = readSource();
    expect(content).toContain('const { postingId } = useParams');
    expect(content).toContain('parseInt(postingId, 10)');
  });
});

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryDetailPage — Utilities', () => {
  it('defines formatDateTime helper', () => {
    const content = readSource();
    expect(content).toContain('const formatDateTime');
    expect(content).toContain('toLocaleString');
  });
});
