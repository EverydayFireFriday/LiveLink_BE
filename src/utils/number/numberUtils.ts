// src/utils/numberUtils.ts
export const safeParseInt = (value: any, defaultValue: number): number => {
  if (typeof value !== "string") {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};
