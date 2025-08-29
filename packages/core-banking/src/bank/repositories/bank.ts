import db from '@instantpay/config/src/database';
import { BankInterface } from '../types/bank';
import { bank } from '../model/bank';

const database = (db as any).default || db;

export const bankRepository = {
  async create(data: BankInterface): Promise<number> {
    const query = `INSERT INTO banks (bank_name, bank_code, status, reserve_percentage) VALUES ($1, $2, $3, $4) RETURNING id`;
    const values = [data.bankName, data.bankCode, data.status, data.reservePercentage];
    const result = await database.query(query, values);
    return result.rows[0].id;
  },

  async findById(id: number): Promise<BankInterface | null> {
    const query = `SELECT * FROM banks WHERE id = $1`;
    const result = await db.query(query, [id])
    return result.rows[0] || null;
  },

  async findAll({page = 1, limit = 10}): Promise<{data:BankInterface, total:number }>{
    const offset = (page - 1) * limit 
    const query = `SELECT * FROM banks ORDER BY created_at DESC LIMIT $1 OFFSET $2`
    const totalQuery = `SELECT COUNT(*) as total FROM banks`
    const [rows, count] = await Promise.all([
      db.query(query, [limit, offset]),
      db.query(totalQuery)
    ])
    const data = rows.rows[0]
    const total = count.rows[0].total
    return {
      data,
      total
    }
  },

};