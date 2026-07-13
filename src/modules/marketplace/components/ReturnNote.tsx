/**
 * Printable Return Note — the internal document of record for a submitted return.
 * Non-SAP: it evidences which items came back against an order and the credit
 * (Return Note) number issued. Rendered to an A4 page via react-to-print.
 */
import { Printer } from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

import { Button } from '@/shared/components/ui';

import type { MarketplaceReturn } from '../types/marketplace.types';

const A4_PAGE_STYLE = `
  @page { size: A4; margin: 16mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const num = (v?: string | number | null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : '—';
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, color: '#666' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{value || '—'}</span>
    </div>
  );
}

/** The document itself — kept separate so it can be printed off-screen. */
function ReturnNoteDoc({
  mpReturn,
  companyName,
}: {
  mpReturn: MarketplaceReturn;
  companyName: string;
}) {
  const noteNo = mpReturn.return_note_num || mpReturn.internal_credit_doc_num || '—';
  const items = (mpReturn.progress ?? []).filter((p) => Number(p.scanned_quantity) > 0);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#111', padding: 4, width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #111',
          paddingBottom: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{companyName || 'Marketplace'}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{mpReturn.channel} · Inward Return</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>RETURN NOTE</div>
          <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700 }}>{noteNo}</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Field label="Order ID" value={mpReturn.order_id} />
        <Field label="Buyer" value={mpReturn.buyer_name || '—'} />
        <Field label="Status" value={mpReturn.status} />
        <Field label="Submitted by" value={mpReturn.submitted_by_name || '—'} />
        <Field label="Submitted at" value={fmtDate(mpReturn.submitted_at)} />
        <Field label="Channel" value={mpReturn.channel} />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f3f3f3' }}>
            <th style={{ textAlign: 'left', padding: '8px 10px', border: '1px solid #ccc' }}>
              Item Code
            </th>
            <th style={{ textAlign: 'left', padding: '8px 10px', border: '1px solid #ccc' }}>
              Description
            </th>
            <th style={{ textAlign: 'right', padding: '8px 10px', border: '1px solid #ccc', width: 110 }}>
              Returned Qty
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ padding: '12px 10px', border: '1px solid #ccc', color: '#666' }}>
                No returned items recorded.
              </td>
            </tr>
          ) : (
            items.map((it) => (
              <tr key={it.item_code}>
                <td style={{ padding: '8px 10px', border: '1px solid #ccc', fontFamily: 'monospace' }}>
                  {it.item_code}
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #ccc' }}>{it.item_name || '—'}</td>
                <td style={{ padding: '8px 10px', border: '1px solid #ccc', textAlign: 'right' }}>
                  {num(it.scanned_quantity)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#444' }}>
        <div>This is a computer-generated Return Note. No stock/SAP posting is implied.</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ borderTop: '1px solid #999', paddingTop: 4, minWidth: 160 }}>
            Authorised signature
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReturnNoteButton({
  mpReturn,
  companyName,
  variant = 'outline',
}: {
  mpReturn: MarketplaceReturn;
  companyName: string;
  variant?: 'default' | 'outline' | 'ghost';
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: mpReturn.return_note_num || 'Return Note',
    pageStyle: A4_PAGE_STYLE,
  });

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => handlePrint()}>
        <Printer className="mr-2 h-4 w-4" /> Print return note
      </Button>
      <div aria-hidden style={{ position: 'fixed', left: '-10000px', top: 0, width: '190mm' }}>
        <div ref={contentRef}>
          <ReturnNoteDoc mpReturn={mpReturn} companyName={companyName} />
        </div>
      </div>
    </>
  );
}
