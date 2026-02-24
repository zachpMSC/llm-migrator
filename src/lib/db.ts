import { Client } from "pg";
import { Pool } from "pg";

const client = new Client({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "password",
  database: "test",
});

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "password",
  database: "test",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxLifetimeSeconds: 60,
});

export function createDbClient() {
  async function testConnection() {
    try {
      await client
        .connect()
        .then(() =>
          console.log("🐘 Connected to postgres database successfully!"),
        )
        .catch((err) => console.error("❌ Connection error:", err))
        .finally(() => {
          client.end();
          process.exit(0);
        });
    } catch (err) {
      console.error("❌ Failed to connect to the database:", err);
    }
  }

  async function queryCarTable() {
    try {
      const res = await pool.query("SELECT * FROM car");
      console.log(res.rows);
    } catch (err) {
      console.error("❌ Error querying car table:", err);
    }
  }

  return { testConnection, queryCarTable };
}

export const db = createDbClient();
