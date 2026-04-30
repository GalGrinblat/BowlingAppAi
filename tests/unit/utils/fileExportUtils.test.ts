import { getTimestamp } from '../../../src/utils/fileExportUtils';

describe('getTimestamp', () => {
  it('returns a date string in YYYY-MM-DD format', () => {
    expect(getTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns today\'s date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(getTimestamp()).toBe(today);
  });
});
