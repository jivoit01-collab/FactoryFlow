import { useEffect, useRef, useState } from 'react';

import type { MenuRow, Plan } from '../types';
import { nice, Tl } from '../utils/format';
import { facts, menuOf } from '../utils/plan';

/**
 * The pick window: what runs first on this machine, and why. One tap on a
 * reason is enough; words are better — they are what the plan learns from.
 * ``row`` null is "None of these": type what should run here instead.
 */
export function PickSheet({
  plan,
  m,
  row,
  reasons,
  you,
  busy,
  onCancel,
  onSave,
}: {
  plan: Plan;
  m: string;
  row: MenuRow | null;
  reasons: string[];
  you: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (why: string, other: string) => void;
}) {
  const [chips, setChips] = useState<string[]>([]);
  const [words, setWords] = useState('');
  const [other, setOther] = useState('');
  const first = useRef<HTMLInputElement | HTMLButtonElement | null>(null);
  useEffect(() => {
    first.current?.focus();
  }, []);

  const menu = menuOf(plan, m);
  const top = menu.top3
    .map((id) => menu.rows.find((x) => x.job === id))
    .filter(Boolean) as MenuRow[];
  const offered = top.map((x) => `#${x.rank} ${nice(x.name)}`).join(', ');
  const why = [chips.join(', '), words.trim()].filter(Boolean).join(' — ');
  const ready = !!why && (row !== null || !!other.trim());

  let title: string;
  let sub: string;
  if (row === null) {
    title = `Something else first on ${m}?`;
    sub = `${top.length ? `We offered: ${offered}. ` : ''}Type what should run here instead, then why.`;
  } else if (row.held) {
    const what = row.material?.kind === 'oil' ? 'oil' : 'packaging';
    title = `Give the ${what} to ${nice(row.name)} first, on ${m}?`;
    sub =
      `${nice(row.material?.name)} is short. Your pick puts this item first in line for it (${Tl(row.could_l)}); ` +
      `whatever loses the ${what} will say it went to your pick.` +
      (top.length ? ` Our top three: ${offered}.` : '');
  } else {
    title = `Run ${nice(row.name)} first on ${m}?`;
    sub = `It is our #${row.rank} on ${m}.${top.length ? ` Our top three: ${offered}.` : ''}`;
  }
  const fx = row ? facts(plan, row) : [];

  return (
    <div className="tr-sheet" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="sheet-box" role="dialog" aria-modal="true" aria-labelledby="tr-sheet-t">
        <div className="sheet-t" id="tr-sheet-t">
          {title}
        </div>
        <div className="small">{sub}</div>
        {fx.length ? (
          <ul className="sheet-d">
            {fx.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        ) : null}
        {row === null ? (
          <input
            ref={(el) => {
              first.current = el;
            }}
            className="tr-field"
            type="text"
            maxLength={120}
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="What should run here first? The product, in your words (e.g. Mustard 5 L, or an SKU code)"
          />
        ) : null}
        <div className="chips">
          {reasons.map((x, i) => (
            <button
              key={x}
              ref={
                i === 0 && row !== null
                  ? (el) => {
                      first.current = el;
                    }
                  : undefined
              }
              type="button"
              className={`chip${chips.includes(x) ? ' on' : ''}`}
              aria-pressed={chips.includes(x)}
              onClick={() =>
                setChips((c) => (c.includes(x) ? c.filter((y) => y !== x) : [...c, x]))
              }
            >
              {x}
            </button>
          ))}
        </div>
        <textarea
          className="tr-field"
          rows={3}
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder="Why this one? In your own words: this is what the plan learns from."
        />
        <div className="sheet-row">
          <span className="small">Picked by {you}</span>
          <span>
            <button className="btn" type="button" onClick={onCancel}>
              Cancel
            </button>{' '}
            <button
              className="btn go"
              type="button"
              disabled={!ready || busy}
              onClick={() => onSave(why, other.trim())}
            >
              {busy ? 'Saving…' : 'Save my pick'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
