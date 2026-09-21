import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/shared/utils';

import { DRAG_TYPE } from '../constants';
import type { CardSpec } from '../types';
import { ACCENT_CLASS } from './CardFace';

/**
 * The cards this author may place, grouped by subject.
 *
 * ALREADY FILTERED, NOT GREYED OUT. The server sends only the cards whose
 * feed rights this login holds, so there is no disabled state to render here.
 * That is a disclosure decision rather than a UI one: listing a card by name
 * tells somebody what exists behind a wall they cannot open.
 *
 * WHY A CHIP CARRIES ITS FOOTPRINT ON ITS FACE
 * A card's size is fixed by the card, not chosen by the author, which is only
 * a pleasant constraint if they can see it before they drag. "2x1" on the
 * chip is the difference between placing a card and discovering it does not
 * fit.
 */

export interface CardPaletteProps {
  cards: CardSpec[];
  /** Keys already on the board, so the palette can mark them as placed. */
  placedKeys: string[];
  /** Click-to-add, for a card whose drop target the author cannot be bothered
   *  to aim at. Lands in the first free cell in reading order. */
  onAdd: (spec: CardSpec) => void;
}

export function CardPalette({ cards, placedKeys, onAdd }: CardPaletteProps) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? cards.filter(
          (card) =>
            card.title.toLowerCase().includes(needle) ||
            card.summary.toLowerCase().includes(needle) ||
            card.category.toLowerCase().includes(needle),
        )
      : cards;

    const groups = new Map<string, CardSpec[]>();
    for (const card of matching) {
      const bucket = groups.get(card.category) ?? [];
      bucket.push(card);
      groups.set(card.category, bucket);
    }
    return [...groups.entries()];
  }, [cards, query]);

  const placed = new Set(placedKeys);

  return (
    <aside className="cbx-palette">
      <div className="cbx-palette-search">
        <Search className="h-4 w-4" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search cards"
          aria-label="Search cards"
        />
      </div>

      {grouped.length === 0 && (
        <p className="cbx-palette-empty">
          {cards.length === 0
            ? 'You hold no data rights that any card reads yet. Ask an administrator for a Dashboards group.'
            : `Nothing matches “${query}”.`}
        </p>
      )}

      <div className="cbx-palette-list">
        {grouped.map(([category, entries]) => (
          <section key={category}>
            <h3>{category}</h3>
            {entries.map((card) => (
              <article
                key={card.key}
                className={cn('cbx-chip', ACCENT_CLASS[card.accent])}
                draggable
                onDragStart={(event) => {
                  // A custom MIME type, not text/plain: a card dragged onto a
                  // text field elsewhere in the app must not paste a card key
                  // into it, and stray text dragged onto the canvas must not
                  // be mistaken for a card.
                  event.dataTransfer.setData(
                    DRAG_TYPE,
                    JSON.stringify({ kind: 'new', cardKey: card.key }),
                  );
                  event.dataTransfer.effectAllowed = 'copy';
                }}
                onDoubleClick={() => onAdd(card)}
                title={card.note || card.summary}
              >
                <div className="cbx-chip-head">
                  <b>{card.title}</b>
                  {/* The fixed footprint, so it is known before the drag. */}
                  <span className="cbx-chip-size">
                    {card.columns}×{card.rows}
                  </span>
                </div>
                <p>{card.summary}</p>
                <div className="cbx-chip-foot">
                  {placed.has(card.key) && <em>already on this board</em>}
                  {card.needs_sap && <em className="cbx-chip-sap">reads SAP</em>}
                  <button type="button" onClick={() => onAdd(card)}>
                    Add
                  </button>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
