export interface BankInterface {
  id: number;
  bankName: string;
  bankCode: string;
  status: number;
  reservePercentage: number;
  createdAt: Date;
  updatedAt: Date;
}


export interface CreateBankRequest {
  Body: BankInterface;
}

export interface Pagination {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface GetAllRequest {
  page: number;
  limit: number;
}