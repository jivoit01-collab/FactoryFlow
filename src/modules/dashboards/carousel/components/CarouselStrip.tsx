import { Link } from 'react-router-dom';

import type { CarouselSlide } from '../constants';
import { DWELL_CHOICES, OVERSCAN_CHOICES } from '../constants';

/**
 * Icons, drawn inline.
 *
 * The same reasoning as the board's own corner icons: everything on this strip
 * is sized against the board's `--u` so it scales with the screen, and an icon
 * from the component set would carry a fixed pixel size into a layout that has
 * none.
 */
function PrevIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M9 4v16M15 4v16" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M7 4v16l13-8z" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function FullscreenIcon({ exit }: { exit: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {exit ? (
        <>
          <path d="M9 3v6H3" />
          <path d="M15 3v6h6" />
          <path d="M15 21v-6h6" />
          <path d="M9 21v-6H3" />
        </>
      ) : (
        <>
          <path d="M3 9V3h6" />
          <path d="M21 9V3h-6" />
          <path d="M21 15v6h-6" />
          <path d="M3 15v6h6" />
        </>
      )}
    </svg>
  );
}

export interface CarouselStripProps {
  slides: readonly CarouselSlide[];
  index: number;
  progress: number;
  remaining: number;
  paused: boolean;
  dwellSeconds: number;
  /** How much of each edge the television is eating, as a percentage. */
  overscanPercent: number;
  visible: boolean;
  isFullscreen: boolean;
  onGoTo: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePaused: () => void;
  onDwellChange: (seconds: number) => void;
  onOverscanChange: (percent: number) => void;
  onToggleFullscreen: () => void;
}

/**
 * The carousel's own chrome: which board is up, how long it has left, and the
 * four things a person standing at the screen might want to do about it.
 *
 * It takes NO height from the board. The boards below are designed as a full
 * viewport with nothing under the fold and size themselves in `vh`, so chrome
 * that occupied a row would push their last band off the bottom edge — see the
 * note at the head of `carousel.css`. So this floats over the board's own
 * header instead, and earns that by being one row: dots rather than tabs, a
 * countdown rather than a second clock (the board carries one), and no heading
 * at all, since the board names itself underneath.
 *
 * The progress line is pinned to the screen's top edge, above the row, and
 * stays drawn even when the rest has faded out. On a wall it is the only thing
 * that says the screen is a rotation rather than a board that happens to have
 * changed.
 */
export function CarouselStrip({
  slides,
  index,
  progress,
  remaining,
  paused,
  dwellSeconds,
  overscanPercent,
  visible,
  isFullscreen,
  onGoTo,
  onPrevious,
  onNext,
  onTogglePaused,
  onDwellChange,
  onOverscanChange,
  onToggleFullscreen,
}: CarouselStripProps) {
  const current = slides[index];

  return (
    <div className="bcx-strip" data-visible={visible ? 'yes' : 'no'}>
      {/* First, so it sits on the screen's very top edge — and outside the
          fading row on purpose, because it is what tells a wall this screen is
          a rotation at all. See the component note. */}
      <div className="bcx-progress" data-paused={paused ? 'yes' : 'no'}>
        <i style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      <div className="bcx-row">
        <div className="bcx-state" data-paused={paused ? 'yes' : 'no'}>
          <i />
          {paused ? 'HELD' : 'ROTATING'}
        </div>

        {/* One dot per board, named. A wall reader has to be able to tell what
            is coming without waiting for it. */}
        <div className="bcx-dots" role="tablist" aria-label="Boards in this rotation">
          {slides.map((slide, position) => (
            <button
              key={slide.key}
              type="button"
              role="tab"
              aria-selected={position === index}
              className="bcx-dot"
              data-active={position === index ? 'yes' : 'no'}
              onClick={() => onGoTo(position)}
              title={`Show ${slide.label}`}
            >
              <span>{slide.label}</span>
            </button>
          ))}
        </div>

        <div className="bcx-count">
          {paused ? 'held' : `${remaining}s`}
          <em>{paused ? 'not rotating' : `of ${dwellSeconds}s`}</em>
        </div>

        <div className="bcx-controls">
          <button
            type="button"
            className="bcx-btn"
            onClick={onPrevious}
            aria-label="Previous board"
            title="Previous board (←)"
          >
            <PrevIcon />
          </button>
          <button
            type="button"
            className="bcx-btn"
            onClick={onTogglePaused}
            aria-pressed={paused}
            // The label says what pressing it does next, not what the state is.
            aria-label={paused ? 'Resume rotation' : 'Hold this board'}
            title={paused ? 'Resume rotation (space)' : 'Hold this board (space)'}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </button>
          <button
            type="button"
            className="bcx-btn"
            onClick={onNext}
            aria-label="Next board"
            title="Next board (→)"
          >
            <NextIcon />
          </button>

          <label className="bcx-dwell">
            <span className="bcx-sr">Seconds per board</span>
            <select
              value={dwellSeconds}
              onChange={(event) => onDwellChange(Number(event.target.value))}
              title="How long each board holds the screen"
            >
              {DWELL_CHOICES.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds < 60 ? `${seconds}s` : `${seconds / 60} min`}
                </option>
              ))}
            </select>
          </label>

          {/* Overscan compensation. Sits here rather than in a settings page
              because the person who needs it is standing in front of the
              television, watching the edge of the board disappear, and there is
              no way to judge the right amount except by looking. */}
          <label className="bcx-dwell">
            <span className="bcx-sr">Shrink to fit the screen</span>
            <select
              value={overscanPercent}
              onChange={(event) => onOverscanChange(Number(event.target.value))}
              title="Shrink the board, for a television that crops the picture it is sent"
            >
              {OVERSCAN_CHOICES.map((percent) => (
                <option key={percent} value={percent}>
                  {percent === 0 ? 'Fit: full' : `Fit: −${percent}%`}
                </option>
              ))}
            </select>
          </label>

          {current && (
            <Link
              to={current.path}
              className="bcx-btn"
              aria-label={`Open ${current.label} on its own`}
              title={`Open ${current.label} on its own`}
            >
              <OpenIcon />
            </Link>
          )}

          <button
            type="button"
            className="bcx-btn"
            onClick={onToggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Show fullscreen'}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Show fullscreen (F)'}
          >
            <FullscreenIcon exit={isFullscreen} />
          </button>
        </div>
      </div>
    </div>
  );
}
