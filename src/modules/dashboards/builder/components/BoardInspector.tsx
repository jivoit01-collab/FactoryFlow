import { RotateCcw } from 'lucide-react';

import { ACCENT_LABELS, ACCENT_ORDER } from '../constants';
import type { BoardAccent, CardSpec, Placement } from '../types';

/**
 * The selected card's finishing touches: what it is called, what colour it
 * is, and its own settings.
 *
 * WHAT IS NOT HERE, AND WHY
 * Size. A card's footprint belongs to the card — its visualisation is drawn
 * for that shape and a seven-column chart squeezed into a quarter width is
 * seven grey slivers. An author who needs a wider tile needs a different
 * card, and adding a size control here would make every future card's
 * visualisation responsible for working at sizes nobody designed it for.
 *
 * WHY THE COLOUR PICKER IS A LIST OF SEVEN NAMES
 * On these boards colour carries meaning: a hue is a domain, its tints are
 * that domain's composition, and green/amber/red are reserved for condition.
 * A free colour well would let somebody paint a healthy tile red on a wall
 * where red means "this is wrong" — so the author picks an identity and the
 * stylesheet picks the colour, which is also what keeps this card and the
 * same card on the Plant board from being two different teals.
 */

export interface BoardInspectorProps {
  placement: Placement;
  spec: CardSpec | undefined;
  /** The board's default, shown as what "inherit" resolves to. */
  boardAccent: BoardAccent;
  onChange: (patch: Partial<Placement>) => void;
}

export function BoardInspector({
  placement,
  spec,
  boardAccent,
  onChange,
}: BoardInspectorProps) {
  const catalogueTitle = spec?.title ?? placement.card_key;

  return (
    <div className="cbx-inspector">
      <header>
        <h3>{catalogueTitle}</h3>
        <p>{spec?.summary}</p>
        {spec?.note && <p className="cbx-inspector-note">{spec.note}</p>}
      </header>

      <label className="cbx-field">
        <span>Name on this board</span>
        <div className="cbx-field-row">
          <input
            value={placement.title}
            placeholder={catalogueTitle}
            onChange={(event) => onChange({ title: event.target.value })}
          />
          {/* Empty means "use the catalogue's name", so clearing it is a real
              action and needs its own control — a placeholder alone leaves an
              author who typed something with no way back to the default. */}
          <button
            type="button"
            title="Use the card's own name"
            onClick={() => onChange({ title: '' })}
            disabled={!placement.title}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </label>

      <label className="cbx-field">
        <span>Colour</span>
        <select
          value={placement.accent}
          onChange={(event) => onChange({ accent: event.target.value as BoardAccent | '' })}
        >
          <option value="">Board default — {ACCENT_LABELS[boardAccent]}</option>
          {ACCENT_ORDER.map((accent) => (
            <option key={accent} value={accent}>
              {ACCENT_LABELS[accent]}
            </option>
          ))}
        </select>
      </label>

      {spec && spec.options.length > 0 && (
        <fieldset className="cbx-options">
          <legend>This card&rsquo;s settings</legend>
          {spec.options.map((option) => {
            const value = placement.options[option.key] ?? option.default;

            if (option.kind === 'bool') {
              return (
                <label key={option.key} className="cbx-field cbx-field-check">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) =>
                      onChange({
                        options: { ...placement.options, [option.key]: event.target.checked },
                      })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              );
            }

            if (option.kind === 'int') {
              return (
                <label key={option.key} className="cbx-field">
                  <span>{option.label}</span>
                  <input
                    type="number"
                    min={option.minimum}
                    max={option.maximum}
                    value={Number(value)}
                    onChange={(event) =>
                      onChange({
                        options: {
                          ...placement.options,
                          [option.key]: Number(event.target.value),
                        },
                      })
                    }
                  />
                  {option.help && <em>{option.help}</em>}
                </label>
              );
            }

            return (
              <label key={option.key} className="cbx-field">
                <span>{option.label}</span>
                <select
                  value={String(value)}
                  onChange={(event) =>
                    onChange({
                      options: { ...placement.options, [option.key]: event.target.value },
                    })
                  }
                >
                  {option.choices.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
                {option.help && <em>{option.help}</em>}
              </label>
            );
          })}
        </fieldset>
      )}

      <p className="cbx-inspector-foot">
        {spec ? `${spec.columns}×${spec.rows} cells` : 'This card is no longer available.'}
      </p>
    </div>
  );
}
