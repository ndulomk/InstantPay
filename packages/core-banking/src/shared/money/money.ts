/** Arredonda valores monetários para 2 casas (evita ruído de vírgula flutuante). */
export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const moneyToSql = (value: number): string => roundMoney(value).toFixed(2);

export const isPositiveMoney = (value: number): boolean =>
  Number.isFinite(value) && roundMoney(value) > 0;

export const isNonNegativeMoney = (value: number): boolean =>
  Number.isFinite(value) && roundMoney(value) >= 0;
