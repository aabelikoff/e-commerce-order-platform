export const checkArrayToEnum = <
  T extends Record<string, string>
>(
  arr: string[],
  enumObj: T
): arr is T[keyof T][] => {
  const enumValues = Object.values(enumObj) as string[];

  return arr.every(item => enumValues.includes(item));
};