import { BankDbRow, BankType } from "../types/bank.types";

export function mapBankRow(row: BankDbRow): BankType{
  return {
    id: row.id,
    bankName: row.bank_name,
    bankCode: row.bank_code,
    status: row.status,
    reservePercentage: row.reserve_percentage,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
} 