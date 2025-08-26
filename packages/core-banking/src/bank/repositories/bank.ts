import db from '@/config/database';
import { Bank } from '../types/bank';

const database = (db as any).default || db;

export const bankRepository = {
  async create(data: Bank): Promise<number> {
    const query = `INSERT INTO banks (bank_name, bank_code, status, reserve_percentage) VALUES ($1, $2, $3, $4) RETURNING id`;
    const values = [data.bankName, data.bankCode, data.status, data.reservePercentage];
    const result = await database.query(query, values);
    return result.rows[0].id;
  }
};