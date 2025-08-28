export class bank {
  id: number;
  bankName: string;
  bankCode: string; 
  status: number;
  reservePercentage: number;
  createdAt: Date;
  updatedAt: Date;
  constructor(
    id: number,
    bankName: string,
    bankCode: string,
    status: number,
    reservePercentage: number,
    createdAt: Date,
    updatedAt: Date
  ) {
    this.id = id;
    this.bankName = bankName;
    this.bankCode = bankCode;
    this.status = status;
    this.reservePercentage = reservePercentage;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}