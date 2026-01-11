export type FN = (...args: unknown[]) => void;
export type Timer = ReturnType<typeof setTimeout>;
export type Interval = ReturnType<typeof setInterval>;

export const sleep = (time: number): Promise<void> => new Promise(resolve => setTimeout(() => resolve(undefined), time));

export const isDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && isNaN(value) === false;
};

export const isHexString = (color: string): boolean => {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color);
};

export const resolveColor = (value: string): string => {
  return isHexString(value) ? value : `var(--${value}-color, ${value})`;
};

export const second = 1000;
export const minute = second * 60;
