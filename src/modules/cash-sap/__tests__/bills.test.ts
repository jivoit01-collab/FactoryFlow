import { describe, expect, it } from 'vitest';

import { billFileProblem, MAX_BILL_BYTES } from '../utils/bills';

const fileOf = (name: string, size: number) => {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

/** The cash book's own upload rules, which cash_sap/uploads.py reads. */
describe('billFileProblem', () => {
  it('accepts a photograph or a PDF', () => {
    for (const name of ['bill.pdf', 'BILL.JPG', 'a.jpeg', 'a.png', 'a.webp', 'a.heic', 'a.heif']) {
      expect(billFileProblem(fileOf(name, 1000))).toBeNull();
    }
  });

  it('refuses any other type', () => {
    expect(billFileProblem(fileOf('bill.docx', 1000))).toMatch(/is not a bill/);
    expect(billFileProblem(fileOf('noextension', 1000))).toMatch(/is not a bill/);
  });

  it('refuses an empty file and one over 15 MB', () => {
    expect(billFileProblem(fileOf('bill.pdf', 0))).toMatch(/is empty/);
    expect(billFileProblem(fileOf('bill.pdf', MAX_BILL_BYTES + 1))).toMatch(/15 MB/);
    expect(billFileProblem(fileOf('bill.pdf', MAX_BILL_BYTES))).toBeNull();
  });
});
