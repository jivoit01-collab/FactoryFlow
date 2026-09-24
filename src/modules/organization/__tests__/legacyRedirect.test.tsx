/**
 * The pre-move Attendance and Leave URLs forward to their pages under
 * `/organization/`, keeping the query string — a bookmarked register month or
 * a push notification's deep link must land on the same view.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LegacyRedirect } from '../components/LegacyRedirect';

function Where() {
  const { pathname, search, hash } = useLocation();
  return <p data-testid="where">{`${pathname}${search}${hash}`}</p>;
}

const at = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/attendance/register"
          element={<LegacyRedirect to="/organization/attendance/register" />}
        />
        <Route
          path="/leave/approvals"
          element={<LegacyRedirect to="/organization/leave/approvals" />}
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe('LegacyRedirect', () => {
  it('forwards an old URL to its new home', () => {
    at('/leave/approvals');
    expect(screen.getByTestId('where').textContent).toBe('/organization/leave/approvals');
  });

  it('keeps the query string and hash', () => {
    at('/attendance/register?month=2026-09&department=4#top');
    expect(screen.getByTestId('where').textContent).toBe(
      '/organization/attendance/register?month=2026-09&department=4#top',
    );
  });
});
