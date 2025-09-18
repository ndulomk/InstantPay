export enum BANKSTATUS {
  ATIVO = 1,
  INATIVO = 0
}

export interface BankType { 
  id: string;
  bankName: string;
  bankCode: string;
  status: BANKSTATUS;
  reservePercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankDbRow {
  id: string;
  bank_name: string;
  bank_code: string;
  status: BANKSTATUS;
  reserve_percentage: number;
  created_at: Date;
  updated_at: Date;
}