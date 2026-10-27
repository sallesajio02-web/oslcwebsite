import "dotenv/config";
import pg from "pg";
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: true }
      : undefined,
  max: Number(process.env.DB_POOL_MAX || 10),
  connectionTimeoutMillis: 5000,
});
pool.on("error", () => console.error("PostgreSQL connection interrupted"));
export const query = (sql: string, params: unknown[] = []) =>
  pool.query(sql, params);
