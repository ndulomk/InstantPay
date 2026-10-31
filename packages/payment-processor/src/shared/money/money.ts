export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const isPositiveMoney = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

export const moneyEquals = (left: number, right: number): boolean =>
  roundMoney(left) === roundMoney(right);
