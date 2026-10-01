/**
 * Old Production QC and Documents addresses land on their QA Reports page,
 * keeping the rest of the path (an entry's id) and the query.
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
            <RedirectPathPrefix from="/qc/production/parameter-types" to="/qc/qa-reports/types" />
          }
        />
        <Route
          path="/qc/production/*"
          element={<RedirectPathPrefix from="/qc/production" to="/qc/qa-reports" />}
        />
        <Route
          path="/qc/documents/*"
          element={<RedirectPathPrefix from="/qc/documents" to="/qc/qa-reports" />}
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.getByTestId('where').textContent;
}

describe('RedirectPathPrefix', () => {
  it.each([
    ['/qc/production', '/qc/qa-reports'],
    ['/qc/production?date=2026-09-29&view=sheet', '/qc/qa-reports?date=2026-09-29&view=sheet'],
    ['/qc/production/entries/7', '/qc/qa-reports/entries/7'],
    ['/qc/production/entries/7/edit', '/qc/qa-reports/entries/7/edit'],
    ['/qc/production/new?run=11&type=3', '/qc/qa-reports/new?run=11&type=3'],
    ['/qc/production/parameter-types', '/qc/qa-reports/types'],
    ['/qc/production/parameter-types/3', '/qc/qa-reports/types/3'],
    ['/qc/documents?date=2026-10-01', '/qc/qa-reports?date=2026-10-01'],
    ['/qc/documents/entries/7/edit', '/qc/qa-reports/entries/7/edit'],
    ['/qc/documents/new?type=3', '/qc/qa-reports/new?type=3'],
    ['/qc/documents/types/3', '/qc/qa-reports/types/3'],
  ])('sends %s to %s', (from, to) => {
    expect(renderAt(from)).toBe(to);
  });
});
