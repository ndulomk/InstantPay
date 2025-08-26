import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv'

dotenv.config();

interface DatabaseConfig {
  user?: string;
  host?: string;
  password?: string;
  database?: string;
  port?: number;
  ssl?: boolean;
}

const poolConfig: DatabaseConfig = ({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
  ssl: false
});

const pool = new Pool(poolConfig);

pool.on('connect', ()=> {
  console.log('Connected to PostgreSQL database')
})

pool.on('error', (err: Error)=>{
  console.log('Error connecting to the database', err);
  process.exit(-1);
})

pool.query('SELECT NOW()', (err: Error, res:QueryResult)=> {
  if(err){
    console.error('Error executing query', err);
  } else {
    console.log("Inital connection test succeded", res.rows[0])
  }
})

interface Database {
  query: (text: string, params?: any[]) => Promise<QueryResult>;
  pool: Pool;
}

const db: Database = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  pool
}

export default db;