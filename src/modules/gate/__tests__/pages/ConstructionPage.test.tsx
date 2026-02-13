import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/gate', state: null, search: '' }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams()],
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

import ConstructionPage from '../../pages/ConstructionPage';

describe('ConstructionPage', () => {
  it('renders the page heading', () => {
    render(<ConstructionPage />);
    expect(screen.getByText('Construction (Civil/Building Work)')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<ConstructionPage />);
    expect(
      screen.getByText('Manage construction materials and civil/building work gate entries'),
    ).toBeInTheDocument();
  });
});
