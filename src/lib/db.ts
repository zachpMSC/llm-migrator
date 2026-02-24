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
        .catch((err) => {
          console.error("❌ Connection error:", err);
          process.exit(0);
        })
        .finally(() => {
          client.end();
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

  async function checkIfFileHasBeenChunked(path: string) {
    try {
      const res = await pool.query(
        `SELECT id FROM chunked_files WHERE path = $1`,
        [path],
      );
      return res.rows.length > 0; // Returns true if the file has been chunked, false otherwise
    } catch (err) {
      console.error("❌ Error checking if file has been chunked:", err);
      return false;
    }
  }

  return { testConnection, queryCarTable, checkIfFileHasBeenChunked };
}

export const db = createDbClient();
