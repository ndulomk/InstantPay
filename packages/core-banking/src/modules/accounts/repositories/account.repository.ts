import { Database, database } from "@instantpay/config";
import { CreateAccountInput } from "../schemas/account.schema";
import { AccountType } from "../types/account.types";
import { MapAccountRow } from "../models/account.model";
import { FindAllResponse, QueryRequest } from "../../../types/types";

export class AccountRepository {
  private db: Database

  constructor(dbInstance: Database = database){
    this.db = dbInstance
  }

  async create(data: CreateAccountInput): Promise<string>{
    const query = `INSERT INTO accounts (user_id, bank_id, account_number, account_type, balance, available_balance, blocked_amount, currency_code, status, last_transaction_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`
    
    const values = [
      data.userId, data.bankId, data.accountNumber, data.accountType, data.balance, data.availableBalance, data.blockedAmount, data.currencyCode, data.status, data.lastTransactionDate
    ]

    const result = await this.db.query(query, values)
    return result.rows[0].id
  }

  async findById(id: string): Promise<AccountType | null>{
    const result = await this.db.query("SELECT * FROM accounts WHERE id = $1", [id])
    return result.rows[0] ? MapAccountRow(result.rows[0]) : null
  }

  async findAll({
    page,
    limit,
    search
  }: QueryRequest): Promise<FindAllResponse<AccountType>>{
    
  }
}