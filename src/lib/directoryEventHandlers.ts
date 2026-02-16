import { EventName } from "chokidar/handler";
import { logger } from "./logger";
import { getFileFromPath } from "./utils";
import { createChunkerModule } from "./createChunkerModule";

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
  if (event !== "add") {
    logger.warn(`Received unexpected event type: ${event} for path: ${path}`);
    return;
  }
  const file = getFileFromPath(path);
  const chunkerModule = await createChunkerModule(file);
  if (!chunkerModule) return;
  await chunkerModule.chunkDocument();
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
  const chunkerModule = await createChunkerModule(file);
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
