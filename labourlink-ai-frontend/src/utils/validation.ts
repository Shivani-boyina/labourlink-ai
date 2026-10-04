export type Errors<T extends string = string> = Partial<Record<T, string>>;

export const isIndianMobile = (v: string): boolean => /^[6-9]\d{9}$/.test(v.trim());

export function checkPhone(v: string): string | undefined {
  if (!v.trim()) return 'Phone number is required';
  if (!isIndianMobile(v)) return 'Enter a valid 10-digit Indian mobile number';
  return undefined;
}
export const checkRequired = (v: string, label: string): string | undefined =>
  v.trim() ? undefined : `${label} is required`;

export function checkNonNegative(v: string, label: string): string | undefined {
  if (v.trim() === '') return `${label} is required`;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return `${label} cannot be negative`;
  return undefined;
}
export function checkPositive(v: string, label: string): string | undefined {
  if (v.trim() === '') return `${label} is required`;
  const n = Number(v);
  if (Number.isNaN(n) || n <= 0) return `${label} must be greater than zero`;
  return undefined;
}
export function clean<T extends string>(e: Errors<T>): Errors<T> {
  const out: Errors<T> = {};
  (Object.keys(e) as T[]).forEach((k) => { if (e[k]) out[k] = e[k]; });
  return out;
}
