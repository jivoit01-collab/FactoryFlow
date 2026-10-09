import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';
import { useDebounce } from '@/shared/hooks';
import { formatDay } from '@/shared/utils';

import { useOpenGRPOs } from '../api';
import type { OpenGRPO } from '../types';

/**
 * Open material GRPOs from SAP, searched on the server — by GRPO number, bill
 * number, vendor or gate entry — because there are hundreds of them.
 */
export function GRPOSelect({
  value,
  onChange,
  disabled = false,
}: {
  value?: string;
  onChange: (grpo: OpenGRPO | null) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const { data: grpos = [], isLoading, isError } = useOpenGRPOs(debounced, isOpen);

  return (
    <SearchableSelect<OpenGRPO>
      value={value}
      items={grpos}
      isLoading={isLoading}
      isError={isError}
      label="GRPO"
      required
      placeholder="Search GRPO no., bill no., vendor or gate entry"
      disabled={disabled}
      inputId="ap-invoice-draft-grpo"
      getItemKey={(grpo) => String(grpo.doc_entry)}
      getItemLabel={(grpo) =>
        `${grpo.doc_num} · ${grpo.vendor_name} · ${grpo.reference || 'no bill no.'}`
      }
      // The server already searched — show what it sent.
      filterFn={() => true}
      onSearchChange={setSearch}
      onOpenChange={setIsOpen}
      renderItem={(grpo) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">{grpo.doc_num}</span>
            <span className="text-xs text-muted-foreground">{formatDay(grpo.doc_date)}</span>
            <span className="text-xs">{grpo.warehouses.join(', ')}</span>
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {grpo.vendor_name} · bill {grpo.reference || '—'} · ₹
            {Number(grpo.total).toLocaleString('en-IN')}
          </div>
          {grpo.entry_no ? (
            <div className="text-xs text-destructive">Already entered as {grpo.entry_no}</div>
          ) : grpo.sap_draft_entries.length > 0 ? (
            <div className="text-xs text-amber-700 dark:text-amber-400">
              SAP already has draft {grpo.sap_draft_entries.join(', ')} — it will be linked
            </div>
          ) : null}
        </div>
      )}
      loadingText="Searching SAP…"
      errorText="SAP is not answering. Try again in a moment."
      emptyText="No open GRPO"
      notFoundText="No open GRPO matches"
      onItemSelect={(grpo) => onChange(grpo)}
      onClear={() => onChange(null)}
    />
  );
}
