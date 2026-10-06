import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pickPhotos } from '../../utils/image';

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));

function inputWith(files: File[]) {
  const input = document.createElement('input');
  input.type = 'file';
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  return input;
}

const jpeg = new File(['x'], 'front.jpg', { type: 'image/jpeg' });
const pdf = new File(['x'], 'challan.pdf', { type: 'application/pdf' });

describe('pickPhotos', () => {
  beforeEach(() => toastError.mockReset());

  it('passes photos through without a word', () => {
    expect(pickPhotos(inputWith([jpeg]))).toEqual([jpeg]);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('takes a HEIC the browser gives no type by its name', () => {
    const heic = new File(['x'], 'IMG_0042.HEIC', { type: '' });
    expect(pickPhotos(inputWith([heic]))).toEqual([heic]);
  });

  it('drops what is not a photo and says so', () => {
    expect(pickPhotos(inputWith([pdf]))).toEqual([]);
    expect(toastError).toHaveBeenCalledWith('"challan.pdf" is not a photo.');
  });

  it('keeps the photos out of a mixed pick', () => {
    const sheet = new File(['x'], 'list.xlsx', { type: '' });
    expect(pickPhotos(inputWith([jpeg, pdf, sheet]))).toEqual([jpeg]);
    expect(toastError).toHaveBeenCalledWith('2 of the files picked are not photos.');
  });

  it('reads an empty pick as nothing', () => {
    expect(pickPhotos(inputWith([]))).toEqual([]);
    expect(toastError).not.toHaveBeenCalled();
  });
});
