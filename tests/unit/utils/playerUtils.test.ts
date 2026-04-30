import {
  getPlayerDisplayName,
} from '../../../src/utils/playerUtils';

describe('getPlayerDisplayName', () => {
  it('joins first and last name with a space', () => {
    expect(getPlayerDisplayName({ firstName: 'Alice', lastName: 'Smith' })).toBe('Alice Smith');
  });

  it('trims extra whitespace', () => {
    expect(getPlayerDisplayName({ firstName: '', lastName: 'Smith' })).toBe('Smith');
    expect(getPlayerDisplayName({ firstName: 'Alice', lastName: '' })).toBe('Alice');
  });
});
