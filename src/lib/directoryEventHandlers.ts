import { EventName } from "chokidar/handler";
import { logger } from "./logger";
import { getFileFromPath } from "./utils";
import { createChunkerModule } from "./createChunkerModule";
import { ollama } from "./ollama";
import chalk from "chalk";
import ora from "ora";
import { db } from "./db";

/**
 * @file Event handlers for directory watcher events.
 * Each handler processes a specific file system event (add, change, unlink).
 * These handlers are imported in the main file (src/index.ts) to keep event logic organized and modular.
 */

/**
 * Handles the event when a new file is added to the watched directory.
 *
 * @param {Object} params - The event parameters.
 * @param {EventName} params.event - The type of file system event.
 * @param {string} params.path - The absolute path of the added file.
 * @returns {void}
 *
 * @example
 * handleDirectoryAddFileEvent({ event: 'add', path: '/path/to/file.txt' });
 */
export async function handleDirectoryAddFileEvent({
  event,
  path,
}: {
  event: EventName;
  path: string;
}) {
  try {
    if (event !== "add") {
      logger.warn(`Received unexpected event type: ${event} for path: ${path}`);
      return;
    }
    const file = getFileFromPath(path);

    const chunkerModule = await createChunkerModule(file, path);
    if (!chunkerModule) return;

    console.log(`📁 New file added: ${file.name} at path: ${path}`);
    const spinner = ora(`Chunking ${file.name}...`).start();

    const chunks = await chunkerModule.chunkDocument();

    spinner.text = `Creating embeddings for ${chunks.length} chunks...`;

    const chunksWithEmbeddings = await Promise.all(
      chunks.map(async (chunk) => ({
        ...chunk,
        embedding: await ollama.createEmbedding(chunk.text),
      })),
    );
    if (chunksWithEmbeddings.length === 0) {
      spinner.warn(
        chalk.yellow(
          `No chunks created for file: ${file.name}. Skipping embedding creation.`,
        ),
      );
      return;
    }

    const fileId = await db.insertChunkedFile(file.name, path);
    await db.insertChunks(
      chunks,
      fileId,
      chunksWithEmbeddings.map((c) => c.embedding),
    );

    spinner.succeed(
      ` Processed ${file.name} — ${chunksWithEmbeddings.length} chunks and embeddings and saved to database..`,
    );

    // Here you would typically insert the chunks and embeddings into your database
  } catch (error) {
    logger.error(
      `Error processing file at path: ${path} with event: ${event}. Error: ${error}`,
    );
  }
}

/**
 * Handles the event when an existing file in the watched directory is modified.
 *
 * @param {Object} params - The event parameters.
 * @param {EventName} params.event - The type of file system event.
 * @param {string} params.path - The absolute path of the modified file.
 * @returns {void}
 *
 * @example
 * handleDirectoryUpdateFileEvent({ event: 'change', path: '/path/to/file.txt' });
 */
export async function handleDirectoryUpdateFileEvent({
  event,
  path,
}: {
  event: EventName;
  path: string;
}) {
  if (event !== "change") {
    logger.warn(`Received unexpected event type: ${event} for path: ${path}`);
    return;
  }
  const file = getFileFromPath(path);
  const chunkerModule = await createChunkerModule(file, path);
  if (!chunkerModule) return;
}

/**
 * Handles the event when a file is removed from the watched directory.
 *
 * @param {Object} params - The event parameters.
 * @param {EventName} params.event - The type of file system event.
 * @param {string} params.path - The absolute path of the removed file.
 * @returns {void}
 *
 * @example
 * handleDirectoryRemoveFileEvent({ event: 'unlink', path: '/path/to/file.txt' });
 */
export function handleDirectoryRemoveFileEvent({
  event,
  path,
}: {
  event: EventName;
  path: string;
}) {
  if (event !== "unlink") {
    logger.warn(`Received unexpected event type: ${event} for path: ${path}`);
    return;
  }
  logger.info(`File removed: ${path} with event: ${event}`);
}
