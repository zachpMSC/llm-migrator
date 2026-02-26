import { logger } from "./lib/logger";
import { testDir, watchDirectory } from "./lib/directoryWatcher";
import {
  handleDirectoryAddFileEvent,
  handleDirectoryRemoveFileEvent,
  handleDirectoryUpdateFileEvent,
} from "./lib/directoryEventHandlers";
import { ollama } from "./lib/ollama";
import { db } from "./lib/db";

/* PROJECT PROCEDURE BREAKDOWN
  1. Watch a directory for file changes (add, update, remove)
  2. When a file is added, updated, or removed, trigger the corresponding event handler inside /lib/directoryEventHandlers.ts 
  3. Each event handler will use the createChunkerModule (/lib/createChunkerModule.ts) factory function to create an appropriate chunker for the file type
*/

let queue = Promise.resolve(); // Initialize a promise queue to serialize file events

async function main() {
  try {
    /* 
    Ensure Ollama is running and the embedding model is available. 
    If not run 'ollama pull nomic-embed-text' to get the model. 
  */
    await ollama.initialize();
    await db.testConnection();

    watchDirectory({
      path: testDir,
      cb: (event, path) => {
        switch (event) {
          case "add": // new file added
            queue = queue.then(() =>
              handleDirectoryAddFileEvent({ event, path }),
            );
            break;
          case "change": // existing file changed
            queue = queue.then(() =>
              handleDirectoryUpdateFileEvent({ event, path }),
            );
            break;
          case "unlink": // file removed
            queue = queue.then(() =>
              handleDirectoryRemoveFileEvent({ event, path }),
            );
            break;
          default:
            logger.info(`Event: ${event}, Path: ${path}`);
        }
      },
    });
  } catch (error) {
    logger.error(`Error in main function: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
