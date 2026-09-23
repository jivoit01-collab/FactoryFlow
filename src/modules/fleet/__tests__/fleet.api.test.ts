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

import { fleetApi } from '../api/fleet.api';

const photo = () => new File([new Uint8Array([1, 2, 3])], 'slip.jpg', { type: 'image/jpeg' });

describe('fleetApi', () => {
  beforeEach(() => {
    get.mockClear();
    post.mockClear();
    patch.mockClear();
    del.mockClear();
  });

  it('asks for the whole fleet when nothing is filtered', async () => {
    await fleetApi.vehicles();
    expect(get).toHaveBeenCalledWith('/company-vehicles/vehicles/');
  });

  it('puts the filters on the query string', async () => {
    await fleetApi.vehicles({ search: 'eeco', status: 'ACTIVE' });
    expect(get).toHaveBeenCalledWith('/company-vehicles/vehicles/?search=eeco&status=ACTIVE');
  });

  it('leaves an untouched filter off the query string entirely', async () => {
    await fleetApi.fuelEntries({ vehicle: 3, from: '2026-09-01', approval_status: '' });
    expect(get).toHaveBeenCalledWith(
      '/company-vehicles/fuel-entries/?vehicle=3&from=2026-09-01',
    );
  });

  it('sends a filling as plain JSON when there is no bill photo', async () => {
    await fleetApi.createFuelEntry({ vehicle: 1, odometer: 10000, quantity: '50', amount: '4500' });
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/company-vehicles/fuel-entries/');
    expect(body).not.toBeInstanceOf(FormData);
    expect(body).toEqual({ vehicle: 1, odometer: 10000, quantity: '50', amount: '4500' });
  });

  it('drops empty boxes rather than sending blanks Django would reject', async () => {
    await fleetApi.createFuelEntry({
      vehicle: 1,
      quantity: '50',
      amount: '4500',
      rate: '',
      station_name: '',
      bill_photo: null,
    });
    const [, body] = post.mock.calls[0];
    expect(body).toEqual({ vehicle: 1, quantity: '50', amount: '4500' });
  });

  it('switches to multipart once a bill photo is attached', async () => {
    await fleetApi.createFuelEntry({ vehicle: 1, quantity: '50', bill_photo: photo() });
    const [, body, config] = post.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('vehicle')).toBe('1');
    expect((body as FormData).get('bill_photo')).toBeInstanceOf(File);
    expect((config as { headers?: Record<string, string> }).headers).toEqual({
      'Content-Type': 'multipart/form-data',
    });
  });

  it('sends a decision to the workshop bill it belongs to', async () => {
    await fleetApi.decideServiceEntry(7, {
      approval_status: 'REJECTED',
      rejection_reason: 'No bill',
    });
    expect(post).toHaveBeenCalledWith('/company-vehicles/service-entries/7/approval/', {
      approval_status: 'REJECTED',
      rejection_reason: 'No bill',
    });
  });

  it('offers no approval endpoint for fuel at all', () => {
    expect('decideFuelEntry' in fleetApi).toBe(false);
  });

  it('fetches a stored bill as a blob, through the permission-checked path', async () => {
    await fleetApi.attachment('document', 9);
    expect(get).toHaveBeenCalledWith('/company-vehicles/attachments/document/9/', {
      responseType: 'blob',
    });
  });

  it('posts a reading to the one endpoint that upserts it', async () => {
    await fleetApi.saveDailyReading({ vehicle: 2, reading_date: '2026-09-23', odometer: 7900 });
    expect(post).toHaveBeenCalledWith(
      '/company-vehicles/daily-readings/',
      { vehicle: 2, reading_date: '2026-09-23', odometer: 7900 },
      { headers: undefined },
    );
  });

  it('retires a vehicle rather than removing its history', async () => {
    await fleetApi.retireVehicle(4);
    expect(del).toHaveBeenCalledWith('/company-vehicles/vehicles/4/');
  });
});
