import { checkArrayToEnum } from './chek-array-to-enum.utils';

enum TestRoles {
  ADMIN = 'admin',
  USER = 'user',
}

describe('checkArrayToEnum', () => {
  it('returns true when every value exists in enum', () => {
    expect(checkArrayToEnum(['admin', 'user'], TestRoles)).toBe(true);
  });

  it('returns false when at least one value is outside enum', () => {
    expect(checkArrayToEnum(['admin', 'guest'], TestRoles)).toBe(false);
  });
});
