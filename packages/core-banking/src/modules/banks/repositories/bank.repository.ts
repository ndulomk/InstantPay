import { database as db } from "@instantpay/config";
import { CreateBankInput, UpdateBankInput } from "../schemas/bank.schema";
import { FindAllResponse, QueryRequest } from "../../../types/types";
import { BANKSTATUS, BankType } from "../types/bank.types";
import { mapBankRow } from "../models/bank.model";
import { DatabaseException } from "@instantpay/utils";

export const BankRepository = {
  async create(data: CreateBankInput): Promise<string>{
    const query: string = `INSERT INTO banks (bank_name, bank_code, status, reserve_percentage) VALUES ($1, $2, $3, $4) RETURNING id`
    const values = [
      data.bankName,
      data.bankCode,
      data.status,
      data.reservePercentage
    ]

    const result = await db.query(query, values)
    return result.rows[0].id 
  },

  async findById(id: string): Promise<BankType | null>{
    const result = await db.query("SELECT * FROM banks WHERE id = $1", [id])
    return result.rows[0] ? mapBankRow(result.rows[0]) : null
  },

  async findAll({
    page,
    limit,
    search
  }: QueryRequest): Promise<FindAllResponse<BankType>>{
    const offset = (page - 1) * limit 
    const values = []
    const searchValues: string[] = []

    let query = `SELECT * FROM banks`
    let countQuery = `SELECT COUNT(*) AS total FROM banks`
    if(search){
      const searchCondition: string = ` WHERE nome ILIKE $1 OR bank_code ILIKE $1`
      query += searchCondition
      countQuery += searchCondition
      const searchParam = `%${search}%`
      searchValues.push(searchParam)
      values.push(searchParam)
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
    values.push(limit, offset)

    const [result, countResult] = await Promise.all([
      db.query(query, values),
      db.query(countQuery, searchValues)
    ])
    const items = result.rows.map(mapBankRow)
    const count = parseInt(countResult.rows[0].total, 10)
    return {
      data: items,
      total: count
    }
  },
  async update({ id, data }: { id: string; data: UpdateBankInput }): Promise<BankType> {
    const values: (string | BANKSTATUS | number)[] = []
    const fields: string[] = []
    let counter: number = 1

    const fieldsMapping: Record<string, string> = {
      bankName: "bank_name",
      bankCode: "bank_code",
      status: "status",
      reservePercentage: "reserve_percentage",
    }

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && fieldsMapping[key]) {
        fields.push(`${fieldsMapping[key]} = $${counter}`)
        values.push(value)
        counter++
      }
    }

    fields.push(`updated_at = NOW()`)

    values.push(id)

    const query = `UPDATE banks SET ${fields.join(", ")} WHERE id = $${counter} RETURNING *`

    const result = await db.query(query, values)

    if (!result.rows[0]) {
      throw new DatabaseException("Nenhuma linha atualizada", "SupplierRepository")
    }
    return mapBankRow(result.rows[0])
  },

  async delete(id: string): Promise<{ deleted: boolean }>{
    const result = await db.query("DELETE FROM banks WHERE id = $1", [id])
    return { deleted: (result.rowCount ?? 0) > 0 }
  }
}