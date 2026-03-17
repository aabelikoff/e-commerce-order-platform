import { checkArrayToEnum } from './chek-array-to-enum.utils';

enum TestRoles {
  ADMIN = 'admin',
  USER = 'user',
}

describe('checkArrayToEnum', () => {
  it('returns true when every value exists in enum', () => {
    const values = ['admin', 'user'];

    expect(checkArrayToEnum(values, TestRoles)).toBe(true);
  });

  it('returns false when at least one value is outside enum', () => {
    const values = ['admin', 'guest'];

    expect(checkArrayToEnum(values, TestRoles)).toBe(false);
  });
});
