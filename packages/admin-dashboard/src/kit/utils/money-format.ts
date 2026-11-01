/** Formata um número para exibição em Kz (AOA) — usar em tabelas, cards, detail-pages. */
export const formatMoney = (v: number | null | undefined): string =>
  v == null ? '--' : new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(v)