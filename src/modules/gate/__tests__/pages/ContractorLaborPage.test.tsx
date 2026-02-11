import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/gate', state: null, search: '' }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams()],
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

import ContractorLaborPage from '../../pages/ContractorLaborPage'

describe('ContractorLaborPage', () => {
  it('renders the page heading', () => {
    render(<ContractorLaborPage />)
    expect(screen.getByText('Visitor/Labour')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<ContractorLaborPage />)
    expect(screen.getByText('Manage visitor and labour gate entries')).toBeInTheDocument()
  })
})
