/**
 * Tests for the org chart — the module's most intricate screen.
 *
 * What is worth pinning down is the behaviour that makes a large chart usable,
 * because each of these silently degrades into "the chart is unreadable" rather
 * than into an error:
 *
 * * it opens partly collapsed, and says how many people are hidden behind a
 *   collapsed branch;
 * * a branch expands and collapses on its toggle;
 * * a search opens the way down to a match and leaves the rest shut;
 * * clearing the search puts the chart back as the reader had it, rather than
 *   leaving every branch a search opened.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { OrgChart } from '../components/OrgChart';
import type { OrgTreeNode } from '../types';

function node(
  id: number,
  name: string,
  level: number,
  children: OrgTreeNode[] = [],
): OrgTreeNode {
  const subtree = children.reduce((total, child) => total + 1 + child.subtree_size, 0);
  return {
    id,
    employee_code: `EMP00${id}`,
    full_name: name,
    email: '',
    phone: '',
    photo: null,
    initials: name.slice(0, 1),
    job_title: `${name}'s role`,
    department: null,
    department_name: 'Technology',
    designation: null,
    designation_name: null,
    employment_status: 'ACTIVE',
    status_display: 'Active',
    hierarchy_level: level,
    is_manager: children.length > 0,
    location: '',
    direct_report_count: children.length,
    manager_id: null,
    subtree_size: subtree,
    children,
  };
}

/** Four levels, so the default expansion leaves the deepest one hidden. */
function forest() {
  return [
    node(1, 'Arun Mehta', 1, [
      node(2, 'Priya Nair', 2, [
        node(3, 'Sandeep Rao', 3, [node(4, 'Kavya Iyer', 4)]),
      ]),
      node(5, 'Rajesh Kulkarni', 2),
    ]),
  ];
}

function renderChart(overrides: Partial<Parameters<typeof OrgChart>[0]> = {}) {
  const onViewChange = vi.fn();
  const result = render(
    <MemoryRouter>
      <OrgChart roots={forest()} view="tree" onViewChange={onViewChange} {...overrides} />
    </MemoryRouter>,
  );
  return { ...result, onViewChange };
}

describe('OrgChart', () => {
  it('draws the tree from the top down', () => {
    renderChart();
    expect(screen.getByText('Arun Mehta')).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    expect(screen.getByText('Sandeep Rao')).toBeInTheDocument();
  });

  it('opens partly collapsed, hiding the deepest level', () => {
    renderChart();
    // Level 4 is behind Sandeep's collapsed toggle.
    expect(screen.queryByText('Kavya Iyer')).not.toBeInTheDocument();
  });

  it('says how many people a collapsed branch is hiding', () => {
    renderChart();
    const toggle = screen.getByTitle("Show 1 direct report(s)");
    expect(toggle).toBeInTheDocument();
  });

  it('expands and collapses a branch on its toggle', () => {
    renderChart();

    fireEvent.click(screen.getByTitle('Show 1 direct report(s)'));
    expect(screen.getByText('Kavya Iyer')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Hide Sandeep Rao's team"));
    expect(screen.queryByText('Kavya Iyer')).not.toBeInTheDocument();
  });

  it('opens the way down to a search match and leaves the rest shut', () => {
    renderChart();

    fireEvent.change(screen.getByPlaceholderText(/Find someone in the chart/i), {
      target: { value: 'Kavya' },
    });

    // The match is revealed…
    expect(screen.getByText('Kavya Iyer')).toBeInTheDocument();
    // …and the chart says how many it found.
    expect(screen.getByText('1 match')).toBeInTheDocument();
  });

  it('puts the chart back as the reader had it when the search is cleared', () => {
    renderChart();

    const box = screen.getByPlaceholderText(/Find someone in the chart/i);
    fireEvent.change(box, { target: { value: 'Kavya' } });
    expect(screen.getByText('Kavya Iyer')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Clear the chart search'));
    // Back to the default depth — the search was a lens, not an edit.
    expect(screen.queryByText('Kavya Iyer')).not.toBeInTheDocument();
  });

  it('collapses the whole chart on demand', () => {
    renderChart();

    fireEvent.click(screen.getByTitle('Collapse the whole chart'));
    expect(screen.getByText('Arun Mehta')).toBeInTheDocument();
    expect(screen.queryByText('Priya Nair')).not.toBeInTheDocument();
  });

  it('opens somebody when their card is clicked', () => {
    const onOpen = vi.fn();
    renderChart({ onOpen });

    fireEvent.click(screen.getByText('Priya Nair'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it('re-roots the chart on somebody from their own card', () => {
    const onFocus = vi.fn();
    renderChart({ onFocus });

    fireEvent.click(screen.getByLabelText("Show only Priya Nair's organisation"));
    expect(onFocus).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it('does not offer to re-root on the person it is already rooted on', () => {
    renderChart({ onFocus: vi.fn(), rootId: 1 });
    expect(
      screen.queryByLabelText("Show only Arun Mehta's organisation"),
    ).not.toBeInTheDocument();
  });

  it('marks the logged-in user on their own card', () => {
    renderChart({ selfEmployeeId: 2 });
    expect(screen.getByLabelText('This is you')).toBeInTheDocument();
  });

  it('says so, rather than drawing nothing, when there is no tree', () => {
    render(
      <MemoryRouter>
        <OrgChart roots={[]} view="tree" onViewChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nothing to chart yet')).toBeInTheDocument();
  });

  it('renders the same tree as an indented list, with its own toggles', () => {
    renderChart({ view: 'list' });
    expect(screen.getByText('Arun Mehta')).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    // The list view collapses and expands the same branches.
    fireEvent.click(screen.getByLabelText("Hide Arun Mehta's team"));
    expect(screen.queryByText('Priya Nair')).not.toBeInTheDocument();
  });
});
