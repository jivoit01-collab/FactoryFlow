import { useState } from 'react';

import { usePlanningSheets, usePutInSheet } from '../api';
import type { PlanningSheet } from '../types';
import { dShort, n0, when } from '../utils/format';

const FIELD_WORDS: Record<string, string> = {
  code: 'Code',
  name: 'Item',
  plan: "Month's plan",
  ecom: 'Ecom',
  stock: 'Stock',
  net: 'Net Req',
  machine: 'Machine',
};

/**
 * Put in the planning team's sheet. "Today the sheet comes as an Excel. A page
 * on the factory app will take its place" — this is that page. The newest
 * sheet put in is in charge until a newer one is put in.
 */
export function SheetUpload({
  onClose,
  onReadAgain,
  reading,
}: {
  onClose: () => void;
  onReadAgain: () => void;
  reading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [stockDate, setStockDate] = useState('');
  const [done, setDone] = useState<(PlanningSheet & { lines: unknown[] }) | null>(null);
  const put = usePutInSheet();
  const sheets = usePlanningSheets(true);
  const needsDate = /\b(date|stock)\b/i.test(
    (put.error as { message?: string } | null)?.message || '',
  );

  const submit = () => {
    if (!file) return;
    put.mutate({ file, stockDate: stockDate || undefined }, { onSuccess: (s) => setDone(s) });
  };

  return (
    <div className="tr-sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet-box" role="dialog" aria-modal="true" aria-labelledby="tr-up-t">
        <div className="sheet-t" id="tr-up-t">
          {done ? 'The sheet is in charge' : 'Put in a planning sheet'}
        </div>
        {done ? (
          <>
            <p className="small">
              {done.file_name}: tab {done.tab}, {done.line_count} lines, Net Req{' '}
              {n0(Number(done.net_req_l))} L. Stock taken off as at {dShort(done.stock_date)} (
              {done.date_basis}); what the plant made counts from the day after.
            </p>
            <ul className="sheet-d">
              {Object.entries(done.columns).map(([k, v]) => (
                <li key={k}>
                  {FIELD_WORDS[k] || k}: column {v}
                </li>
              ))}
            </ul>
            <p className="small">
              Check the columns above are the right ones. The 7 pm read uses it tonight; read the
              plan again now to see tomorrow on this sheet.
            </p>
            <div className="sheet-row">
              <span />
              <span>
                <button className="btn" type="button" onClick={onClose}>
                  Close
                </button>{' '}
                <button className="btn go" type="button" disabled={reading} onClick={onReadAgain}>
                  {reading ? 'Reading…' : 'Read the plan again now'}
                </button>
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="small">
              The planning team&rsquo;s Excel: the tab with the CODE and Net Req columns is read,
              every other column by its header. The stock date is taken from the file name (e.g.
              19.09.2026); give it below if the name has none.
            </p>
            <input
              className="tr-field"
              type="file"
              accept=".xlsx,.xlsm"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                put.reset();
              }}
            />
            <label className="small tr-date">
              Stock taken off as at{' '}
              <input
                className="tr-field"
                type="date"
                value={stockDate}
                onChange={(e) => setStockDate(e.target.value)}
                aria-describedby="tr-up-date"
              />
            </label>
            <div className="small" id="tr-up-date">
              {needsDate
                ? 'This file name carries no date: say which day’s stock the sheet took off.'
                : 'Leave empty to use the date in the file name.'}
            </div>
            <div className="sheet-row">
              <span />
              <span>
                <button className="btn" type="button" onClick={onClose}>
                  Cancel
                </button>{' '}
                <button
                  className="btn go"
                  type="button"
                  disabled={!file || put.isPending}
                  onClick={submit}
                >
                  {put.isPending ? 'Reading the sheet…' : 'Put it in'}
                </button>
              </span>
            </div>
          </>
        )}
        {(sheets.data?.results || []).length ? (
          <details className="tr-sheets">
            <summary>
              Sheets put in <span>{sheets.data?.results.length}</span>
            </summary>
            <ul className="wg-items">
              {sheets.data?.results.map((s) => (
                <li key={s.id}>
                  <span className="small">{s.in_charge ? 'in charge' : when(s.uploaded_at)}</span>
                  <span className="wi-n">
                    {s.file_url ? (
                      <a href={s.file_url} target="_blank" rel="noreferrer">
                        {s.file_name}
                      </a>
                    ) : (
                      s.file_name
                    )}
                    <div className="small">
                      {s.line_count} lines · stock {dShort(s.stock_date)} · by{' '}
                      {s.uploaded_by || '—'}
                    </div>
                  </span>
                  <span className="wi-t">{n0(Number(s.net_req_l))} L</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}
