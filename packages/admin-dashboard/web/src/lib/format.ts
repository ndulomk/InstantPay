const dateTimeFormatter = new Intl.DateTimeFormat('pt-PT', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('pt-PT', {
  dateStyle: 'medium',
});

const numberFormatter = new Intl.NumberFormat('pt-PT');

export const formatDateTime = (value?: string | null): string => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return dateTimeFormatter.format(date);
};

export const formatDate = (value?: string | null): string => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return dateFormatter.format(date);
};

export const formatNumber = (value: number): string =>
  numberFormatter.format(value);

export const formatPercentage = (value: number): string =>
  `${numberFormatter.format(value)}%`;

export const formatLatency = (value?: number | null): string =>
  value === null || value === undefined ? '--' : `${value} ms`;

export const truncate = (value: string, max = 32): string =>
  value.length <= max ? value : `${value.slice(0, max - 1)}…`;

export const readableEnum = (value: string): string =>
  value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
