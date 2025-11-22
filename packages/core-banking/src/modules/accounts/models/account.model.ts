import { AccountDbRow, AccountType } from "../types/account.types";

export function MapAccountRow(row: AccountDbRow): AccountType {
  return {
    id: row.id,
    userId: row.user_id,
    bankId: row.bank_id,
    accountNumber: row.account_number,
    accountType: row.account_type,
    balance: Number(row.balance),
    availableBalance: Number(row.available_balance),
    blockedAmount: Number(row.blocked_amount),
    currencyCode: row.currency_code,
    status: row.status,
    lastTransactionDate: row.last_transaction_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}