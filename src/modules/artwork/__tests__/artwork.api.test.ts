import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn().mockResolvedValue({ data: {} });
const post = vi.fn().mockResolvedValue({ data: {} });
const patch = vi.fn().mockResolvedValue({ data: {} });
const del = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

import { artworkApi } from '../api/artwork.api';

const pdf = () => new File([new Uint8Array([1, 2, 3])], 'label.pdf', { type: 'application/pdf' });
const cdr = () => new File([new Uint8Array([4, 5, 6])], 'label.cdr');

describe('artworkApi', () => {
  beforeEach(() => {
    get.mockClear();
    post.mockClear();
    patch.mockClear();
    del.mockClear();
  });

  it('asks for every label and carton item when nothing is filtered', async () => {
    await artworkApi.items();
    expect(get.mock.calls[0][0]).toBe('/artwork/items/');
    expect(get.mock.calls[0][1]).toEqual({ params: {} });
  });

  it('passes the kind, the search and the capture status through', async () => {
    await artworkApi.items({ subGroup: 'LABEL', search: 'mustard', status: 'PENDING' });
    expect(get.mock.calls[0][1]).toEqual({
      params: { sub_group: 'LABEL', search: 'mustard', status: 'PENDING' },
    });
  });

  it('sends a capture as multipart, with both files', async () => {
    await artworkApi.capture({
      item_code: 'PM0000086',
      document_number: 'JW-CTN-004',
      revision_number: 0,
      revision_date: '2026-08-12',
      barcode: '8906104570123',
      pdf_file: pdf(),
      cdr_file: cdr(),
    });

    expect(post.mock.calls[0][0]).toBe('/artwork/records/');
    const form = post.mock.calls[0][1] as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('item_code')).toBe('PM0000086');
    expect(form.get('document_number')).toBe('JW-CTN-004');
    expect(form.get('barcode')).toBe('8906104570123');
    expect(form.get('pdf_file')).toBeInstanceOf(File);
    expect(form.get('cdr_file')).toBeInstanceOf(File);
    // Without this header the shared client's JSON default stands, axios
    // rewrites the form as JSON, and the upload is rejected as the wrong
    // media type.
    expect(post.mock.calls[0][2]).toEqual({
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('omits a field left out of a revision rather than sending it empty', async () => {
    // The server keeps whatever is not sent, which is what lets a barcode be
    // corrected without re-attaching the artwork. A field serialised as ''
    // would wipe the value instead.
    await artworkApi.revise(12, { barcode: '8906104570444' });

    expect(patch.mock.calls[0][0]).toBe('/artwork/records/12/');
    const form = patch.mock.calls[0][1] as FormData;
    expect(form.get('barcode')).toBe('8906104570444');
    expect(form.get('document_number')).toBeNull();
    expect(form.get('pdf_file')).toBeNull();
    expect(form.get('cdr_file')).toBeNull();
    expect(patch.mock.calls[0][2]).toEqual({
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('drops a null file so clearing the input does not clear the stored file', async () => {
    await artworkApi.revise(12, { revision_number: 2, pdf_file: null, cdr_file: null });
    const form = patch.mock.calls[0][1] as FormData;
    expect(form.get('revision_number')).toBe('2');
    expect(form.get('pdf_file')).toBeNull();
    expect(form.get('cdr_file')).toBeNull();
  });

  it('retires through DELETE on the record', async () => {
    await artworkApi.retire(12);
    expect(del).toHaveBeenCalledWith('/artwork/records/12/');
  });

  it('fetches files as blobs from the permission-checked endpoints', async () => {
    get.mockResolvedValue({ data: new Blob(['x']) });

    await artworkApi.file(12, 'pdf');
    expect(get.mock.calls[0][0]).toBe('/artwork/records/12/download/pdf/');
    expect(get.mock.calls[0][1]).toEqual({ responseType: 'blob' });

    await artworkApi.revisionFile(5, 'cdr');
    expect(get.mock.calls[1][0]).toBe('/artwork/revisions/5/download/cdr/');
  });

  it('reads one record and its history', async () => {
    await artworkApi.detail(12);
    expect(get.mock.calls[0][0]).toBe('/artwork/records/12/');

    await artworkApi.revisions(12);
    expect(get.mock.calls[1][0]).toBe('/artwork/records/12/revisions/');
  });
});
