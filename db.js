import pg from "pg";

const { Pool } = pg;

const pool = globalThis.__sivaInvoicePool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  max: 3,
});

if (process.env.NODE_ENV !== "production") globalThis.__sivaInvoicePool = pool;

export default pool;
