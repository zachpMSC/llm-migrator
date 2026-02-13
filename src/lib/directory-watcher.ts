import chokidar, { FSWatcher } from "chokidar";
import { EventName } from "chokidar/handler";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

/** * Watch a directory for changes and execute a callback on events.
 *
 * @param {Object} options - The options for watching the directory.
 * @param {string} options.path - The path of the directory to watch.
 * @param {function} options.cb - The callback function to execute on events.
 * @return {FSWatcher} The chokidar FSWatcher instance.
 * @throws Will throw an error if the directory does not exist or is not a directory.
 * @see {@link https://www.npmjs.com/package/chokidar}
 * @example
 * watchDirectory({
 *  path: testDir,
 *   cb: (event, path) => {
 *    console.log(`Event: ${event}, Path: ${path}`);
 * });
 *
 */
export function watchDirectory({
  path: dirPath,
  cb,
}: {
  path: string;
  cb: (event: EventName, path: string) => void;
}): FSWatcher {
  console.log(chalk.blue(`Watching directory: ${dirPath}`));

  // Resolve to absolute path (safer + predictable)
  const resolvedPath = path.resolve(dirPath);

  // Check existence
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Directory does not exist: ${resolvedPath}`);
  }

  // Ensure it's actually a directory
  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPath}`);
  }

  // Create watcher
  const watcher = chokidar.watch(resolvedPath).on("all", cb);

  return watcher;
}

// For testing purposes, we can export a test directory path
export const testDir = "__tests__/watched-dir";

// For production usage, we can export a default directory path
export const productionDir = "watched-dir";
