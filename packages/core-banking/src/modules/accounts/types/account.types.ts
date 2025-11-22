export enum ACCOUNTSTATUS {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  CLOSED = 'closed',
  FROZEN = 'frozen'
}

export enum ACCOUNTTYPE {
  CORRENTE = 'corrente',
  POUPANCA = 'poupanca',
  PRAZO = 'prazo',
  EMPRESARIAL = 'empresarial'
}

export type AccountType = {
  id: string;
  userId: string;
  bankId: string;
  accountNumber: string;
  accountType: ACCOUNTTYPE;
  balance: number;
  availableBalance: number;
  blockedAmount: number;
  currencyCode: string;
  status: ACCOUNTSTATUS;
  lastTransactionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AccountDbRow = {
  id: string;
  user_id: string;
  bank_id: string;
  account_number: string;
  account_type: ACCOUNTTYPE;
  balance: string;
  available_balance: string;
  blocked_amount: string;
  currency_code: string;
  status: ACCOUNTSTATUS;
  last_transaction_date?: Date;
  created_at: Date;
  updated_at: Date;
}