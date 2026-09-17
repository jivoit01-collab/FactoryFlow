import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CAROUSEL_SLIDES } from '../constants';

/**
 * Every board's wall geometry must be reachable without `:fullscreen`.
 *
 * THE BUG THIS EXISTS FOR
 * These boards are designed as one viewport with nothing below the fold, and
 * each keeps a relaxed, growing layout for the scrolling app shell plus a
 * `:fullscreen` block that restores the exact wall geometry. The carousel
 * breaks that assumption: the browser promotes the CAROUSEL SHELL, so
 * `:fullscreen` never matches the board, the relaxed layout stays, and the
 * board overflows the screen it was given. On the plant board that silently
 * clipped the fourth band — Shifting — off the bottom edge.
 *
 * The fix is the `.ops-wall` marker (see `ops-board.css`), and the failure mode
 * is that somebody adds or edits a board, writes its `:fullscreen` block, and
 * does not write the `.ops-wall` twin. Nothing fails: the board looks right at
 * its own address and loses a band on the wall, where nobody is standing to
 * notice.
 *
 * So this reads the stylesheets. Crude, and the right level for the problem —
 * jsdom does no layout, so the real defect is invisible to a render test, and
 * what actually went wrong was a missing rule rather than wrong markup.
 */
const DASHBOARDS = join(process.cwd(), 'src', 'modules', 'dashboards');

/**
 * Which module's stylesheets each slide is drawn from.
 *
 * Only the boards in the rotation are checked. A board elsewhere in the product
 * may perfectly well have `:fullscreen` rules and no `.ops-wall` ones — it is
 * never inside the carousel, so nothing is lost. The map is asserted complete
 * against the slide list below, so putting a fourth board in the rotation fails
 * here until somebody has said where its stylesheets live and checked them.
 */
const SLIDE_MODULES: Record<(typeof CAROUSEL_SLIDES)[number]['key'], string> = {
  admin: 'admin-control',
  plant: 'plant-board',
  logistics: 'logistics-control',
};

/** Every stylesheet belonging to a board in the rotation, with its path. */
function stylesheets(): { path: string; css: string }[] {
  const found: { path: string; css: string }[] = [];
  for (const module of Object.values(SLIDE_MODULES)) {
    const dir = join(DASHBOARDS, module, 'styles');
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.css'))) {
      found.push({
        path: `${module}/styles/${file}`,
        css: readFileSync(join(dir, file), 'utf8'),
      });
    }
  }
  return found;
}

/**
 * The selectors in a stylesheet that style an element BECAUSE it is fullscreen.
 *
 * Comment bodies are stripped first — every one of these files explains itself
 * at length, and the word "fullscreen" in prose is not a rule.
 */
function fullscreenSelectors(css: string): string[] {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...code.matchAll(/^\s*([^{}]*:fullscreen[^{}]*?)\s*[,{]/gm)].map((match) =>
    match[1].trim(),
  );
}

describe('wall geometry is reachable from inside the carousel', () => {
  const sheets = stylesheets();

  it('covers every board in the rotation', () => {
    // Without this a new slide would simply not be checked, and the assertions
    // below would keep passing while its last band went off the bottom edge.
    for (const slide of CAROUSEL_SLIDES) {
      expect(
        SLIDE_MODULES[slide.key],
        `no stylesheet folder recorded for ${slide.key}`,
      ).toBeTruthy();
    }
    expect(sheets.map((sheet) => sheet.path)).toContain('plant-board/styles/plant-board.css');
  });

  it.each(sheets.filter((sheet) => fullscreenSelectors(sheet.css).length > 0))(
    '$path pairs its :fullscreen rules with .ops-wall',
    ({ css, path }) => {
      expect(
        css.includes('.ops-wall'),
        `${path} styles a board for fullscreen but never for .ops-wall, so that ` +
          `geometry is lost inside the board carousel — the board keeps its ` +
          `scrolling-shell layout and overflows the screen. Add an .ops-wall ` +
          `block beside the :fullscreen one (see ops-board.css for why the two ` +
          `must not share a selector list).`,
      ).toBe(true);
    },
  );

  it('keeps the two rule sets apart, so neither can drop the other', () => {
    // A browser that does not understand `:-webkit-full-screen` discards the
    // whole selector list it appears in. The wall rules must not be in one.
    for (const { css, path } of sheets) {
      for (const selector of fullscreenSelectors(css)) {
        expect(selector.includes('.ops-wall'), `${path}: ${selector}`).toBe(false);
      }
    }
  });
});
