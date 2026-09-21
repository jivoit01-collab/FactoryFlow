import { Minus, Plus } from 'lucide-react';

import {
  ACCENT_LABELS,
  ACCENT_ORDER,
  DENSITY_LABELS,
  MODE_HELP,
  MODE_LABELS,
  SURFACE_LABELS,
} from '../constants';
import type {
  BoardAccent,
  BoardDensity,
  BoardDraft,
  BoardMode,
  BoardSurface,
  CatalogueResponse,
} from '../types';

/**
 * The board's own settings: what it is called, how big the grid is, and the
 * finishing touches that apply to all of it.
 *
 * THE GRID SIZE IS THE FIRST DECISION AND THE STEPPERS ENFORCE IT
 * An author picks columns and rows inside the ceilings the server sends,
 * rather than typing a number that is then refused. The row ceiling moves
 * with the MODE — a wall board is capped shorter because it does not scroll
 * and every row has to fit the screen at once — so switching to a wall board
 * can put the current height over the limit, which the parent handles by
 * clamping rather than by blocking the switch.
 */

export interface BoardSettingsProps {
  draft: BoardDraft;
  limits: CatalogueResponse['limits'];
  onChange: (patch: Partial<BoardDraft>) => void;
}

interface StepperProps {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  onChange: (value: number) => void;
  hint?: string;
}

function Stepper({ label, value, minimum, maximum, onChange, hint }: StepperProps) {
  return (
    <div className="cbx-stepper">
      <span>{label}</span>
      <div>
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= minimum}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <b>{value}</b>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= maximum}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {hint && <em>{hint}</em>}
    </div>
  );
}

export function BoardSettings({ draft, limits, onChange }: BoardSettingsProps) {
  const maxRows = limits.max_rows[draft.mode];

  return (
    <div className="cbx-settings">
      <label className="cbx-field">
        <span>Name</span>
        <input
          value={draft.name}
          placeholder="Gate and dispatch wall"
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>

      <label className="cbx-field">
        <span>What it is for</span>
        <textarea
          rows={2}
          value={draft.description}
          placeholder="Shown in the board list and under the heading."
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>

      <label className="cbx-field">
        <span>Built for</span>
        <select
          value={draft.mode}
          onChange={(event) => onChange({ mode: event.target.value as BoardMode })}
        >
          {(Object.keys(MODE_LABELS) as BoardMode[]).map((mode) => (
            <option key={mode} value={mode}>
              {MODE_LABELS[mode]}
            </option>
          ))}
        </select>
        <em>{MODE_HELP[draft.mode]}</em>
      </label>

      <div className="cbx-grid-size">
        <Stepper
          label="Columns"
          value={draft.columns}
          minimum={limits.min_columns}
          maximum={limits.max_columns}
          onChange={(columns) => onChange({ columns })}
        />
        <Stepper
          label="Rows"
          value={draft.rows}
          minimum={limits.min_rows}
          maximum={maxRows}
          onChange={(rows) => onChange({ rows })}
          hint={
            draft.mode === 'WALL'
              ? `At most ${maxRows} — a wall board does not scroll.`
              : `At most ${maxRows}.`
          }
        />
      </div>

      <label className="cbx-field">
        <span>Default colour</span>
        <select
          value={draft.accent}
          onChange={(event) => onChange({ accent: event.target.value as BoardAccent })}
        >
          {ACCENT_ORDER.map((accent) => (
            <option key={accent} value={accent}>
              {ACCENT_LABELS[accent]}
            </option>
          ))}
        </select>
        <em>Cards without a colour of their own take this one.</em>
      </label>

      <label className="cbx-field">
        <span>Surface</span>
        <select
          value={draft.surface}
          onChange={(event) => onChange({ surface: event.target.value as BoardSurface })}
        >
          {(Object.keys(SURFACE_LABELS) as BoardSurface[]).map((surface) => (
            <option key={surface} value={surface}>
              {SURFACE_LABELS[surface]}
            </option>
          ))}
        </select>
      </label>

      <label className="cbx-field">
        <span>Density</span>
        <select
          value={draft.density}
          onChange={(event) => onChange({ density: event.target.value as BoardDensity })}
        >
          {(Object.keys(DENSITY_LABELS) as BoardDensity[]).map((density) => (
            <option key={density} value={density}>
              {DENSITY_LABELS[density]}
            </option>
          ))}
        </select>
      </label>

      <label className="cbx-field cbx-field-check">
        <input
          type="checkbox"
          checked={draft.show_heading}
          onChange={(event) => onChange({ show_heading: event.target.checked })}
        />
        <span>Print the board&rsquo;s name across the top</span>
      </label>

      {draft.mode === 'WALL' && (
        <label className="cbx-field cbx-field-check">
          <input
            type="checkbox"
            checked={draft.in_carousel}
            onChange={(event) => onChange({ in_carousel: event.target.checked })}
          />
          <span>Include in the wall rotation</span>
          {/* Publishing and putting something on the factory wall are
              different decisions, and the second is made by somebody looking
              at the wall — so this is never implied by publishing. */}
          <em>Only once the board is published. Unpublishing takes it off again.</em>
        </label>
      )}
    </div>
  );
}
