import { describe, expect, it } from 'vitest';

import type { RegistrationDetail } from '../api/partner-onboarding.api';
import {
  addressNamePreview,
  blankDraft,
  draftFromDetail,
  editPayload,
  fileProblem,
  panFromGstin,
  type RegistrationDraft,
  serverErrors,
  toPayload,
  toSubmission,
  validateEdit,
  validateRegistration,
} from '../utils/registrationForm';

// Made-up values: the portal forms' own placeholder GSTIN / PAN.
const GSTIN = '06ABCDE1234F1Z5';
const PAN = 'ABCDE1234F';

const file = (name: string, size = 1000) =>
  new File([new Uint8Array(size)], name, { type: 'application/pdf' });

function customer(overrides: Partial<RegistrationDraft> = {}): RegistrationDraft {
  return {
    ...blankDraft('customer', 'JIVO_OIL'),
    card_name: 'Test Traders',
    industry: 'Trading',
    contact_first_name: 'Asha',
    contact_last_name: 'Example',
    mobile: '+91 90000 00001',
    email: 'buyer@example.com',
    gstin: GSTIN,
    pan: PAN,
    remarks: 'Test',
    bill_addresses: [
      {
        street: 'Plot 1',
        block: '',
        city: 'Testnagar',
        zip_code: '123456',
        state: 'HR',
        country: 'IN',
        gstin: '',
      },
    ],
    ...overrides,
  };
}

function vendor(overrides: Partial<RegistrationDraft> = {}): RegistrationDraft {
  return {
    ...customer(),
    bank_accounts: [
      {
        bank_name: 'Test Bank',
        branch: '',
        account_number: '0001 112',
        ifsc: 'TEST0001234',
        account_type: 'Current',
        swift_code: '',
      },
    ],
    ...overrides,
  };
}

const customerFiles = {
  pan: [file('pan.pdf')],
  aadhaar: [file('aadhaar.pdf')],
  cheque: [file('cheque.pdf')],
};
const vendorFiles = {
  pan: [file('pan.pdf')],
  cheque: [file('cheque.pdf')],
  gst: [file('gst.pdf')],
};

describe('the form helpers', () => {
  it('reads the PAN out of a GSTIN, as the portal’s Fetch PAN did', () => {
    expect(panFromGstin(GSTIN.toLowerCase())).toBe(PAN);
    expect(panFromGstin('06ABC')).toBeNull();
  });

  it('previews the address name the server will build', () => {
    expect(addressNamePreview('Test Traders', 'HR')).toBe('TEST TRADERS - HR');
    expect(addressNamePreview('X'.repeat(60), 'HR')).toHaveLength(50);
  });

  it('accepts only PDF, JPG and PNG up to 15 MB', () => {
    expect(fileProblem({ name: 'scan.PDF', size: 10 })).toBeNull();
    expect(fileProblem({ name: 'photo.jpeg', size: 10 })).toBeNull();
    expect(fileProblem({ name: 'tool.exe', size: 10 })).toMatch(/only PDF/);
    expect(fileProblem({ name: 'big.png', size: 16 * 1024 * 1024 })).toMatch(/15 MB/);
    expect(fileProblem({ name: 'empty.pdf', size: 0 })).toMatch(/empty/);
  });
});

describe('validateRegistration', () => {
  it('passes a complete customer', () => {
    expect(validateRegistration('customer', customer(), customerFiles)).toEqual({});
  });

  it('asks for the required fields and documents', () => {
    const errors = validateRegistration('customer', { ...blankDraft('customer') }, {});
    for (const key of [
      'company',
      'card_name',
      'industry',
      'contact_first_name',
      'contact_last_name',
      'mobile',
      'email',
      'pan',
      'gstin',
      'remarks',
      'bill_addresses.0.street',
      'bill_addresses.0.city',
      'bill_addresses.0.state',
      'documents.pan',
      'documents.aadhaar',
      'documents.cheque',
    ]) {
      expect(errors).toHaveProperty([key]);
    }
  });

  it('needs a GSTIN for B2B customers and every vendor, not for B2C', () => {
    expect(validateRegistration('customer', customer({ gstin: '' }), customerFiles)).toHaveProperty(
      ['gstin'],
    );
    expect(
      validateRegistration(
        'customer',
        customer({ gstin: '', customer_type: 'B2C' }),
        customerFiles,
      ),
    ).toEqual({});
    expect(validateRegistration('vendor', vendor({ gstin: '' }), vendorFiles)).toHaveProperty([
      'gstin',
    ]);
  });

  it('checks the formats', () => {
    const errors = validateRegistration(
      'customer',
      customer({ pan: 'ABCDE12345', gstin: '06ABCDE1234F1X5', mobile: 'call me', email: 'nope' }),
      customerFiles,
    );
    expect(Object.keys(errors).sort()).toEqual(['email', 'gstin', 'mobile', 'pan']);
  });

  it('keeps names within what SAP takes', () => {
    const errors = validateRegistration(
      'customer',
      customer({
        card_name: 'X'.repeat(101),
        contact_first_name: 'A'.repeat(30),
        contact_last_name: 'B'.repeat(30),
      }),
      customerFiles,
    );
    expect(errors).toHaveProperty(['card_name']);
    expect(errors).toHaveProperty(['contact_last_name']);
  });

  it('needs the Udyam number and certificate for MSME, and for vendors the two types', () => {
    const msme = { has_msme: true, msme_number: 'UDYAM-HR-18-0040140' };
    const customerErrors = validateRegistration('customer', customer(msme), customerFiles);
    expect(customerErrors).toEqual({ 'documents.msme': 'This document is required.' });
    const vendorErrors = validateRegistration('vendor', vendor(msme), {
      ...vendorFiles,
      msme: [file('m.pdf')],
    });
    expect(Object.keys(vendorErrors).sort()).toEqual(['msme_business_type', 'msme_type']);
    expect(
      validateRegistration(
        'customer',
        customer({ has_msme: true, msme_number: 'UDYAM-1' }),
        customerFiles,
      ),
    ).toHaveProperty(['msme_number']);
  });

  it('needs a vendor’s bank account with a valid IFSC, and the GST certificate', () => {
    expect(validateRegistration('vendor', vendor(), vendorFiles)).toEqual({});
    const bad = vendor({ bank_accounts: [{ ...vendor().bank_accounts[0], ifsc: 'BAD' }] });
    expect(validateRegistration('vendor', bad, vendorFiles)).toHaveProperty([
      'bank_accounts.0.ifsc',
    ]);
    expect(
      validateRegistration('vendor', vendor({ bank_accounts: [] }), vendorFiles),
    ).toHaveProperty(['bank_accounts']);
    expect(
      validateRegistration('vendor', vendor(), {
        pan: vendorFiles.pan,
        cheque: vendorFiles.cheque,
      }),
    ).toHaveProperty(['documents.gst']);
    expect(
      validateRegistration('vendor', vendor({ fssai_number: '123' }), vendorFiles),
    ).toHaveProperty(['fssai_number']);
  });

  it('checks shipping addresses only when they differ from billing', () => {
    const blankShip = {
      street: '',
      block: '',
      city: '',
      zip_code: '',
      state: '',
      country: 'IN',
      gstin: '',
    };
    expect(
      validateRegistration('customer', customer({ ship_addresses: [blankShip] }), customerFiles),
    ).toEqual({});
    const errors = validateRegistration(
      'customer',
      customer({ ship_same_as_bill: false, ship_addresses: [blankShip] }),
      customerFiles,
    );
    expect(errors).toHaveProperty(['ship_addresses.0.street']);
  });

  it('reports a file the server would refuse', () => {
    const errors = validateRegistration('customer', customer(), {
      ...customerFiles,
      other: [file('virus.exe')],
    });
    expect(errors['documents.other']).toMatch(/only PDF/);
  });
});

describe('the submission', () => {
  it('sends the fields as JSON and each file under its slot', () => {
    const form = toSubmission('customer', customer({ gstin: GSTIN.toLowerCase() }), {
      ...customerFiles,
      other: [file('a.pdf'), file('b.pdf')],
    });
    const payload = JSON.parse(form.get('payload') as string);
    expect(payload.company).toBe('JIVO_OIL');
    expect(payload.gstin).toBe(GSTIN);
    expect(payload.ship_addresses).toEqual([]);
    expect(payload.bill_addresses[0]).toMatchObject({
      street: 'PLOT 1',
      city: 'TESTNAGAR',
      state: 'HR',
    });
    expect(payload).not.toHaveProperty('bank_accounts');
    expect(form.getAll('other')).toHaveLength(2);
    expect((form.get('pan') as File).name).toBe('pan.pdf');
  });

  it('sends a vendor’s bank accounts without spaces in the number', () => {
    const payload = toPayload('vendor', vendor()) as {
      bank_accounts: { account_number: string }[];
    };
    expect(payload.bank_accounts[0].account_number).toBe('0001112');
    expect(payload).not.toHaveProperty('customer_type');
  });
});

describe('serverErrors', () => {
  it('flattens DRF answers into the form’s keys', () => {
    expect(
      serverErrors({
        pan: ['Invalid PAN format.'],
        bill_addresses: [{}, { city: ['This field is required.'] }],
        documents: { aadhaar: ['The Aadhaar card is required.'] },
        detail: 'Nope',
      }),
    ).toEqual({
      pan: 'Invalid PAN format.',
      'bill_addresses.1.city': 'This field is required.',
      'documents.aadhaar': 'The Aadhaar card is required.',
      form: 'Nope',
    });
  });
});

describe('the verifier’s edit', () => {
  const detail = {
    family: 'vendor',
    company_code: 'JIVO_MART',
    card_name: 'TEST SUPPLIES',
    foreign_name: '',
    type_of_business: 'LLP',
    industry: 'MANUFACTURING',
    contact_first_name: 'RAVI',
    contact_last_name: 'SAMPLE',
    contact_title: '',
    mobile: '9000000002',
    email: 'vendor@example.com',
    currency: 'INR',
    gstin: GSTIN,
    pan: PAN,
    has_msme: false,
    msme_number: '',
    msme_type: '',
    msme_business_type: '',
    remarks: 'TEST',
    vendor_type: 'SUPPLIER',
    tan: '',
    fssai_number: '',
    addresses: [
      {
        id: 1,
        address_type: 'BILL_TO',
        address_name: 'TEST SUPPLIES - HR',
        street: 'PLOT 2',
        block: '',
        city: 'TESTNAGAR',
        zip_code: '',
        state: 'HR',
        country: 'IN',
        gstin: '',
      },
      {
        id: 2,
        address_type: 'SHIP_TO',
        address_name: 'TEST SUPPLIES - PB',
        street: 'DEPOT',
        block: '',
        city: 'SAMPLEPUR',
        zip_code: '',
        state: 'PB',
        country: 'IN',
        gstin: '',
      },
    ],
    bank_accounts: [
      {
        id: 5,
        position: 0,
        bank_name: 'TEST BANK',
        branch: '',
        account_number: '0001',
        ifsc: 'TEST0001234',
        account_type: 'Current',
        swift_code: '',
        is_primary: true,
        sap_bank_code: 'TST',
      },
    ],
  } as unknown as RegistrationDetail;

  it('fills the draft from the record and sends every address, named by the server', () => {
    const draft = draftFromDetail(detail);
    expect(draft.ship_same_as_bill).toBe(false);
    expect(validateEdit('vendor', draft)).toEqual({});
    const payload = editPayload('vendor', draft);
    expect(payload).not.toHaveProperty('company');
    expect(payload.addresses?.map((a) => [a.address_type, a.address_name, a.state])).toEqual([
      ['BILL_TO', '', 'HR'],
      ['SHIP_TO', '', 'PB'],
    ]);
    // The approver's bank code survives a verifier's edit.
    expect(payload.bank_accounts?.[0].sap_bank_code).toBe('TST');
  });

  it('copies the billing addresses when shipping is set to the same', () => {
    const payload = editPayload('vendor', { ...draftFromDetail(detail), ship_same_as_bill: true });
    expect(payload.addresses?.map((a) => [a.address_type, a.state])).toEqual([
      ['BILL_TO', 'HR'],
      ['SHIP_TO', 'HR'],
    ]);
  });

  it('ignores documents and company, which an edit does not touch', () => {
    const errors = validateEdit('vendor', { ...draftFromDetail(detail), company: '', pan: '' });
    expect(Object.keys(errors)).toEqual(['pan']);
  });
});
