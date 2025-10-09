import { Database, database } from "@instantpay/config";
import { CreateUserInput, UpdateUserInput } from "../schemas/user.schema";
import { UserResponse, UserResponseWithPassword } from "../types/user.types";
import User from "../models/user.model";
import { FindAllResponse, QueryRequest } from "../../../types/types";


export class UserRepository {
  private db: Database;

  constructor(dbInstance: Database = database) {
    this.db = dbInstance;
  }

  async create(data: CreateUserInput): Promise<string>{
    const query = `INSERT INTO users (username, email, phone, password_hash, bi_number, nif, full_name, date_of_birth, kyc_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`
    const values = [
      data.username, data.email, data.phone, data.passwordHash, data.biNumber, data.nif, data.fullName, data.dateOfBirth, data.kycStatus
    ]

    const result = await this.db.query(query, values)
    return result.rows[0].id 
  }

  async findById(id: string): Promise<UserResponse | null>{
    const result = await this.db.query("SELECT * FROM users WHERE id = $1", [id])
    return result.rows[0] ? new User(result.rows[0]).toJSON() : null 
  }

  async findByEmail(email: string): Promise<UserResponse | null> {
    const result = await this.db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    return result.rows[0] ? new User(result.rows[0]).toJSON() : null;
  }

  async findByPhone(phone: string): Promise<UserResponse | null> {
    const result = await this.db.query("SELECT * FROM users WHERE phone = $1", [
      phone,
    ]);
    return result.rows[0] ? new User(result.rows[0]).toJSON() : null;
  }

  async findByNif(nif: string): Promise<UserResponse | null> {
    const result = await this.db.query("SELECT * FROM users WHERE nif = $1", [
      nif,
    ]);
    return result.rows[0] ? new User(result.rows[0]).toJSON() : null;
  }

  async findByEmailWithPassword(
    email: string
  ): Promise<UserResponseWithPassword | null> {
    const result = await this.db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  async updateLastLogin(id: string): Promise<void> {
    const query = `UPDATE users SET ultimo_login = NOW() WHERE id = $1`;
    await this.db.query(query, [id]);
  }

  async findByUsername(username: string): Promise<UserResponse | null> {
    const result = await this.db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    return result.rows[0] ? new User(result.rows[0]).toJSON() : null;
  }

  async findAll({
    page,
    limit,
    search
  }: QueryRequest): Promise<FindAllResponse<UserResponse>>{
    const offset = (page - 1) * limit 
    let query = `SELECT * FROM users`
    let countQuery = `SELECT COUNT(*) AS total FROM users`
    const values = []
    const searchValues: string[] = []
    
    if(search){
      const searchCondition = ` WHERE username ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR nif ILIKE $1 OR full_name ILIKE $1`
      query += searchCondition
      countQuery += searchCondition
      const searchParam = `%${search}%`
      searchValues.push(searchParam)
      values.push(searchParam)
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
    values.push(limit, offset)

    const [result, countResult] = await Promise.all([
      this.db.query(query, values),
      this.db.query(countQuery, searchValues)
    ])

    const items = result.rows.map((row)=> new User(row).toJSON())
    const total = parseInt(result.rows[0].total, 10)
    return { data: items, total }
  }

    async update({
    id,
    data,
  }: {
    id: string;
    data: UpdateUserInput
  }): Promise<UserResponse> {
    const values: (string)[] = [];
    const fields: string[] = [];
    let counter = 1;

    const fieldMapping: Record<string, string> = {
      username: "username",
      nomeCompleto: "nome_completo",
      email: "email",
      roleId: "role_id",
      ativo: "ativo",
    };

    for(const [key, value] of Object.entries(data)){
      if(value !== undefined && fieldMapping[key]){
        fields.push(`${fieldMapping[key]} = $${counter}`)
        values.push(value)
        counter++
      }
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = $${counter} RETURNING *`;

    const result = await this.db.query(query, values);
    if(result.rowCount === 0){
      throw new Error("Nenhuma linha atualizada")
    }
    return new User(result.rows[0]).toJSON();
  }

  async delete(id: string): Promise<boolean>{
    const result = await this.db.query("DELETE FROM users WHERE id = $1", [id])
    return (result.rowCount ?? 0) > 0
  }
}
