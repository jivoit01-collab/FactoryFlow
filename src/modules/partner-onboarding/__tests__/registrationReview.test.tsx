/** The review step: what will be sent, read back, with a way back to edit. */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RegistrationReview } from '../components/RegistrationReview';
import { blankDraft } from '../utils/registrationForm';

describe('RegistrationReview', () => {
  it('reads back the registration and its documents, and sends only on Submit', () => {
    const draft = {
      ...blankDraft('customer', 'JIVO_OIL'),
      card_name: 'ACME TRADERS',
      gstin: '03AAACA1234A1Z5',
      bill_addresses: [{ street: '12 Mall Road', block: '', city: 'Ludhiana', zip_code: '141001', state: 'PB', country: 'IN', gstin: '' }],
      ship_same_as_bill: true,
    };
    const onEdit = vi.fn();
    const onSend = vi.fn();
    render(
      <RegistrationReview
        family="customer"
        draft={draft}
        files={{ pan: [new File(['x'], 'pan.pdf')] }}
        companyName="Jivo Oil"
        sending={false}
        onEdit={onEdit}
        onSend={onSend}
      />,
    );
    expect(screen.getByText('ACME TRADERS')).toBeInTheDocument();
    expect(screen.getByText('03AAACA1234A1Z5')).toBeInTheDocument();
    expect(screen.getByText('12 Mall Road, Ludhiana, PB, 141001')).toBeInTheDocument();
    expect(screen.getByText('Same as billing')).toBeInTheDocument();
    expect(screen.getByText('pan.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Submit registration' }));
    expect(onSend).toHaveBeenCalled();
  });
});
