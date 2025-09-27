// src/utils/numberUtils.ts
export const safeParseInt = (value: unknown, defaultValue: number): number => {
  if (typeof value !== 'string') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// 6/10: Generic clamp function
export const clamp = <T extends number | bigint>(
  value: T,
  min: T,
  max: T,
): T => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

// 7/10: Generic sum function for arrays
export const sum = <T extends number | bigint>(arr: T[]): T => {
  if (arr.length === 0) {
    // Return 0 or throw an error depending on desired behavior for empty array
    // For now, return 0 (assuming T can be 0)
    return 0 as T;
  }
  return arr.reduce((acc, current) => {
    if (typeof acc === 'bigint' && typeof current === 'bigint') {
      return (acc + current) as T;
    }
    return ((acc as number) + (current as number)) as T;
  }, 0 as T);
};
