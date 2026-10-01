/**
 * Old Production QC addresses land on their Documents page, keeping the rest of
 * the path (an entry's id) and the query.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { RedirectPathPrefix } from '../../components/RedirectPathPrefix';

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/qc/production/parameter-types/*"
          element={
            <RedirectPathPrefix from="/qc/production/parameter-types" to="/qc/documents/types" />
          }
        />
        <Route
          path="/qc/production/*"
          element={<RedirectPathPrefix from="/qc/production" to="/qc/documents" />}
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.getByTestId('where').textContent;
}

describe('RedirectPathPrefix', () => {
  it.each([
    ['/qc/production', '/qc/documents'],
    ['/qc/production?date=2026-09-29&view=sheet', '/qc/documents?date=2026-09-29&view=sheet'],
    ['/qc/production/entries/7', '/qc/documents/entries/7'],
    ['/qc/production/entries/7/edit', '/qc/documents/entries/7/edit'],
    ['/qc/production/new?run=11&type=3', '/qc/documents/new?run=11&type=3'],
    ['/qc/production/parameter-types', '/qc/documents/types'],
    ['/qc/production/parameter-types/3', '/qc/documents/types/3'],
  ])('sends %s to %s', (from, to) => {
    expect(renderAt(from)).toBe(to);
  });
});
