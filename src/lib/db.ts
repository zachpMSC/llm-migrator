import { Pool } from "pg";
import { Chunk } from "../types";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "password",
  database: "postgres",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxLifetimeSeconds: 60,
});

export function createDbModule() {
  async function testConnection() {
    try {
      const client = await pool.connect();
      console.log("🐘 Connected to postgres database successfully!");
      client.release();
    } catch (err) {
      console.error("❌ Failed to connect to the database:", err);
      process.exit(1);
    }
  }

  async function checkIfFileHasBeenChunked(path: string): Promise<boolean> {
    try {
      const res = await pool.query(
        `SELECT id FROM chunked_files WHERE path = $1`,
        [path],
      );
      return res.rows.length > 0;
    } catch (err) {
      console.error("❌ Error checking if file has been chunked:", err);
      return false;
    }
  }

  async function insertChunkedFile(
    name: string,
    path: string,
  ): Promise<number> {
    const res = await pool.query(
      `INSERT INTO chunked_files (name, path) VALUES ($1, $2) RETURNING id`,
      [name, path],
    );
    return res.rows[0].id;
  }

  async function insertChunks(
    chunks: Chunk[],
    fileId: number,
    embeddings: number[][],
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        if (!embedding) {
          throw new Error(`Missing embedding for chunk at index ${i}`);
        }
        if (!chunk) {
          throw new Error(`Missing chunk at index ${i}`);
        }
        await client.query(
          `INSERT INTO chunks 
            (id, file_id, text, document_title, document_number, revision, effective_date, chunk_index, word_count, content_type, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            chunk.id,
            fileId,
            chunk.text,
            chunk.documentTitle,
            chunk.documentNumber,
            chunk.revision,
            chunk.effectiveDate,
            chunk.chunkIndex,
            chunk.wordCount,
            chunk.contentType,
            `[${embedding.join(",")}]`,
          ],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  return {
    testConnection,
    checkIfFileHasBeenChunked,
    insertChunkedFile,
    insertChunks,
  };
}

export const db = createDbModule();
