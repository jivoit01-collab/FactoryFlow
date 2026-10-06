import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AmountsCategory } from '../types';

const useAmountsGodownItems = vi.fn();

vi.mock('../api', () => ({
  useAmountsGodownItems: (...args: unknown[]) => useAmountsGodownItems(...args),
}));

import { AmountsGodownDrill } from './AmountsGodownDrill';

const rm: AmountsCategory = {
  key: 'RM',
  label: 'Raw Material',
  item_group: 106,
  value: 200_000_000,
  items: 5,
  godowns: [
    {
      code: 'BH-LO',
      name: 'Bhakharpur Loose Oil',
      value: 150_000_000,
      items: 3,
      managers: ['Gautam Chanana'],
    },
    {
      code: 'BH-PC',
      name: 'Production Consumption',
      value: 50_000_000,
      items: 2,
      managers: ['Charanjeet', 'Ravi', 'Gautam'],
    },
  ],
};

function renderDrill() {
  return render(
    <AmountsGodownDrill
      companyCode="JIVO_OIL"
      plantLabel="Oil plant"
      category={rm}
      owner={{ id: 1, name: 'Gautam Chanana', email: 'g@example.com' }}
      onClose={() => {}}
    />,
  );
}

describe('AmountsGodownDrill', () => {
  it('lists the godowns with their managers and share of the category', () => {
    renderDrill();

    expect(screen.getByText('Oil plant · Raw Material')).toBeInTheDocument();
    expect(screen.getByText('BH-LO')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Charanjeet, Ravi +1')).toBeInTheDocument();
  });

  it('opens a godown on its items, read for that godown and category', () => {
    useAmountsGodownItems.mockReturnValue({
      data: {
        company_code: 'JIVO_OIL',
        category: 'RM',
        warehouse: 'BH-LO',
        value: 150_000_000,
        items: [
          {
            item_code: 'RM0000001',
            item_name: 'CRUDE MUSTARD OIL',
            uom: 'KG',
            quantity: 120_000,
            value: 150_000_000,
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    renderDrill();
    fireEvent.click(screen.getByText('BH-LO'));

    expect(useAmountsGodownItems).toHaveBeenCalledWith('JIVO_OIL', 'RM', 'BH-LO');
    expect(screen.getByText('BH-LO · Raw Material')).toBeInTheDocument();
    expect(screen.getByText('CRUDE MUSTARD OIL')).toBeInTheDocument();
    expect(screen.getByText('1,20,000 KG')).toBeInTheDocument();
  });
});
