import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD type:", typeof process.env.DB_PASSWORD);

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Kết nối PostgreSQL thành công:", result.rows[0].now);
  } catch (error) {
    console.error("Kết nối PostgreSQL thất bại:", error.message);
  }
}
