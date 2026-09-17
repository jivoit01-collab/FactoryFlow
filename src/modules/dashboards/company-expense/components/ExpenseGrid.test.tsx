import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type {
  ElectricityReconciliation,
  ExpenseCell,
  ExpenseColumn,
  ExpenseRow,
} from '../types';
import { ExpenseGrid } from './ExpenseGrid';

const COLUMNS: ExpenseColumn[] = [
  { key: 'SALARY', label: 'Salary' },
  { key: 'ELECTRICITY', label: 'Electricity' },
  { key: 'MAINTENANCE', label: 'Maintenance' },
  { key: 'LABOUR', label: 'Labour' },
];

function cell(partial: Partial<ExpenseCell> = {}): ExpenseCell {
  return {
    amount: '0.00',
    unit: null,
    unit_label: null,
    warning: null,
    note: null,
    ...partial,
  };
}

function row(partial: Partial<ExpenseRow> & Pick<ExpenseRow, 'key' | 'label' | 'kind'>): ExpenseRow {
  return {
    cells: {
      SALARY: cell(),
      ELECTRICITY: cell(),
      MAINTENANCE: cell(),
      LABOUR: cell(),
    },
    total: '0.00',
    ...partial,
  };
}

describe('ExpenseGrid', () => {
  it('names every cost line and where its figures come from', () => {
    render(
      <ExpenseGrid
        columns={COLUMNS}
        rows={[row({ key: 'JIVO_OIL', label: 'Jivo Oil', kind: 'COMPANY' })]}
        total={row({ key: '__total__', label: 'Total', kind: 'TOTAL' })}
        days={12}
      />,
    );

    expect(screen.getByText('Electricity')).toBeInTheDocument();
    // The source line is what stops "Salary" being read as a payroll figure.
    expect(screen.getByText('Daily Electricity register · mains counted in Shared')).toBeInTheDocument();
    expect(screen.getByText('Gate headcount by department × contract rate')).toBeInTheDocument();
  });

  it('draws a rule and the reason where a figure cannot be read', () => {
    render(
      <ExpenseGrid
        columns={COLUMNS}
        rows={[
          row({
            key: 'JIVO_MART',
            label: 'Jivo Mart',
            kind: 'COMPANY',
            cells: {
              SALARY: cell(),
              ELECTRICITY: cell({ warning: 'No meter is tagged to this company' }),
              MAINTENANCE: cell(),
              LABOUR: cell(),
            },
          }),
        ]}
        total={row({ key: '__total__', label: 'Total', kind: 'TOTAL' })}
        days={12}
      />,
    );

    // The board's one hard rule: an empty register and an unreadable one must
    // not look the same. ₹0 here would claim Mart used no power.
    expect(screen.getByLabelText('No meter is tagged to this company')).toHaveTextContent('—');
    expect(screen.getByText('No meter is tagged to this company')).toBeInTheDocument();
  });

  it('shows a real zero as money, not as a missing figure', () => {
    render(
      <ExpenseGrid
        columns={COLUMNS}
        rows={[row({ key: 'JIVO_OIL', label: 'Jivo Oil', kind: 'COMPANY' })]}
        total={row({ key: '__total__', label: 'Total', kind: 'TOTAL' })}
        days={12}
      />,
    );

    expect(screen.getAllByText('₹0').length).toBeGreaterThan(0);
  });

  it('shortens company names and marks the shared row as not a company', () => {
    render(
      <ExpenseGrid
        columns={COLUMNS}
        rows={[
          row({ key: 'JIVO_OIL', label: 'Jivo Oil', kind: 'COMPANY' }),
          row({ key: '__shared__', label: 'Shared (whole factory)', kind: 'SHARED' }),
        ]}
        total={row({ key: '__total__', label: 'Total', kind: 'TOTAL' })}
        days={12}
      />,
    );

    expect(screen.getByText('Oil')).toBeInTheDocument();
    // Shortened on screen, with the server's full label kept on the element:
    // the long form wraps to two lines and pushes its own explanation off.
    expect(screen.getByTitle('Shared (whole factory)')).toHaveTextContent('Shared');
    // The shared row must not read as a fourth company.
    expect(screen.getByText('No single owner')).toBeInTheDocument();
  });

  it('sizes a share bar against its own column, not the whole board', () => {
    const { container } = render(
      <ExpenseGrid
        columns={COLUMNS}
        rows={[
          row({
            key: 'JIVO_OIL',
            label: 'Jivo Oil',
            kind: 'COMPANY',
            cells: {
              SALARY: cell(),
              ELECTRICITY: cell({ amount: '250.00' }),
              MAINTENANCE: cell(),
              LABOUR: cell(),
            },
            total: '250.00',
          }),
          row({
            key: '__shared__',
            label: 'Shared (whole factory)',
            kind: 'SHARED',
            cells: {
              SALARY: cell(),
              ELECTRICITY: cell({ amount: '750.00' }),
              MAINTENANCE: cell(),
              LABOUR: cell(),
            },
            total: '750.00',
          }),
        ]}
        total={row({
          key: '__total__',
          label: 'Total',
          kind: 'TOTAL',
          cells: {
            SALARY: cell(),
            ELECTRICITY: cell({ amount: '1000.00' }),
            MAINTENANCE: cell(),
            LABOUR: cell(),
          },
          total: '1000.00',
        })}
        days={12}
      />,
    );

    const bars = Array.from(container.querySelectorAll<HTMLElement>('.exp-bar > i'));
    const widths = bars.map((bar) => bar.style.width);
    // Oil is a quarter of the power bill, the shared supply three quarters —
    // measured against the column, so the two add to the whole column.
    expect(widths).toContain('25%');
    expect(widths).toContain('75%');
  });

  it('gives the total row no share bar', () => {
    const { container } = render(
      <ExpenseGrid
        columns={COLUMNS}
        rows={[row({ key: 'JIVO_OIL', label: 'Jivo Oil', kind: 'COMPANY' })]}
        total={row({ key: '__total__', label: 'Total', kind: 'TOTAL' })}
        days={12}
      />,
    );

    // One data row × four columns. A bar on the total would always be full,
    // which says nothing.
    expect(container.querySelectorAll('.exp-bar')).toHaveLength(4);
  });

  it('states each row as a share of the whole board, except the total', () => {
    render(
      <ExpenseGrid
        columns={COLUMNS}
        rows={[
          row({ key: 'JIVO_OIL', label: 'Jivo Oil', kind: 'COMPANY', total: '600.00' }),
          row({
            key: '__shared__',
            label: 'Shared (whole factory)',
            kind: 'SHARED',
            total: '400.00',
          }),
        ]}
        total={row({ key: '__total__', label: 'Total', kind: 'TOTAL', total: '1000.00' })}
        days={12}
      />,
    );

    expect(screen.getByText('60% of spend')).toBeInTheDocument();
    expect(screen.getByText('40% of spend')).toBeInTheDocument();
    expect(screen.queryByText('100% of spend')).not.toBeInTheDocument();
  });

  it('labels a single-day board in the singular', () => {
    const { container } = render(
      <ExpenseGrid
        columns={COLUMNS}
        rows={[row({ key: 'JIVO_OIL', label: 'Jivo Oil', kind: 'COMPANY' })]}
        total={row({ key: '__total__', label: 'Total', kind: 'TOTAL' })}
        days={1}
      />,
    );

    const name = container.querySelector('.exp-rowname');
    expect(within(name as HTMLElement).getByText('1 day')).toBeInTheDocument();
  });

  it('reconciles the electricity total against the incomer', () => {
    const check: ElectricityReconciliation = {
      meter: 'KWH',
      cost: '663180.00',
      units: '94740.00',
      sub_meter_cost: '661708.00',
      drift_pct: -0.2,
      excluded_meters: ['KVAH', 'KWH', 'LP-196'],
    };

    render(
      <ExpenseGrid
        columns={COLUMNS}
        rows={[row({ key: 'JIVO_OIL', label: 'Jivo Oil', kind: 'COMPANY' })]}
        total={row({ key: '__total__', label: 'Total', kind: 'TOTAL' })}
        days={14}
        reconciliation={check}
      />,
    );

    // Under 2% reads as "ties" rather than a number nobody can act on.
    expect(screen.getByText(/sub-meters ₹6.62 L vs KWH ₹6.63 L · ties/)).toBeInTheDocument();
  });

  it('names the shortfall when the sub-meters do not add up', () => {
    const check: ElectricityReconciliation = {
      meter: 'KWH',
      cost: '100000.00',
      units: '14285.00',
      sub_meter_cost: '80000.00',
      drift_pct: -20,
      excluded_meters: ['KWH'],
    };

    render(
      <ExpenseGrid
        columns={COLUMNS}
        rows={[row({ key: 'JIVO_OIL', label: 'Jivo Oil', kind: 'COMPANY' })]}
        total={row({ key: '__total__', label: 'Total', kind: 'TOTAL' })}
        days={14}
        reconciliation={check}
      />,
    );

    expect(screen.getByText(/-20.0% unread/)).toBeInTheDocument();
  });

  it('says nothing about reconciliation when the incomer was not read', () => {
    render(
      <ExpenseGrid
        columns={COLUMNS}
        rows={[row({ key: 'JIVO_OIL', label: 'Jivo Oil', kind: 'COMPANY' })]}
        total={row({ key: '__total__', label: 'Total', kind: 'TOTAL' })}
        days={14}
        reconciliation={null}
      />,
    );

    // "No drift" and "no reading" must not look the same.
    expect(screen.queryByText(/vs KWH/)).not.toBeInTheDocument();
  });
});
