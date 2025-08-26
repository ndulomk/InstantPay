export interface Bank {
  id: number;
  bankName: string;
  bankCode: string;
  status: number;
  reservePercentage: number;
  createdAt: Date;
  updatedAt: Date;
}


export interface CreateBankRequest {
  Body: Bank;
}