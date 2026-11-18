import i18n from '../i18n';

export type Errors<T extends string = string> = Partial<Record<T, string>>;

export const isIndianMobile = (v: string): boolean => /^[6-9]\d{9}$/.test(v.trim());

export function checkPhone(v: string): string | undefined {
  if (!v.trim()) return i18n.t('validation.phoneRequired');
  if (!isIndianMobile(v)) return i18n.t('validation.phoneInvalid');
  return undefined;
}

export const checkRequired = (v: string, label: string): string | undefined =>
  v.trim() ? undefined : i18n.t('validation.fieldRequired', { label });

export function checkNonNegative(v: string, label: string): string | undefined {
  if (v.trim() === '') return i18n.t('validation.fieldRequired', { label });
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return i18n.t('validation.cannotBeNegative', { label });
  return undefined;
}

export function checkPositive(v: string, label: string): string | undefined {
  if (v.trim() === '') return i18n.t('validation.fieldRequired', { label });
  const n = Number(v);
  if (Number.isNaN(n) || n <= 0) return i18n.t('validation.mustBePositive', { label });
  return undefined;
}

export function clean<T extends string>(e: Errors<T>): Errors<T> {
  const out: Errors<T> = {};
  (Object.keys(e) as T[]).forEach((k) => { if (e[k]) out[k] = e[k]; });
  return out;
}
