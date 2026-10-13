import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FASapModeBadges } from '../components/FASapModeBadges';
import type { FASapFlags } from '../types';

const sap = (over: Partial<FASapFlags> = {}): FASapFlags => ({
  enabled: true,
  simulate: false,
  allow_live: false,
  is_test_db: true,
  cutover: null,
  warehouses: [],
  ...over,
});

describe('FASapModeBadges', () => {
  it('says SIMULATE when nothing goes to SAP', () => {
    render(<FASapModeBadges sap={sap({ simulate: true })} />);
    expect(screen.getByText('SIMULATE — nothing goes to SAP')).toBeInTheDocument();
  });

  it('says TEST SAP for a TEST_ database', () => {
    render(<FASapModeBadges sap={sap()} />);
    expect(screen.getByText('TEST SAP')).toBeInTheDocument();
    expect(screen.queryByText('LIVE SAP')).not.toBeInTheDocument();
  });

  it('says LIVE SAP only when a real post would reach a live database', () => {
    render(<FASapModeBadges sap={sap({ is_test_db: false, allow_live: true })} />);
    expect(screen.getByText('LIVE SAP')).toBeInTheDocument();
  });

  it('says SWITCHED OFF when the app is off', () => {
    render(<FASapModeBadges sap={sap({ enabled: false })} />);
    expect(screen.getByText('SWITCHED OFF')).toBeInTheDocument();
  });

  it('renders nothing before the flags arrive', () => {
    const { container } = render(<FASapModeBadges sap={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
