import { logger } from "./lib/logger";
import { testDir, watchDirectory } from "./lib/directory-watcher";
import {
  handleDirectoryAddFileEvent,
  handleDirectoryRemoveFileEvent,
  handleDirectoryUpdateFileEvent,
} from "./lib/directory-event-handlers";

/* PROJECT PROCEDURE BREAKDOWN
  1. Watch a directory for file changes (add, update, remove)
  2. When a file is added, updated, or removed, trigger the corresponding event handler inside /lib/directory-event-handlers.ts 
  3. Each event handler will use the createChunkerModule (/lib/create-chunker-module.ts) factory function to create an appropriate chunker for the file type
*/

function main() {
  watchDirectory({
    path: testDir,
    cb: (event, path) => {
      switch (event) {
        case "add": // new file added
          handleDirectoryAddFileEvent({ event, path });
          break;
        case "change": // existing file changed
          handleDirectoryUpdateFileEvent({ event, path });
          break;
        case "unlink": // file removed
          handleDirectoryRemoveFileEvent({ event, path });
          break;
        default:
          logger.info(`Event: ${event}, Path: ${path}`);
      }
    },
  });
}

main();
