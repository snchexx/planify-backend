import { localDateTimeToUtc } from './reminder-time';

describe('localDateTimeToUtc', () => {
  it('converts Bogota local time to UTC', () => {
    expect(localDateTimeToUtc('2026-11-12', '14:30').toISOString()).toBe(
      '2026-11-12T19:30:00.000Z',
    );
  });

  it('preserves local midnight rollover when converting to UTC', () => {
    expect(localDateTimeToUtc('2026-11-11', '23:55').toISOString()).toBe(
      '2026-11-12T04:55:00.000Z',
    );
  });
});
